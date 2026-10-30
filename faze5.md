# Fáze 5: závěrečný boss a čitelné útoky

Doporučuji zakončit první úroveň soubojem s velkou nepřátelskou lodí.
Současné vlny a pozemní věže zůstanou úvodem; boss prověří míření,
uhýbání a rozpoznávání přípravy útoku.

Fáze 5 je implementovaná. Níže je popis návrhu; skutečné rozdělení kódu
a ověření jsou doplněné na konci dokumentu.

## 1. Co fáze přinese

- Jednoho bosse s ukazatelem životů a dvěma bojovými fázemi.
- Dva předvídatelné útoky: mířenou salvu a vějíř střel.
- Viditelnou přípravu a přestávky mezi útoky.
- Přílet, souboj, zničení a nové podmínky vítězství.
- Oddělení transformací částí 3D modelu od kolizních tvarů v XY.

Zbraně hráče, životy, nezranitelnost a ovládání zůstanou stejné.
Bonusy, zvuk a další úrovně odložíme, aby šel souboj samostatně vyladit.

## 2. Přechod z vln k bossovi

Nynější konec úrovně vyhodnocuje čas alespoň 55 s a nepřítomnost zbývajících
hrozeb. Tato podmínka nově zahájí varování před bossem místo vítězství.

```text
vlny → dořešení nepřátel a střel → varování → přílet → souboj → zničení → vítězství
```

Varování potrvá například 1,5 s herního času. Hráč se může pohybovat,
ale nevznikají další běžní nepřátelé ani věže. Při varování, příletu a boji
se terén posouvá dál. Dekorace tak zůstává řízená stejnou vzdáleností letu.

Boss přiletí z `y = 15` do `y = 7`. Během příletu nestřílí, nepřijímá
poškození a nepoškozuje hráče kontaktem. Jeho ochranu ukáže obrys štítu.
Hráčovy střely se při dotyku štítu spotřebují, takže nepůjde nashromáždit
střely uvnitř modelu před začátkem boje.

Na začátku souboje štít zmizí a zobrazí se ukazatel životů.
Varování i přílet se mohou provést právě jednou za jednu hru.

## 3. Herní stav a odpovědnosti

Globální stav ponecháme `playing | paused | gameOver | victory`.
Průběh mise bude samostatné pole, například:

```ts
type MissionStage = 'waves' | 'warning' | 'boss' | 'bossDestroyed';

type BossState = {
  id: number;
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  hp: number;
  maxHp: number;
  phase: 1 | 2;
  mode: 'entering' | 'charging' | 'firing' | 'resting' | 'destroyed';
  attack: 'aimed' | 'fan';
  timer: number;
  // Dále stav aktuální salvy a její uložený směr.
};
```

To je návrh tvaru dat, nikoli hotová implementace.
Časovače, přechody a rychlosti střel patří do herní logiky.
Model pouze zobrazuje aktuální polohu, natočení děl a jejich nabíjení.

Doporučuji `src/boss.ts` pro pravidla a `src/boss-model.ts` pro 3D model.
Přehled útoků a počáteční parametry mohou být neměnná data v `src/level.ts`.
`src/game.ts` propojí souboj s existujícími střelami, poškozením a výsledkem.
Nezavádíme druhou animační smyčku ani další renderer.

## 4. Model a kolize velké lodi

Model bude široký přibližně 5 jednotek: centrální trup, dvě boční gondoly,
kabina a dvě hlavně. Použijeme jednoduché zkosené objemy a sdílené materiály,
aby navázal na dosavadní grafiku bez externích assetů.

Pro široký model je jeden kruh nepřesný. Boss proto dostane například tři
kolizní kruhy s místními posuny: jeden pro trup a dva pro gondoly.
Všechny sdílejí jednu zásobu životů. Zobrazí je existující přepínač hitboxů.

Kruh modelu se převede do XY přičtením místního posunu k poloze bosse.
Boss pro první verzi nemění herní natočení; náklon, pulzování nebo zpětný
ráz jeho částí jsou pouze vizuální. Kolizní kruhy se tedy neodvozují
z transformací animovaných meshů.

Pro každou střelu najdeme nejčasnější zásah přes všechny kruhy, pomocí
stávajícího `sweepHit()`. Jedna střela smí ubrat nejvýše jeden život,
i pokud protne dva překrývající se kruhy.
Náraz hráče do kteréhokoli kruhu odebere život podle současných pravidel
a ochrany; boss se nárazem neodstraní ani neztratí život.

## 5. Útoky, kterým lze porozumět

Počáteční návrh parametrů:

| Parametr | Fáze 1 | Fáze 2 |
| --- | --- | --- |
| Životy při začátku souboje | 60 celkem | Přechod při 30 nebo méně |
| Příprava útoku | 0,8 s | 0,6 s |
| Přestávka po útoku | 1,2 s | 0,9 s |
| Rychlost střel | 5 jednotek/s | 6 jednotek/s |
| Body za zničení | 2 000 jednorázově | Stejná odměna |

Hodnoty jsou k ladění hraním. Druhá fáze nemění životy zpět na 30;
i při větším poškození se pouze jednou přepne režim.

### Mířená salva

Při přípravě svítí jedna hlaveň. Na začátku výstřelu si boss uloží směr
k aktuální poloze hráče a vypustí tři střely s odstupem 0,18 s.
Všechny míří stejným uloženým směrem; ústí pro každý výstřel odpovídá
aktuální poloze hlavně. Po prvním výstřelu tedy hráč může směru uhnout.
Použijeme stejnou normalizaci vektoru a ochranu proti nulové vzdálenosti
jako u stávajících střelců.

### Vějíř

Obě boční hlavně signalizují přípravu. Ze středu přední části lodi vyletí
pět střel rozložených kolem směru dolů, například s úhly
−40°, −20°, 0°, +20° a +40°. Úhly budeme měřit od osy −Y.

```ts
vx = Math.sin(angle) * speed;
vy = -Math.cos(angle) * speed;
```

Mezi střelami zůstanou mezery. Ve druhé fázi nejprve zrychlíme přípravu
a projektily podle tabulky; počet střel ponecháme stejný.
Tak půjde obtížnost měnit postupně a dohledat, která změna ji ovlivnila.

Útoky se střídají pevně, bez náhody. Během přípravy a střelby boss stojí.
V přestávce se pomalu přesune mezi `x = -3`, `0` a `3`; pohyb se počítá
z herního času a zastaví se při pauze. Dráha i celý model musí zůstat v záběru.

## 6. Přechod do druhé fáze

Při dosažení poloviny životů dokončí boss právě probíhající útok se starými
parametry. Potom spustí jednorázový přechod: 0,8 s bez střelby, výrazné
rozsvícení motorů a text „Fáze 2“. Během přechodu zůstává zranitelný.
Následující útok už používá rychlejší parametry.

Dosavadní střely se nemažou ani nezrychlují. Jejich uložená rychlost
zůstává stejná. Časování právě probíhající salvy také nesmí skokově změnit
přechod fáze. Stav útoku proto potřebuje uložit parametry při jeho začátku.

## 7. Zničení a výsledek

Při nule životů se boss označí jako zničený. Už ve stejném kroku
nesmí vystřelit plánovanou střelu ani poškodit hráče kontaktem.
Body se přičtou jednou a boss zmizí ze seznamu kolizních cílů.

Souboj ukončíme jasným pravidlem: po zničení bosse se odstraní nepřátelské
střely a spustí se přibližně sekundová sekvence několika záblesků na různých
částech lodi. Hráč se během ní nemůže poškodit. Potom nastane `victory`.
Úklid střel je úmyslná odměna za dokončení souboje a změna oproti běžným
nepřátelům, jejichž střely po zničení dál letí.

Pokud už hráč nemá životy před vyhodnocením zničení bosse, přednost má
`gameOver`. U zásahů ve stejném kroku zachováme dosavadní pořadí:
hráčovy střely nejprve vyřeší cíle, teprve potom přichází poškození hráče.
Zničení bosse tak v tomto kroku vyčistí hrozby před poškozením hráče.
Toto pravidlo musí být výslovně pokryté testem.

Restart obnoví vlny od začátku, vzdálenost letu, věže, body a životy.
Vyčistí bosse, jeho časovače, uložený směr salvy i efekty přechodu a zničení.

## 8. Rozhraní pro hráče a pro ladění

Ukazatel postupu přejde po vlnách na „Varování“ a potom „Boss“.
Životy bosse zobrazí samostatný pruh s číselnou hodnotou; nebudou odvozené
od času od začátku úrovně. Po vítězství ukážeme běžný výsledkový panel.

Přidáme vývojový příkaz pro přímé spuštění souboje, například
`npm run dev -- --mode boss`, jehož režim aplikace načte z konfigurace Vite.
Připraví stejný čistý stav varování jako přirozený průchod úrovní, se třemi
životy a nulovým skóre. Má sloužit pouze při vývoji; produkční sestavení
vždy začíná vlnami. Díky tomu lze útoky ladit bez opakovaného minutového letu.

Přepínač terénu zůstává čistě vizuální. Kolizní kruhy musí ukazovat všechny
části bosse, aby šlo posoudit zásahy i při zakrytí části modelu efektem.

## 9. Pořadí implementace a ověření

1. Oddělit dokončení vln od konečného vítězství a přidat stav mise.
2. Přidat model bosse, přílet a více kolizních kruhů se společnými životy.
3. Doplnit mířenou salvu, vějíř a jejich signalizaci.
4. Přidat přestávky s pohybem a jednorázový přechod fáze.
5. Implementovat zničení, odměnu, úklid střel a výsledek.
6. Propojit ukazatele a vývojové spuštění souboje; vyladit celou úroveň.

Automatické testy mají ověřit:

- Boss se objeví právě jednou a až po dořešení vln, věží a jejich střel.
- Přílet chrání obě strany před kontaktním poškozením a spotřebovává střely ve štítu.
- Jedna střela neublíží vícekrát při překryvu kolizních kruhů.
- Salva drží směr, rozestupy a počet střel; vějíř je souměrný a má správné rychlosti.
- Pauza zastaví přílet, útoky, pohyb, přechody i sekvenci zničení.
- Druhá fáze nastane jednou a nepřeruší probíhající útok.
- Zničený boss nestřílí, přidá body jednou a vyčistí hrozby ve stanoveném pořadí.
- Prohra i vítězství umožní úplný restart bez zbytku stavu souboje.
- Produkční začátek a vývojový vstup do souboje respektují své nastavení.

V prohlížeči ověříme čitelnost přípravy, mezery ve vějíři, viditelnost střel
nad modelem a terénem a možnost souboj projít bez ztráty životů.
Fáze je hotová, až je úroveň od začátku do vítězství hratelná, nové i dosavadní
testy projdou a `npm run build` vytvoří funkční produkční sestavení.


## 10. Hotová implementace a spuštění

- `src/boss.ts` obsahuje stavový automat, neměnné místní kolizní kruhy,
  mířenou salvu, vějíř, přestávky s pohybem a přechod fáze.
- `src/boss-model.ts` skládá trup, gondoly, děla, štít a světla z jednoduchých
  objemů. Náklon částí modelu nemění herní kolizní kruhy.
- `src/game.ts` propojuje bosse s průběhem mise a kolizemi. Při překryvu
  více kruhů vybírá jediný nejčasnější zásah jedné střely.
- `src/main.ts` zobrazuje varování, aktuální fázi a samostatný pruh životů.
- `src/start-mode.ts` dovoluje přeskočit vlny pouze při vývoji v režimu `boss`.
- `tests/boss.test.ts` pokrývá útoky, ochranu při příletu, kolize, přechody,
  pozastavení, zničení, restart i propojení celé mise až do vítězství.

Běžné spuštění:

```sh
npm run dev
```

Spuštění přímo před bossem:

```sh
npm run dev -- --mode boss
```

Ve vývojovém režimu se začne čistým varováním, potom příletem. Enter po
výsledku vždy restartuje celou úroveň od vln. Pro opakované ladění pouze
bosse obnov stránku ve vývojovém režimu. Produkční build režim přeskočení
nepoužije ani při sestavení přes `--mode boss`.

Boss má 60 životů; druhá fáze se přepne jednou při 30 nebo méně životech,
až po dokončení útoku a jeho přestávky. Následuje 0,8 s signalizace a první
rychlejší příprava. Předchozí střely se nemění.
Po zničení se přičte 2 000 bodů, vyčistí se nepřátelské střely a po sekundě
záblesků a zmenšování modelu nastane vítězství.

Automatický průchod celé mise v testu používá trvalou ochranu pouze jako
testovací pomůcku. Běžný hráč ji nemá; obtížnost a čitelnost útoků je nutné
posoudit hraním. Efekty zatím nemají zvuk ani externí obrazové assety.
