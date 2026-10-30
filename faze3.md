# Fáze 3: první úroveň, vlny a nepřátelská střelba

Navrhuji proměnit současné nekonečné náhodné spawnování v krátkou, ručně
navrženou úroveň. Přidáme druhý typ nepřítele, střely mířené na hráče a vítězství.
Hráč se bude učit rozpoznávat situace, mířit a uhýbat.

Fáze 3 je implementovaná. Níže je popsaný návrh; přehled výsledného kódu
a ověření najdeš na konci dokumentu.

## 1. Cíl a rozsah

Výsledkem má být přibližně minutová úroveň se třemi částmi:

| Herní čas | Obsah | Co si hráč vyzkouší |
| --- | --- | --- |
| 0–15 s | Dvě formace běžných průletových lodí | Pohyb a míření |
| 15–35 s | Střelci přilétající ze stran horní části | Uhýbání mířeným střelám |
| 35–55 s | Kombinace průletových lodí a střelců | Volbu cíle a bezpečné pozice |
| Po 55 s | Dořešení zbývajících nepřátel a střel, poté výsledek | Dokončení úrovně |

Časy jsou návrh pro první ladění. Herní čas se při pauze zastaví.
Zachováme tři životy, skóre, ochranu po zásahu, pevný výřez i restart.

Boss, bonusy, vylepšování zbraní, zvuky a rozsáhlý terén zůstanou pro další
fázi. Tady nejprve potřebujeme čitelný a dokončitelný souboj.

## 2. Vlny jako data

Aktuální `spawnLeft` v `src/game.ts` vytváří náhodného nepřítele každých 1,2 s.
Nahradíme ho seznamem časovaných událostí v `src/level.ts`.
Každá událost určí čas, druh a počáteční pozici nepřítele.

```ts
type SpawnEvent = {
  at: number;
  kind: 'scout' | 'gunner';
  x: number;
  y: number;
};

const events: SpawnEvent[] = [
  { at: 1, kind: 'scout', x: -4, y: 13 },
  { at: 1, kind: 'scout', x: 0, y: 13 },
  { at: 1, kind: 'scout', x: 4, y: 13 },
];
```

Stav hry drží index další události. Při aktualizaci zpracujeme pomocí `while`
všechny události, jejichž čas už nastal. Každá se musí provést právě jednou,
i když několik událostí spadá do stejného snímku.
Seznam bude seřazený podle času a pro všechny hráče stejný.

Události úrovně jsou neměnná data. Restart vrátí index na začátek,
ale neupravuje ani znovu náhodně negeneruje jejich obsah.
Nezavádíme zatím editor úrovní; pro ladění stačí TypeScriptový seznam.

## 3. Dva typy nepřátel

**Scout** je současný průletový nepřítel: letí dolů rychlostí 4 jednotky/s,
stačí jeden zásah, dává 100 bodů a nestřílí.
Formace vznikne kombinací několika spawn událostí.

**Gunner** přiletí z horního okraje na určenou pozici, krátce se zdrží,
vystřelí tři jednotlivé střely s odstupem a potom odletí dolů.
Pro první verzi navrhuji dva životy a 250 bodů za zničení.
Model musí být jiný barvou i tvarem, například širší oranžová loď s hlavní.

Jeho chování bude jednoduchý stavový automat:

```text
přílet → příprava → výstřel → příprava → výstřel → příprava → výstřel → odlet
```

Každý přechod řídí herní časovač. Návrh hodnot: zastavení na `y = 7`,
příprava 0,8 s, střela 6 jednotek/s. Střílet smí až po příletu do záběru.
Přípravu ukáže rozsvícení hlavně; hráč tak vidí, že se chystá nebezpečí.

Zásah střelou vždy spotřebuje hráčovu střelu. Body a exploze vzniknou až při
poklesu životů nepřítele na nulu. Na pouhý zásah stačí krátké bliknutí modelu.

## 4. Mířená střela a vektory

Při výstřelu spočítáme vektor od hlavně k aktuální poloze hráče:

```ts
const dx = player.x - muzzle.x;
const dy = player.y - muzzle.y;
const length = Math.hypot(dx, dy);
const vx = length > 0 ? dx / length * speed : 0;
const vy = length > 0 ? dy / length * speed : -speed;
```

Směr uložíme do střely. Dále se už nepřepočítává: hráč může uhnout.
Při shodné poloze použijeme směr dolů a vyhneme se dělení nulou.
Pohyb střely je `x += vx * dt`, `y += vy * dt`.

Dosavadní `Body.speed` stačí pro svislý pohyb. Střelám teď dáme explicitní
`vx` a `vy`, aby mohly létat libovolným směrem. Pro obě strany lze použít
společný typ s `owner: 'player' | 'enemy'`; hráčovy střely mají `vx = 0`, `vy = 22`.
Typy nepřátel rozlišíme přes `kind`, jejich chování zůstane v herní logice.

To je další praktický příklad rozdělení 2D a 3D: vektor XY určuje pravidla
pohybu, natočení modelu střely pouze ukazuje směr letu.

## 5. Kolize a ochrana hráče

Znovu použijeme `sweepHit()` z `src/collision.ts`, tentokrát i mezi nepřátelskou
střelou a pohybujícím se hráčem. Test zahrne starou i novou pozici obou objektů.

Pravidla:

- Hráčovy střely zasahují jen nepřátele.
- Nepřátelské střely zasahují jen hráče; střely se navzájem neblokují.
- Střela se při dotyku hráče spotřebuje i během jeho nezranitelnosti.
- Poškození ze střel a nárazu lodi sdílí stejnou jednosekundovou ochranu.
- Více současných zásahů odebere nejvýše jeden život.
- Nepřátelské střely po zničení svého střelce pokračují v letu.
- Střely odstraňujeme za všemi čtyřmi okraji s malou rezervou.

Zachováme pravidlo fáze 2: nejprve hráčovy střely proti nepřátelům,
potom hrozby proti hráči. Nepřítel zničený v kroku už hráče nárazem nepoškodí.
Výstřel naplánovaný během kroku lze vytvořit až po vyřešení jeho zničení;
nová střela se začne pohybovat v následujícím kroku.

## 6. Dokončení úrovně

Přidáme stav `victory`. Nastane, když uplynul konec úrovně, byly zpracované
všechny spawn události a na ploše nezůstali nepřátelé ani nepřátelské střely.
Hráč musí mít alespoň jeden život. Při souběhu posledního zásahu a podmínky
vítězství má přednost `gameOver`.

Úroveň je splněná přežitím; nezničený nepřítel může odletět bez bodů.
Každý střelec musí mít konečný odlet, aby nešlo čekat na vítězství navždy.
Hráčovy střely a dekorativní efekty dokončení neblokují.

Výsledková obrazovka ukáže skóre a zbývající životy. Enter nebo tlačítko
spustí stejnou úroveň od začátku. Pauza nesmí přepsat koncový stav.
Restart vyčistí také index událostí, stavy střelců a nepřátelské střely.

## 7. Čitelnost obrazu

Hráčovy střely zůstanou úzké a azurové. Nepřátelské budou větší, kulaté
a oranžové s jasným středem; rozdíl tak nebude záviset pouze na barvě.
Dekorace budou tmavší a za herní rovinou. Střely mají zůstat viditelné i přes
modely a záblesky, jejich kolizní kruhy lze kontrolovat existujícím přepínačem.

Do HTML doplníme číslo části úrovně a postup podle herního času. Ukazatel se
na konci časové osy zastaví s textem „Dokonči souboj“, dokud nezmizí hrozby.
Při změně velikosti okna se stále nemění rozsah herní plochy.

## 8. Pořadí implementace a ověření

1. Přidat `src/level.ts` a přehrávání pevných spawn událostí, odstranit náhodný spawn.
2. Zavést střely s vektorem rychlosti a vlastníkem, zachovat hráčovu střelbu.
3. Přidat střelce, jeho životy a přechody přílet / příprava / střelba / odlet.
4. Doplnit míření, zásahy hráče a společnou nezranitelnost.
5. Přidat dokončení úrovně, výsledkový panel a úplný reset.
6. Ověřit čitelnost a vyladit obsah celé úrovně v prohlížeči.

Automatické testy mají ověřit zejména:

- Událost se provede právě jednou, souběžné události se neztratí.
- Pauza neposouvá události, přípravu výstřelu ani projektily.
- Mířená střela drží směr i po přesunu hráče a nemá neplatnou rychlost při nulové vzdálenosti.
- Střelec po prvním zásahu přežije, po druhém přidá body právě jednou.
- Rychlá nepřátelská střela zasáhne i mezi snímky.
- Souběh nárazu a střely odebere nejvýše jeden život.
- Ochrana hráče nebrání spotřebování dotýkající se střely.
- Vítězství čeká na konec událostí a odstranění všech hrozeb; prohra má přednost.
- Restart po vítězství i prohře obnoví tutéž úroveň a čistý stav.

Fáze je hotová, až jde celou úroveň dokončit, prohrát i opakovat bez obnovení
stránky a současně projdou `npm test` a `npm run build`.


## 9. Hotová implementace

- `src/level.ts`: neměnný seznam 28 spawn událostí, tři části a časová osa 55 s.
- `src/game.ts`: střely s vlastníkem a vektorem rychlosti, životy nepřátel,
  přílet / nabíjení / odlet střelce, míření při výstřelu a stav `victory`.
- `src/scene.ts`: širší oranžový střelec s blikající a zvětšující se hlavní,
  záblesk při zásahu, kulaté nepřátelské střely s jasným středem.
- `src/main.ts` a `index.html`: postup úrovně, její aktuální část,
  výsledek s životy a skóre, restart po vítězství i prohře.
- `tests/level.test.ts`: časované události, střelec, míření, střely, ochrana,
  pauza, podmínky vítězství a konečnost celé úrovně.

Oranžové střely se vykreslují nad modely a běžnými efekty. Restart vyčistí
mapy modelů před opětovným použitím ID, aby se nezaměnily různé druhy lodí.
Střelec přilétá svisle na boční pozici, třikrát vystřelí po 0,8 s a odletí.
Úroveň končí po 55 s až po odletu / zničení zbývajících nepřátel a odstranění
jejich střel, takže skutečná délka je přibližně minuta.

Při pauze i po výsledku je scéna zmrazená. Automatický průchod testem celé
úrovně používá ochranu hráče pouze v testu; běžná hra žádnou trvalou ochranu nemá.
