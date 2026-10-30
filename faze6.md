# Fáze 6: sprite efekty nad 3D scénou

Fáze 6 je implementovaná. Používá vybrané obrázky ze složky
`Remastered Tyrian Graphics` pro exploze, zásahové záblesky a projektily.
Lodě, boss, věže i konstrukce zůstávají skutečnými 3D modely.

## 1. Co se změnilo ve hře

- Zničení nepřítele nebo věže zobrazí třináctisnímkovou explozi.
- Zásah, který cíl přežije, má krátký vlastní záblesk v místě kontaktu.
- Střela zastavená štítem bosse nebo ochranou hráče vytvoří modrý efekt.
- Hráč střílí úzký modrý projektil s jasným středem.
- Nepřátelské střely jsou oranžové koule se dvěma střídajícími se snímky.
- Zničení bosse používá postupně několik sprite explozí.
- Poslední zásah hráče zobrazí explozi, která doběhne za výsledkovým panelem.

Rychlosti, kadence, kolize, životy a odměny zůstávají podle předchozích fází.
Větší obrázek exploze ani obrys projektilu nevytvářejí další kolizní plochu.

## 2. Příprava obrázků

Zdrojové PNG nemají průhledný alfa kanál. Jejich pozadí má přesnou barvu
RGB `(191, 220, 191)`. Při přípravě atlasu odstraníme pouze tuto barvu.
Černé obrysy ani jiné zelené odstíny nemažeme. Průhledným pixelům nastavíme
nulové RGB, aby okolo obrázků nevznikal zelený lem.

Zdrojové soubory se neupravují. Nástroj vybere obdélníky 12 × 14 pixelů
a vloží je doprostřed buněk 16 × 16 v novém atlasu. Stejný rozměr buněk
udržuje polohu efektu během animace: jednotlivé fáze neposkakují podle
měnícího se rozměru neprůhledného obsahu.

Vzniklý `src/assets/tyrian-fx.png` má 256 × 32 pixelů, obsahuje 26 snímků
a je součástí projektu. Pro běžné spuštění ani build není potřeba FFmpeg.

Pro opětovnou přípravu atlasu ze zdrojů:

```sh
npm run assets:prepare
```

Tento volitelný příkaz potřebuje lokálně dostupný FFmpeg a Node.js
s podporou TypeScriptu, stejně jako testy projektu. Žádná nová npm knihovna
nebyla přidaná. Nástroj odmítne výřez mimo obrázek i prázdný snímek.

## 3. Jaké výřezy používáme

Řádky a sloupce jsou indexované od nuly. Každá zdrojová buňka má 12 × 14 pixelů.
Všechny souřadnice jsou uvedené i přímo v `src/sprite-clips.ts`.

| Klip | Zdroj | Řádek; sloupce | Přehrávání |
| --- | --- | --- | --- |
| Exploze | `newsh6.shp.000000.png` | 6; 6 až 18 | 13 snímků při 30 FPS, přibližně 0,43 s |
| Zásah | `newsh6.shp.000000.png` | 5; 6 až 10 | 5 snímků při 35 FPS, přibližně 0,14 s |
| Hráčova střela | `newsh(.shp.000000.png` | 13; 17 | Jeden snímek, orientace podle směru letu |
| Nepřátelská střela | `newsh(.shp.000000.png` | 8; 15 a 16 | Smyčka při 10 FPS |
| Štít | `newsh(.shp.000000.png` | 11; 15, 16, 17, 16, 15 | 5 snímků při 30 FPS |

Explozivní sekvence je záměrně vybraná z řady kompletních malých snímků.
Některé větší obrázky na stejném sheetu jsou rozdělené na části; prosté
procházení celé řady by tam nevytvořilo správnou animaci.

## 4. Jak se 2D obrázek vykreslí v Three.js

Každý efekt je `Mesh` s obdélníkovou plochou složenou ze dvou trojúhelníků.
Plocha leží v XY a její přední strana míří ke kameře na kladné ose Z.
Protože kamera má pořád pevný pohled, nepotřebujeme ji za každým snímkem
natáčet ke kameře. Projektil se pouze otočí v XY podle rychlosti.

Textura je společná pro všechny efekty. **UV souřadnice** říkají, jakou
část atlasu má plocha zobrazit. Pro každý snímek předem vytvoříme malou
sdílenou geometrii se správnými UV; animace pak mění jen odkaz na geometrii.
Textury se při přehrávání nestříhají ani znovu nenahrávají na GPU.

Obrázky používají:

- `NearestFilter`, aby zvětšování nerozmazávalo pixelovou kresbu.
- Vypnuté mipmapy, aby při zmenšení neprosakovaly sousední snímky.
- Alfa průhlednost pro odstraněné pozadí.
- `MeshBasicMaterial`, protože světlo je už nakreslené v původním spritu.
- Barevný prostor sRGB a vypnutý tone mapping pro zachování barev atlasu.

Hráčova střela je vodorovně zúžená, aby byla čitelným paprskem. Její
poloměr pro zásahy se dál bere z `Bullet.radius`, ne z velikosti meshe.

## 5. Pořadí vrstev

Efekty nemají zakrývat nebezpečné střely. Proto v této arkádové scéně
nepoužívají hloubkový test a mají explicitní pořadí vykreslení:

```text
3D modely a terén → efekty (10) → projektily (20) → kolizní kruhy (30) → HTML
```

Sprite materiál nezapisuje do hloubkového bufferu. Exploze tedy neovlivní
viditelnost později kreslených projektilů. Toto je záměrné pravidlo čitelnosti,
nikoli fyzikálně přesné zakrývání předmětů ve 3D.

## 6. Čas a události zásahů

Efekt má typ, stáří, měřítko a pozici. Herní krok zvyšuje jeho stáří o `dt`.
Aktuální snímek se určí podle:

```ts
frame = Math.floor(age * fps);
```

Jednorázový efekt po posledním snímku zmizí. Smyčka použije zbytek po dělení
počtem snímků. Pokud tedy monitor vykresluje jinou frekvencí než 30 FPS,
exploze přesto trvá stejnou dobu; některé její snímky se zopakují nebo přeskočí.

Pauza nezvyšuje herní čas ani stáří efektů. Smyčky projektilů používají
herní čas, takže se také zastaví. Restart odstraní efekty i staré modely.

Oproti starším fázím je nově dovoleno **doběhnutí již vytvořených efektů po
výsledku hry**. Pohyb, vstup, vznik střel, skóre a terén se už neaktualizují.
Výjimka se týká pouze stáří a odstranění efektů, aby poslední exploze hráče
nezůstala trvale zastavená na prvním snímku.

Zásahový záblesk používá čas kontaktu vrácený `sweepHit()`, nikoli novou
pozici rychlé střely za cílem. Obrázek se tak objeví tam, kde zásah nastal.

## 7. Načítání a úklid

Scéna nejprve načte atlas a teprve potom se spustí hra. Při chybě načítání
se zobrazí zpráva místo neviditelných projektilů. Atlas je importovaný jako
Vite asset; není závislý na cestě ke zdrojové složce v produkci.

Všechny sprite modely sdílejí materiál, texturu a geometrie snímků.
Odstranění jedné střely tyto prostředky neuvolňuje, protože je používají
ostatní objekty. Při ukončení scény nebo HMR se odpojí modely a společné
prostředky se uvolní jednou.

## 8. Soubory a kontrola

- `src/sprite-clips.ts`: výřezy, parametry animací, výpočet snímku a UV.
- `src/sprite-effects.ts`: textura, sdílené geometrie, materiál a vykreslení.
- `src/game.ts`: události exploze, zásahu a štítu; čas a zánik efektů.
- `src/scene.ts`: propojení herních dat s modely a vrstvami.
- `scripts/prepare-sprites.ts`: obnovení atlasu z originálních sheetů.
- `scripts/sprite-pixels.ts`: přesné klíčování barvy a výřezy pixelů.
- `tests/sprites.test.ts`: alfa kanál, výřezy, UV, časování, vznik a úklid efektů.

Ověření:

```sh
npm test
npm run build
```

Ve hře vyzkoušej zásahy střelců a věží, štít při příletu bosse, jeho zničení,
pauzu během střelby a přepínání terénu. Projektily musí zůstat viditelné
nad explozemi i na obou pozadích. Žádný sprite nemá mít zelený obdélník
nebo kousek sousedního obrázku.

Další krok může využít stejnou infrastrukturu pro animované plameny motorů
nebo bonusy. Převod lodí a terénu na sprite grafiku tato fáze nedělá.
