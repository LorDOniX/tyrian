# Fáze 7: sbíratelné bonusy a dočasná trojstřela

Fáze 7 je implementovaná. Vybraní nepřátelé po sestřelení upustí bonus.
Hráč se pro něj musí přesunout a proletět jím; pouhé vystřelení na předmět
ho nesebere. Vylepšení přináší rozhodování, jestli riskovat pohyb pro odměnu.

## 1. Dva druhy bonusů

| Bonus | Vzhled | Účinek |
| --- | --- | --- |
| Trojstřela | Oranžový krystal se třemi bílými paprsky | Po dobu 12 sekund střílí jedna salva tři projektily. |
| Oprava | Zelený předmět s bílým křížem | Přidá jeden život, nejvýše do tří. Při plných životech přidá 150 bodů. |

Trojstřela nemění kadenci: mezi salvami zůstává 0,14 s. Střední projektil
letí rovně, boční pod úhlem ±12°. Všechny mají rychlost 22 jednotek/s a běžné
poškození jednoho zásahu. Po vypršení se vrátí jeden paprsek automaticky.

Další krystal obnoví čas na 12 sekund; čas ani počet paprsků se nesčítají.
Zásah hráče vylepšení neodebere. Pozastavení časovač zastaví.
V HUD je stav zbraně, zbývající čas a krátká zpráva o sebrané odměně.

## 2. Odkud předměty padají

Nejde o náhodný drop. Pět nosičů je součástí neměnných dat úrovně:

| Vznik nosiče | Pozice X | Odměna |
| --- | --- | --- |
| 1 s | 0 | Trojstřela |
| 8 s | −2 | Oprava |
| 23 s | −5 | Trojstřela |
| 36 s | 0 | Oprava |
| 50 s | 0 | Trojstřela |

Tyto časy určují vznik nepřátelské lodi, nikoli sebrání bonusu. Nositel má
barevný kruh: oranžový pro zbraň, zelený pro opravu.

Odměna se vytvoří až po posledním zásahu hráčovou střelou. Náraz do hráče
ani odlet ze záběru ji nevytvoří. Když tentýž cíl protne několik střel
v jednom kroku, vznikne jen jeden předmět a body za nepřítele se přičtou jednou.
Věže a boss v této fázi bonusy neupouštějí.

## 3. Pohyb a sbírání v rovině XY

Předmět má vlastní ID, typ, kruhový hitbox o poloměru 0,55 a aktuální i
předchozí polohu. Po objevení pomalu klesá rychlostí 2,5 jednotky/s.
Není připevněný k zemi, takže nemusí jet rychlostí terénu.

Sbírání používá existující `sweepHit()` mezi předmětem a hráčem.
Zahrnuje jejich relativní pohyb za celý krok, ne jen překryv na konci.
Rychle letící hráč tedy nemůže předmětem proskočit bez sebrání.

Předmět se při sebrání odstraní ze seznamu a objeví se krátký modrý záblesk.
Po odletu celého hitboxu pod dolní okraj zmizí bez účinku.
Kulky předměty neblokují a nezasahují je. Bonus není nepřítelem,
nezpůsobuje poškození a neblokuje přechod k bossovi.

## 4. Pořadí událostí má význam

Ve stávajícím herním kroku platí:

```text
pohyb hráče → posun a sbírání starších předmětů → střelba
            → zásahy nepřátel a případné nové dropy → poškození hráče
```

To znamená, že sebraná trojstřela může ovlivnit salvu ve stejném kroku.
Oprava se také použije před poškozením ve stejném kroku. Hráč s jedním
životem tak může sebrat opravu a následně přežít zásah s jedním životem.
Už ukončenou hru ale bonus neoživí: při nule životů nebo výsledkovém
stavu se sbírání neprovádí.

Nově upuštěný předmět se začne pohybovat a sbírat až v dalším kroku.
Tím je oddělené vytváření od aktualizace seznamu a každý drop se zpracuje
nejvýše jednou za snímek.

## 5. Úprava zbraně pomocí vektorů

`playerVolley()` vrací jednu nebo tři specifikace střel. Jejich rychlosti
vycházejí z úhlu od kladné osy Y:

```ts
vx = Math.sin(angle) * 22;
vy = Math.cos(angle) * 22;
```

Boční střely tak neletí rychleji než střední: mění se směr, ne velikost
vektoru. Drobné posunutí ústí v X odděluje jejich počáteční polohy.
Všechny nadále používají stejný 2D test zásahu. Jejich sprite se natočí
podle skutečného vektoru rychlosti, bez dalšího speciálního rendereru.

## 6. Grafika a vrstvy

Atlas z fáze 6 byl rozšířen z 26 na 32 snímků při zachování rozměru
256 × 32 pixelů. Přibyly tři snímky oranžového a tři zeleného předmětu ze
souboru `Remastered Tyrian Graphics/tyrian.shp.01673F.png`.
Použité buňky mají 12 × 14 pixelů: sloupce 12, 13, 14 v řádku 0 pro
krystal a v řádku 1 pro opravu. Indexování je od nuly.

Bílé symboly jsou malé sdílené plochy nad ikonou, aby rozlišení nezáviselo
jen na barvě. Jemné pulzování je vizuální: nemění poloměr sbírání.
Bonusy jsou nad běžnými efekty a pod střelami; zapnuté kolizní kruhy jsou
nad nimi. Skrytí dekorativního terénu jejich viditelnost ani účinek nemění.

## 7. Pauza, boss a restart

Při pauze stojí předměty, animace i zbývající čas trojstřely a oznámení.
Při návratu se pokračuje od stejného stavu. Zbývající bonusy mohou normálně
doputovat k hráči i během varování a souboje s bossem.

Při zničení bosse se zbývající předměty vyčistí. Po prohře zůstává herní
svět zastavený a nelze nic sebrat. Stejně jako ve fázi 6 mohou doběhnout
pouze už vytvořené efekty.

Restart obnoví tři životy, základní zbraň, nulové skóre a prázdný seznam
předmětů. Vyčistí také zprávu o posledním sebrání a všechny časovače.
Vývojový režim `--mode boss` začíná bez vylepšení, aby zůstal srovnatelný
s původním závěrečným soubojem.

## 8. Rozdělení kódu a ověření

- `src/bonuses.ts`: typy předmětů, limity životů, sbírání, časovače a směry salv.
- `src/level.ts`: určení nosičů v datech úrovně.
- `src/game.ts`: drop při zničení, napojení bonusů do pořadí kroku a střelby.
- `src/sprite-clips.ts`: nové výřezy pro animované odměny.
- `src/scene.ts`: ikony, symboly, kruhy nosičů a úklid modelů.
- `src/main.ts` a `index.html`: stav zbraně, odpočet a oznámení o sebrání.
- `tests/bonuses.test.ts`: drop, sbírání za pohybu, limity, časování a restart.

Kontrola: `npm test` a `npm run build`.
Atlas lze znovu připravit přes `npm run assets:prepare`; vyžaduje FFmpeg,
ale běžné spuštění ani sestavení ho nepotřebuje.

Pro první pokus zůstaň uprostřed a střílej. Střední loď první formace
upustí krystal; zachyť ho a sleduj trojstřelu a její odpočet. Opravu upustí
loď druhé formace na X = −2. Potom vyzkoušej pauzu s aktivním vylepšením
a restart po prohře. Veškeré ovládání zůstává stejné.
