# Fáze 4: let nad 3D terénem a pozemní cíle

Doporučuji navázat na první úroveň prostředím, které ukáže výhody 3D
vykreslování při 2D ovládání. Loď poletí nad průmyslovým povrchem:
pod ní ubíhají panely, vyvýšené konstrukce a pozemní věže.

Fáze 4 je implementovaná. Níže je vysvětlení návrhu; přehled výsledného
kódu a kontrol je na konci dokumentu.

## 1. Co se má hráč i autor naučit

Hráč stále používá stejné ovládání a stejnou herní plochu. Nově rozlišuje
vzdušné nepřátele a věže na zemi. Modely mají různou vizuální výšku,
zatímco pravidla zásahu zůstávají v XY.

Pro autora je hlavním tématem vztah mezi:

- polohou v celé úrovni a polohou v záběru kamery,
- hloubkou Z, osvětlením a zakrýváním objektů,
- dekorací a objektem, který skutečně patří do herních pravidel.

Zachováme současnou úroveň dlouhou přibližně minutu a přidáme několik věží
do jejích existujících částí. Boss, bonusy a další zbraně mohou přijít později.

## 2. Nejprve jedna společná vzdálenost letu

Zavedeme `scrollDistance` do herního stavu. Při běžícím kroku platí:

```ts
scrollDistance += scrollSpeed * dt;
```

Pro první verzi navrhuji `scrollSpeed = 4` jednotky/s.
Pozice pevného bodu terénu na obrazovce pak bude:

```ts
screenY = levelY - scrollDistance;
```

Například věž na `levelY = 80` je při vzdálenosti letu 75 v `screenY = 5`.
Její X zůstává stejné. Nejde o HTML pixely, ale o světové jednotky v záběru.

Pozemní cíle i dekorace musí čerpat z téže vzdálenosti. Její aktualizace patří
do herní logiky, takže pauza zastaví terén i věže a restart vrátí obojí na začátek.
Renderer už nesmí posouvat terén vlastním nezávislým součtem `dt`.

Vzdušní nepřátelé mohou dál používat současné souřadnice v záběru a vlastní
rychlost. Herní data pozemního cíle uchovají `levelY`; před kolizemi se z něj
odvodí aktuální i předchozí Y v záběru. Tím dál funguje `sweepHit()`.

## 3. Posouvající se terén z opakovaných segmentů

Začneme třemi segmenty dlouhými například 16 jednotek. Každý obsahuje základní
plochu, spáry panelů a několik nízkých konstrukcí z jednoduchých 3D tvarů.
Segmenty za spodním okrajem se znovu použijí nad horním okrajem.

Výběr segmentů a jejich polohu odvozuj z `scrollDistance`, délky segmentu
a indexu segmentu. Tři segmenty mají pokrýt výšku záběru 24 jednotek i rezervu.
Nevytvářej každým snímkem nové geometrie ani materiály.

Dekorace budou deterministické: stejný index segmentu má stejnou podobu.
V této fázi stačí několik ručně připravených variant. Náhodné rozmístění při
každém opakování by komplikovalo ladění i čistý restart.

Terén se nesmí účastnit kolizí. Loď přes něj bezpečně přelétá.
Věže mají vlastní herní ID a životní cyklus; nebudou součástí recyklovaných
dekorativních segmentů. Jinak by recyklace mohla oživit zničený cíl.

## 4. Hloubkové vrstvy a vzhled shora

Zachováme ortografickou kameru na kladné ose Z a herní rovinu XY.
Navržené vizuální vrstvy:

| Vrstva | Přibližné Z | Poznámka |
| --- | --- | --- |
| Podklad | −5 | Základní plocha terénu |
| Konstrukce | −4,8 až −3 | Objem, osvětlení a členění |
| Věže | −3 až −1,5 | Základna, otočná hlaveň a příprava výstřelu |
| Lodě | 0 | Současná herní vrstva |
| Střely a zásahové efekty | Nad modely | Zachovat dobrou čitelnost hrozeb |

Konkrétní Z musí odpovídat skutečným rozměrům geometrií, nejen jejich středům.
Plochy nepokládej přesně přes sebe: malé oddělení zabrání soupeření
hloubkového bufferu o stejný povrch (z-fighting).

Při kolmém ortografickém pohledu samotný vyšší kvádr nemění svůj obrys.
Objem proto zvýrazníme zkosenými hranami, šikmými plochami, menší horní částí
a směrovým světlem. Kamera se zatím nenaklání, aby mapa XY na obrazovku
zůstala jednoduchá a srozumitelná.

Pod hráčovou lodí může být stylizovaný tmavý průhledný stín na podkladu,
posunutý o malý pevný vektor podle směru světla. Bude to vizuální pomůcka
pro vnímání výšky, nikoli skutečný výpočet stínových map. Vynechání stínu
nesmí ovlivnit žádné herní pravidlo.

## 5. Pozemní věž jako nový herní objekt

Přidáme `turret` s pevnou pozicí v úrovni:

```ts
type GroundTarget = {
  id: number;
  x: number;
  levelY: number;
  hp: number;
  // Dále hitbox a časovače aktivity / střelby.
};
```

Pro začátek navrhuji 3 věže, dva životy, 200 bodů za zničení a mířený výstřel
každých 1,5 s. Časy rozmístění zvolíme tak, aby se jejich střelba zpočátku
nekryla s plnými salvami vzdušných střelců.

Věž se aktivuje až po úplném vstupu do záběru. Před výstřelem na 0,4 s
rozsvítí hlaveň. Po průletu pod spodní okraj se odstraní; nestřílí mimo obraz.
Směr její hlavně v XY ukazuje k hráči. Směr již vystřelené střely je pevný.

Z herního hlediska zvolíme následující jednoduchá pravidla:

- Hráčova současná zbraň zasahuje vzdušné i pozemní cíle.
- Při více cílech se použije první platný zásah po dráze střely, včetně věží.
- Loď se s věží tělesně nesráží, protože nad ní letí.
- Střela věže zasahuje hráče stejným 2D testem jako střela vzdušného nepřítele.
- Při zničení věž přestane střílet a změní model na neaktivní trosku.
- Troska se dál posouvá s terénem, ale není cílem ani překážkou.

Jde o vědomé zjednodušení herních pravidel: Z určuje vzhled, nikoli balistiku.
Střela vizuálně vznikne nad hlavní a následně se vykresluje v čitelné vrstvě
projektilů. Nemusíme simulovat její stoupání ze země do výšky lodi.

Zničený cíl odstraníme ze seznamu aktivních hrozeb. Případná troska musí
mít omezenou životnost do opuštění záběru a nesmí blokovat vítězství.

## 6. Začlenění do úrovně a konce hry

Pozice věží budou pevná data v `src/level.ts` vedle vzdušných vln.
Každá věž má vzniknout právě jednou, když její pozice dosáhne horní rezervy
záběru. Nevytváří se opakovaně podle viditelnosti modelu.

Všechny věže umístíme tak, aby se objevily před koncem 55sekundové časové osy.
Podmínka vítězství počká i na zbývající živé věže a jejich střely.
Pauza a výsledková obrazovka zastaví také terén; restart vyčistí cíle,
trosky i projektily a obnoví vzdálenost letu na nulu.

Pro ladění přidáme přepínač „Terén“, který mění jen dekoraci a stíny.
Věže a jejich střely musí zůstat viditelné a pravidla zásahů stejná.
Existující kolizní kruhy zobrazí také aktivní věže.

## 7. Doporučené rozdělení práce

1. Přidat vzdálenost letu do stavu a otestovat její pauzu a reset.
2. V `src/terrain.ts` vytvořit opakované segmenty odvozené z této vzdálenosti.
3. Doplnit výškové vrstvy, materiály a stylizovaný stín lodi.
4. Do `src/level.ts` přidat pevná data věží a jejich jednorázovou aktivaci.
5. Implementovat střelbu, zásahy, body a přechod věže na trosku.
6. Zapojit věže do podmínek vítězství a resetu; odehrát a vyladit celou úroveň.

`src/game.ts` nadále neimportuje Three.js. `src/terrain.ts` spravuje pouze
zobrazení prostředí, `src/scene.ts` ho propojuje s modely a kamerou.
Pravidla věží lze oddělit do menšího modulu, pokud už by `game.ts` přestal
být přehledný; není potřeba kvůli tomu zavádět obecný fyzikální engine.

## 8. Kdy je fáze hotová

- Terén se plynule opakuje bez mezer a bez růstu počtu modelů.
- Terén a pozemní cíle se posouvají stejnou rychlostí a zůstávají vůči sobě pevné.
- Pauza zastaví všechny vrstvy; restart obnoví stejný začátek prostředí.
- Let nad konstrukcí nebo věží neodebírá životy, její střela ano.
- Hráčova střela zasáhne první platný cíl bez ohledu na jeho vizuální Z.
- Věž mimo obraz nestřílí, zničená věž nepřidává další body a neožije recyklací terénu.
- Trosky neblokují dokončení úrovně a po odjezdu z obrazovky se uklidí.
- I nad členitým podkladem jsou nepřátelské střely a příprava výstřelu čitelné.
- Přepnutí dekorativního terénu nemění stav hry ani výsledek stejné posloupnosti vstupů.
- Projdou dosavadní testy a nové testy věží, posunu, resetu a vítězství i produkční build.

V prohlížeči ověř zejména spoje segmentů, hloubkové pořadí a čitelnost
střel při pohybu. To automatické testy samotných herních dat neprokážou.


## 9. Hotová implementace

- `src/game.ts` drží `scrollDistance`, jednorázový index pozemních cílů,
  věže a trosky. Herní krok řídí i jejich pozice a časovače.
- `src/level.ts` obsahuje tři věže na pozicích 49, 117 a 185 jednotek,
  tedy se vstupem do horní rezervy přibližně v 9., 26. a 43. sekundě.
- `src/terrain-layout.ts` počítá indexy a polohy tří souvislých segmentů.
- `src/terrain.ts` vytváří pevný počet modelů panelů a konstrukcí, sdílené
  geometrie i materiály a stylizovaný stín lodi. Vše odvozuje ze vzdálenosti letu.
- `src/scene.ts` vykresluje věže, otočné hlavně, přípravu výstřelu a trosky.
  Přepínač terénu skrývá podklad, konstrukce a stín, ale ponechá věže,
  trosky i projektily. Při vypnutí terénu se vrátí hvězdné pozadí.
- `src/main.ts` propojuje přepínače se zobrazením. Do herní logiky jejich
  hodnoty neposílá, takže přepínání nemění kolize ani průběh úrovně.
- `tests/ground.test.ts` ověřuje návaznost segmentů, společný posun,
  pozastavení a reset, aktivaci a zničení věží, pořadí zásahů a vítězství.

Věž má dva životy a dává 200 bodů. Střílí po 1,5 s, posledních 0,4 s před
výstřelem svítí ústí hlavně. Příprava běží pouze tehdy, když se celý model
vejde do záběru. Střely věží mají stejná pravidla jako ostatní nepřátelské střely.
Troska není kolizním cílem, s terénem odjede a neblokuje vítězství.

Terén používá jednoduché objemy a materiály bez textur a bez skutečných
stínových map. Stín lodi je průhledný tmavý tvar; jeho vykreslení nic
nemění na herním stavu. Výškové vrstvy tak lze studovat bez dalšího
načítání assetů a nastavování externích nástrojů.
