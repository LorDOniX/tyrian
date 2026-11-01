# Fáze 10: dokončení konvoje a Admirál

Druhý level nově končí soubojem s „Admirálem konvoje“ ze souboru
`Remastered Tyrian Graphics/newsht.shp.000000.png`. Pouhé dokončení vln
už nevyvolá vítězství. Původní boss prvního levelu zůstává se svým 3D modelem,
60 životy a původními útoky.

## Průběh druhého levelu

```text
konvoj → odstranění zbývajících lodí a jejich střel
       → varování → přílet pod štítem → souboj → exploze → konec kampaně
```

Varování trvá 1,5 s. Boss pak přiletí z Y = 15 na Y = 7 rychlostí
2,5 jednotky/s. Během příletu má štít: hráčovy střely se spotřebují,
ale neubírají mu životy. Kontaktem tehdy hráči také neublíží.

Boss má 80 životů, dvě fáze a pět kolizních kruhů pokrývajících trup,
ramena a boční děla. Všechny kruhy sdílejí jedny životy; jedna střela
způsobí nejvýše jeden zásah. Zásah hráče kontaktem používá stávající
jednosekundovou nezranitelnost.

## Použití sprite sheetu

Atlas obsahuje čtyři nové snímky:

| Klip | Zdrojový výřez X, Y, šířka, výška |
| --- | --- |
| Celý boss | 0, 0, 144, 56 |
| Poškozený boss | 0, 84, 144, 56 |
| Levá rozsvícená hlaveň | 24, 56, 24, 28 |
| Pravá rozsvícená hlaveň | 120, 56, 24, 28 |

Celý boss zabírá přibližně 7,2 × 2,8 světových jednotek. Nepoškozený
vzhled používá při více než 40 životech, při 40 a méně se trvale přepne
na poničený trup. Rozsvícené hlavně se skládají nad základní obrázek
v odpovídajících pozicích. Kruh při příletu a centrální nabíjení jsou
jednoduché doplňkové efekty ve Three.js.

Dva velké výřezy používají samostatné oblasti 160 × 64 px vedle oblastí
vzducholodí. Atlas má stále 512 × 512 pixelů, nyní s 53 obsazenými snímky.
Žádný zdrojový soubor se nepřepisuje a velikost starších efektů se nemění.

## Útoky a fáze

Útoky se střídají v pevném pořadí, aby se jim hráč mohl naučit uhýbat:

1. **Mířená dvojitá salva:** každé ze dvou děl vystřelí třikrát.
   Dvojice dělí 0,22 s. Cíl se uloží při prvním výstřelu a během salvy
   se nepřepočítává podle dalšího pohybu hráče.
2. **Dvojitý vějíř:** z každého děla vyletí tři střely. Celkem šest střel
   vytvoří mezery mezi paprsky; po 0,42 s následuje ještě jedna salva.
3. **Kruhový pulz:** dvanáct střel s odstupem 30°. Při opakování cyklu
   se směr mezery střídá o 15°, aby nešlo pořád stát ve stejném pruhu.

Před útokem svítí odpovídající hlavně nebo střed trupu. Boss během přípravy
a střelby stojí; v přestávkách se přesouvá mezi X = −2,5, 0 a +2,5.

| Parametr | Fáze 1 | Fáze 2 |
| --- | --- | --- |
| Příprava útoku | 0,95 s | 0,7 s |
| Přestávka | 1,3 s | 1 s |
| Rychlost mířených střel | 5 | 6 jednotek/s |
| Rychlost vějíře | 4,7 | 5,7 jednotky/s |
| Rychlost pulzu | 4,2 | 5,2 jednotky/s |

Při dosažení 40 životů dokončí boss právě probíhající útok a jeho přestávku.
Potom jednorázově proběhne 0,9 s signalizace přechodu. Následující útoky
už používají rychlejší parametry. Předchozí projektily si ponechají rychlost;
přechod nerozbije rozestupy právě probíhající salvy.

## Zničení, vítězství a opakování

Poslední zásah okamžitě zastaví výstřely i kontaktní poškození bosse.
Nepřátelské střely se vyčistí před vyhodnocením poškození hráče ve stejném
kroku, stejně jako u původního bosse. Za zničení přibude jednou 5 000 bodů.
Následuje 1,5 s explozí po trupu a hlavních a zmenšování modelu.
Teprve potom se zobrazí „Kampaň dokončena“.

Restart z výsledku obnoví druhý level od jeho začátku se skóre uloženým
při příchodu do levelu, třemi životy a základní zbraní. Původní přenos
skóre z prvního levelu zůstává zachovaný.

Pauza zastaví přílet, salvy, přestávky, přechod fáze i závěrečnou sekvenci.
Kolizní kruhy zobrazují všech pět částí bosse.

## Debug start

Přímo k novému bossovi:

```sh
npm run dev:boss2
```

Alternativně:

```sh
npm run dev -- --mode boss2
```

Celý druhý level dál spustí `npm run dev:level2`.
Ve vývojové hře je vedle tlačítka levelu 2 i „Debug: boss levelu 2“.
Připraví čistý stav varování se třemi životy, nulovým skóre a bez vylepšení.
Panel pak ukazuje životy, právě připravovaný útok a režim bosse.

Původní `--mode boss` stále otevírá bosse prvního levelu. Produkční build
nepoužívá žádný z vývojových vstupů a začíná běžně od levelu 1.

## Kód a ověření

- `src/convoy-boss.ts`: nové útoky, časování, pohyb a kolizní tvary.
- `src/convoy-boss-model.ts`: skládání spritů, hlavně, štít a zničení.
- `src/boss.ts`: volba varianty při zachování původního chování velitele.
- `src/game.ts` a `src/level.ts`: příchod správného bosse po konvoji, odměna a konec kampaně.
- `src/sprite-clips.ts`: nové výřezy a jejich umístění v atlasu.
- `tests/convoy-boss.test.ts`: počet a směry střel, přechod, zničení, pauza a debug vstup.
- `tests/level2.test.ts`: průchod druhým levelem včetně závěrečného souboje.

Kontroly: `npm test` a `npm run build`. Automatické průchody celé mise
používají ochranu hráče pouze v testu; běžná hra ji nemá.
