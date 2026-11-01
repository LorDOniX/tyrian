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

## Spuštění

```sh
npm install
npm run dev
```

Šipky / WASD: pohyb. Mezerník: střelba. Esc: pauza. Enter: pokračování / restart.
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
Třetí level lze spustit přímo příkazem `npm run dev:level3`, jeho bosse `npm run dev:boss3`. Produkční hra vždy začíná levelem 1.

## Příkazy

- `npm run dev` – vývojový server.
- `npm run dev:level2` – vývojový start přímo ve druhém levelu.
- `npm run dev:level3` – vývojový start ve třetím levelu.
- `npm run dev:boss3` – vývojový start před bossem třetího levelu.
- `npm run dev:boss2` – vývojový start přímo před bossem druhého levelu.
- `npm run assets:prepare` – volitelné obnovení sprite atlasu ze zdrojů (vyžaduje FFmpeg).
- `npm test` – testy kolizí a herních pravidel.
- `npm run typecheck` – kontrola typů.
- `npm run build` – kontrola typů a produkční sestavení do `dist/`.
- `npm run preview` – náhled produkčního sestavení.

## Soubory

- `src/main.ts` – vstup aplikace a úklid při HMR.
- `src/level.ts` – časované formace a části úrovně.
- `src/convoy-boss.ts` – pravidla a útoky admirála konvoje.
- `src/convoy-boss-model.ts` – sprite model, rozsvícené hlavně a štít.
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
