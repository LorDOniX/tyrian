# 3D shora

Prototyp vertikální střílečky: 3D modely, ortografická kamera a pohyb ve 2D.
Základ vykreslování vysvětluje [faze1.md](faze1.md), nepřátele a herní pravidla
[faze2.md](faze2.md). Fáze 3 přidává [první úroveň](faze3.md): pevné vlny, střelce s mířenými
střelami a vítězství. [Fáze 4](faze4.md) přidává posouvající se 3D terén,
pozemní věže, trosky a stín lodi. [Fáze 5](faze5.md) zakončuje misi bossem
se dvěma fázemi, mířenou salvou a vějířem střel. [Fáze 6](faze6.md) používá
sprite exploze, zásahy a projektily z přidaných Tyrian assetů. [Fáze 7](faze7.md)
přidává sbíratelnou opravu a dočasnou trojstřelu. [Fáze 8](faze8.md) mění běžné
lodě na Tyrian sprity a rozšiřuje flotilu na 50 lodí pěti typů. [Fáze 9](faze9.md)
přidává druhý level se vzducholoděmi, poškozenými variantami trupu a debug startem.
[Fáze 10](faze10.md) ho zakončuje sprite bossem z `newsht.shp.000000.png`. [Fáze 11](faze11.md) přidává třetí level Ocelová pevnost, dva nové typy lodí a finálního bosse z `newsho.shp.000000.png`. Zachovává 3 životy, skóre, pauzu a restart.
[Fáze 12](faze12.md) přidává odlet a sedm vzhledů hráče. [Fáze 13](faze13.md)
přidává obnovitelné štíty, panel systémů a hangár s nákupem výzbroje, štítu a trupu.
[Fáze 14](faze14.md) rozšiřuje kampaň o čtvrtý level Slévárna stínů, tři nové
typy nepřátel z `newsh2`, bosse z `newsh4` a dvojnásobné ceny v hangáru. [Fáze 15](faze15.md) uzavírá střed bosse
a mění štíty na samostatnou zásobu pro každý život. [Fáze 16](faze16.md)
přidává výzbroj s jedním až pěti děly vedle sebe. [Fáze 17](faze17.md)
používá sprite kanóny z `newshs` a mění dočasný bonus na jedno dělo navíc.
[Fáze 18](faze18.md) skládá fialové Bastiony ze dvou samostatně zničitelných dílů.
[Fáze 19](faze19.md) přidává další dva typy pozemních kanónů s dvojitou
palbou a rozstřelitelné padající kameny z `newshd` bez bodové odměny.

## Spuštění

```sh
npm install
npm run dev
```

Šipky / WASD: pohyb. Mezerník: střelba. Esc: pauza. Enter: pokračování / restart.
Základní loď má 3 životy, každý s vlastními 6 body štítu. Vyčerpání štítu
okamžitě odebere jeden život a zbývajícímu životu obnoví štít na maximum
podle výbavy (6, 9 nebo 12). Štít se během života automaticky nedobíjí;
ztráta posledního života znamená konec hry. Skóre zároveň přidává kredity.
Po každé vítězné misi lze v hangáru koupit čtyři vylepšení výzbroje a dvě úrovně štítu a trupu.
Každé vylepšení výzbroje přidá jedno dělo až do maxima pěti vedle sebe;
čtyři nákupy stojí 5 000 / 10 000 / 15 000 / 20 000 kreditů. Trup stojí
5 000 / 10 000 kreditů a štít 4 000 / 8 000 kreditů. Bonus dočasně přidá
jedno dělo, vždy nejvýše do pěti.
Výbava i zůstatek přecházejí do další mise; po prohře se rozpočet vrací na
začátek aktuální mise. Další mise začíná s plnou ochranou podle zakoupené výbavy.
Po zničení bosse každého levelu loď automaticky zrychlí nahoru a odletí
za horní okraj. Až poté se zobrazí výsledek mise. Ve vývoji lze animaci
zkusit tlačítkem „Debug: odlet“. Tlačítko „Loď: …“ otevře výběr sedmi vzhledů z `tyrian.shp.007D3C.png`
s náhledy. Výchozí je první stříbrná loď. Volba platí do obnovení stránky,
včetně restartů a přechodů mezi levely; herní vlastnosti zůstávají stejné.
Při výběru je hra pozastavená. Kamera je pevná. Při opuštění okna se hra pozastaví. Kolizní kruhy lze zapnout
zaškrtávátkem. Přepínač Terén skrývá pouze dekoraci, nikoli věže a střely. Ovládání je zatím pouze klávesnicí.

Pro testy používej Node.js 22.18+ (nebo novější podporovanou řadu).

Pro ladění závěrečného souboje: `npm run dev -- --mode boss`.
Přímo do druhého levelu: `npm run dev:level2`. K jeho bossovi: `npm run dev:boss2`. Ve vývoji lze použít i tlačítko
„Debug: start levelu 2“. Po vítězství v prvním levelu Enter přejde do druhého;
po druhém levelu přejde do třetího. Po prohře restartuje aktuální level.
Třetí level lze spustit přímo příkazem `npm run dev:level3`, jeho bosse `npm run dev:boss3`.
Po třetím levelu Enter pokračuje do čtvrtého. Přímý start: `npm run dev:level4`,
souboj s jeho bossem: `npm run dev:boss4`. Produkční hra vždy začíná levelem 1.

## Příkazy

- `npm run dev` – vývojový server.
- `npm run dev:level2` – vývojový start přímo ve druhém levelu.
- `npm run dev:level3` – vývojový start ve třetím levelu.
- `npm run dev:boss3` – vývojový start před bossem třetího levelu.
- `npm run dev:boss2` – vývojový start přímo před bossem druhého levelu.
- `npm run dev:level4` – vývojový start ve čtvrtém levelu.
- `npm run dev:boss4` – vývojový start před bossem čtvrtého levelu.
- `npm run dev:shop` – vývojový náhled hangáru s 50 000 kredity.
- `npm run assets:prepare` – volitelné obnovení sprite atlasu ze zdrojů (vyžaduje FFmpeg).
- `npm test` – testy kolizí a herních pravidel.
- `npm run typecheck` – kontrola typů.
- `npm run build` – kontrola typů a produkční sestavení do `dist/`.
- `npm run preview` – náhled produkčního sestavení.

## Soubory

- `src/main.ts` – vstup aplikace a úklid při HMR.
- `src/upgrades.ts` – stupně výzbroje, štítu a trupu a ceny v hangáru.
- `src/level.ts` – časované formace a části úrovně.
- `src/convoy-boss.ts` – pravidla a útoky admirála konvoje.
- `src/convoy-boss-model.ts` – sprite model, rozsvícené hlavně a štít.
- `src/dreadnought-boss.ts` – útoky Stínového vládce.
- `src/dreadnought-boss-model.ts` – nepoškozený a poškozený trup newsh4.
- `src/fortress-boss.ts` – tři útoky a dvě fáze finálního bosse.
- `src/fortress-boss-model.ts` – trup newsho, světla hlavní a příletový štít.
- `src/boss.ts` – pravidla souboje a útoků.
- `src/boss-model.ts` – 3D model a vizuální signalizace.
- `src/start-mode.ts` – vývojové vstupy do jednotlivých misí a soubojů.
- `src/enemies.ts` – typy nepřátel, pohyb a vzory střelby.
- `src/bonuses.ts` – bonusy, opravy a dočasná trojstřela.
- `src/game.ts` – herní stav a pravidla bez Three.js.
- `src/collision.ts` – kolizní výpočty ve 2D.
- `src/terrain.ts` – opakované segmenty a stylizovaný stín.
- `src/terrain-layout.ts` – výpočet poloh segmentů.
- `src/player-ships.ts` – vzhledy hráče a výběr snímku náklonu.
- `src/sprite-clips.ts` – výřezy a časování sprite animací.
- `src/sprite-effects.ts` – sdílená textura a sprite modely.
- `src/assets/tyrian-fx.png` – připravený průhledný atlas.
- `src/scene.ts` – kamera, modely a synchronizace zobrazení.
- `tests/` – testy kolizí, herních pravidel a celé úrovně.
- `src/style.css` – základní styly.
- `index.html` – kontejner scény a nápověda.
