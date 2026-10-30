# Fáze 2: nepřátelé, zásahy a první herní cyklus

Doporučuji navázat na ovládání a střelbu jedním typem nepřítele, kolizemi,
životy, skóre a restartem. Získáme malou hru s jasnými pravidly a současně
si ověříme hlavní princip: herní logika pracuje ve 2D, Three.js ji zobrazuje ve 3D.

Fáze 2 je implementovaná. Níže je vysvětlení návrhu a na konci dokumentu
přehled skutečné implementace a ověření.

## 1. Jak má výsledek fungovat

- Hráč dál létá pomocí WASD / šipek a střílí mezerníkem.
- Nad horním okrajem vznikají nepřátelské lodě, které letí přímo dolů.
- Jedna hráčova střela zničí jednoho nepřítele a přidá 100 bodů.
- Srážka hráče s nepřítelem odebere jeden ze tří životů a odstraní nepřítele.
- Po zásahu je hráč jednu sekundu nezranitelný a jeho model bliká.
- Nepřítel, který proletí spodním okrajem, zmizí bez bodů a bez odebrání života.
- Při nule životů nastane konec hry. Enter zahájí novou hru.

Pro tuto fázi stačí nepřátelé bez vlastní střelby. Přesto už má hráč důvod
mířit, uhýbat a zkusit dosáhnout vyššího skóre.

## 2. Oddělit stav hry od modelů

Ve fázi 1 jsou souřadnice přímo v `ship.position` a střely jsou seznam modelů
`THREE.Mesh[]`. S přibývajícími pravidly doporučuji zavést samostatná herní data.

Například:

```ts
type Body2D = {
  id: number;
  x: number;
  y: number;
  radius: number;
};

type Enemy = Body2D & {
  speed: number;
};

type GameState = {
  status: 'playing' | 'gameOver';
  score: number;
  lives: number;
  invulnerabilityLeft: number;
  spawnLeft: number;
  // Dále hráč, střely, nepřátelé a časovač střelby.
};
```

To je ukázka tvaru dat, nikoli kompletní implementace.
Modely lze přiřazovat k identifikátorům přes `Map<number, THREE.Object3D>`.
Aktualizace pravidel mění data; zobrazovací část podle nich nastaví pozice modelů:

```ts
model.position.set(enemy.x, enemy.y, 0);
```

Výhoda pro pochopení: pokud vyměníš model nepřítele za jiný tvar nebo změníš
jeho náklon, pravidla zásahu zůstanou stejná. Samotné `z` nepatří do kolizí
objektů ve stejné herní rovině. Dekorace v pozadí do seznamu kolizí vůbec nezařazujeme.

Pro tento rozsah postačí několik souborů:

| Soubor | Odpovědnost |
| --- | --- |
| `src/game.ts` | Stav hry, pohyb, časovače, zásahy, skóre a restart. Bez závislosti na Three.js. |
| `src/collision.ts` | Čisté výpočty kolizí v XY. |
| `src/scene.ts` | Kamera, renderer, modely, hvězdy a synchronizace obrazu se stavem. |
| `src/main.ts` | Propojení vstupu, hry, scény a HTML ukazatelů. |

Není potřeba obecný engine ani systém komponent. Rozdělení dělej postupně při
přidávání nepřátel, aby bylo pořád snadné sledovat tok jednoho snímku.

## 3. Nepřítel a jeho vytváření

Začni výrazně odlišným modelem, například červenou lodí z několika kvádrů.
Použij existující světla i kameru. Rozměry modelu přibližně přizpůsob hitboxu.

Navržené počáteční hodnoty pro současnou plochu 18 × 24 jednotek:

| Parametr | Hodnota |
| --- | --- |
| Vznik nepřítele | Každých 1,2 s herního času |
| Počáteční pozice | `y = 13`, `x` přibližně od −7 do +7 |
| Rychlost | 4 jednotky/s ve směru −Y |
| Poloměr nepřítele | 0,6 jednotky |
| Poloměr hráče | 0,45 jednotky |
| Odstranění nepřítele | Jakmile je celý pod `y = -12` |

Hodnoty jsou návrh k ladění. Menší hitbox hráče než jeho křídla může ovládání
zpříjemnit, ale je dobré ho při vývoji umět zobrazit.

Časovač spawnování aktualizuj stejným `dt` jako ostatní hru. Nepoužívej
samostatný `setInterval`: při pauze nebo restartu by se jeho chování hůře řídilo.
Při testování nejprve používej pevné pozice nebo opakující se seznam pozic.
Náhodné `x` přidej až potom, aby šel problém snadno zopakovat.

## 4. Kolize: jednoduchý tvar místo trojúhelníků modelu

Pro srážku lodí stačí v XY kruhy. Jejich dotyk nastane, když:

```ts
const dx = a.x - b.x;
const dy = a.y - b.y;
const radius = a.radius + b.radius;
const hit = dx * dx + dy * dy <= radius * radius;
```

Porovnáváme druhé mocniny vzdálenosti; není třeba počítat odmocninu.
Výška kabiny, náklon modelu ani počet jeho trojúhelníků tento výpočet nemění.
`Raycaster` ani fyzikální knihovnu pro takovou srážku nepotřebujeme.

### Pozor na rychlé střely

Aktuální střela letí rychlostí 22 jednotek/s. Při maximálním `dt = 0.05`
urazí za snímek 1,1 jednotky. Test pouze v nové pozici tedy může malého
nepřítele přeskočit.

U střel doporučuji rovnou testovat **celou úsečku mezi minulou a novou pozicí**
proti kruhu nepřítele zvětšenému o poloměr střely. Střelu tím pro kolize
aproximujeme pohybujícím se kruhem, její dlouhý světelný model je vizuální efekt.

Postup výpočtu:

1. Ulož starou pozici střely A a spočítej novou pozici B.
2. Při pohybu nepřítele ulož také jeho starou a novou pozici.
3. Přejdi do relativního pohybu: A i B odečti o odpovídající pozici nepřítele.
4. Najdi nejbližší bod výsledné úsečky k počátku. Parametr projekce omez na 0 až 1.
5. Porovnej jeho vzdálenost s celkovým poloměrem. Úsečku nulové délky ošetři jako bod.

To zachytí průlet i mezi snímky za předpokladu přímého pohybu během kroku.
Pokud střela protne více nepřátel, zasáhne pouze prvního po směru letu;
vyber nejmenší čas vstupu do jejich kolizního kruhu v intervalu 0 až 1.
Při počátečním překryvu ber čas zásahu jako nulu.

Pro několik desítek objektů stačí porovnat každou střelu s každým nepřítelem.
Prostorové dělení má smysl řešit až podle skutečného zatížení.

## 5. Pevné pořadí aktualizace

Jeden herní krok by měl mít jasné pořadí:

1. Pokud je hra ukončená, zpracuj pouze požadavek na restart.
2. Sniž časovače a zpracuj vstup hráče.
3. Vytvoř případné střely a nepřátele.
4. Ulož staré pozice a posuň objekty podle rychlosti a `dt`.
5. Vyhodnoť zásahy střel; označ spotřebované střely a zničené nepřátele.
6. Vyhodnoť srážky hráče s dosud živými nepřáteli.
7. Odstraň označené objekty a objekty mimo plochu.
8. Aktualizuj stav konce hry, modely, krátké efekty a HTML ukazatele.
9. Vykresli scénu.

Z tohoto pořadí plyne konkrétní pravidlo: nepřítel zničený střelou už ve stejném
kroku neublíží hráči. Při několika současných srážkách nastav nezranitelnost
hned po první, takže se odebere nejvýše jeden život.

Během průchodu seznamy je bezpečné objekty označit jako neaktivní a odstranit
je až po kolizích. Další testy musí neaktivní objekty přeskočit. Jinak může
jedna střela přidat body několikrát nebo změna seznamu přeskočit další objekt.

## 6. Zpětná vazba a konec hry

Skóre a životy zobraz běžným HTML nad canvasem, podobně jako současnou nápovědu.
Při zničení nepřítele stačí krátký rozpínající se záblesk s vlastní dobou života.
Efekt nepatří do kolizí a po dohrání zmizí.

Po zásahu hráče dočasně ignoruj další poškození. Blikání odvozuj od herního
času, aby při pauze nepokračovalo nezávisle na simulaci.

Při `gameOver` zastav pohyb, spawnování i střelbu. Zobraz skóre a pokyn k Enteru.
Restart má vyčistit střely, nepřátele, efekty, stisky kláves a časovače,
obnovit hráče na `(0, -7)`, tři životy a nulové skóre. Také obnov viditelnost
a náklon modelu hráče. Restart nemá vytvářet nový renderer ani další animační smyčku.

Při ztrátě zaměření doporučuji pozastavit simulaci; pouhé vymazání kláves
nebrání tomu, aby hráč v neaktivním okně dostal zásah. Po návratu vynuluj
časovou základnu a pokračuj až vědomým stiskem klávesy, aby nevznikl časový skok.

Sdílené geometrie a materiály lodí uvolni až při ukončení scény. Odstranění
nepřítele ze hry znamená odebrání jeho modelu, nikoli zrušení prostředků,
které používají ostatní lodě. Pokud modely držíš v mapě, odstraň i jejich záznamy.

## 7. Doporučené pořadí implementace

1. Odděl herní polohy a rychlosti od modelů, zachovej chování fáze 1.
2. Přidej jednoho nepřítele na pevné pozici a jeho průlet obrazovkou.
3. Přidej pravidelné spawnování a odstranění mimo obraz.
4. Přidej zásahy střel a skóre.
5. Přidej srážky s hráčem, životy a nezranitelnost.
6. Doplň konec hry, restart, pauzu při ztrátě zaměření a jednoduché efekty.

Každý krok nejprve vyzkoušej samostatně. Grafiku stačí ponechat jednoduchou,
aby byly zásahy a pohyb dobře čitelné. Nepřátelské střely, vlny, bonusy,
terén a propracované exploze mohou přijít ve fázi 3.

## 8. Jak poznat, že je fáze hotová

- Jedna střela zničí nejvýše jednoho nepřítele a přidá body právě jednou.
- Průlet střely skrz nepřítele je zachycen i při `dt = 0.05`.
- Dva nepřátelé v dráze střely jsou vyřešeni podle pořadí zásahu.
- Zásah hráče odebere jeden život; další zásah během ochrany neodebere žádný.
- Nepřítel mimo obraz zmizí bez bodů a bez poškození hráče.
- Při konci hry se zastaví herní pravidla a Enter spustí čistou novou hru.
- Opakovaný restart nezvyšuje počet posluchačů vstupu ani animačních smyček.
- Po přepnutí záložky se hra pozastaví a po návratu neprovede velký časový skok.
- Rozměry okna nemění pravidla hry ani rozsah herní plochy.

Automatické testy mají smysl především pro čisté výpočty kolizí a stavové
přechody: dotyk kruhů, těsné minutí, nulový pohyb střely, rychlý průlet,
jednorázové přičtení bodů, nezranitelnost a reset. Pak spusť `npm run typecheck`
a `npm run build` a celý cyklus ověř v prohlížeči.

Při ladění pomůže přepínatelné zobrazení kolizních kruhů nad modely. Ukáže,
proč zásah nastal, a umožní odlišit chybu v pravidlech od pouhého vzhledu modelu.


## 9. Implementace v projektu

- `src/collision.ts`: `circlesOverlap()` pro lodě a `sweepHit()` pro první čas
  zásahu dvou pohybujících se kruhů. Kvadratická rovnice vrací čas vstupu do
  kruhu, takže lze zásahy seřadit; nejde pouze o test nejbližšího bodu.
- `src/game.ts`: herní data bez Three.js, `updateGame()`, pauza, pokračování
  a restart. Zásahy všech střel se řadí podle času a spotřebované objekty
  se přeskočí. Náhodný generátor lze při testu nahradit pevnou funkcí.
- `src/scene.ts`: sdílené geometrie a materiály, mapy modelů podle ID,
  jejich synchronizace se stavem, hvězdy, záblesky a kolizní kruhy.
- `src/main.ts`: jediná animační smyčka, vstup, HTML skóre a životy,
  tlačítko pokračování / restartu a úklid při HMR.
- `tests/game.test.ts`: automatické testy kolizí a herních pravidel.

Ovládání: WASD / šipky, mezerník pro střelbu, Esc pro pauzu a pokračování.
Enter nebo tlačítko pokračuje po automatické pauze a restartuje po konci hry.
Volba „Kolizní kruhy“ ukazuje skutečné 2D hitboxy nezávislé na natočení modelů.
Dotykové ovládání ani nepřátelská střelba zatím nejsou součástí hry.

`npm test` spouští testy přímo přes Node.js s podporou TypeScriptu (Node 22.18+
nebo novější podporovaná řada). `npm run build` kontroluje typy a sestaví aplikaci.

Poznámka k efektům: při pauze a konci hry je scéna včetně efektů zmrazená.
Při běžné hře záblesk zanikne za 0,35 s; restart všechny efekty vyčistí.
