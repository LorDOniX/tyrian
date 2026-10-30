# 3D shora

Prototyp vertikální střílečky: 3D modely, ortografická kamera a pohyb ve 2D.
Základ vykreslování vysvětluje [faze1.md](faze1.md), nepřátele a herní pravidla
[faze2.md](faze2.md). Fáze 3 přidává [první úroveň](faze3.md): pevné vlny, střelce s mířenými
střelami a vítězství. [Fáze 4](faze4.md) přidává posouvající se 3D terén,
pozemní věže, trosky a stín lodi. [Fáze 5](faze5.md) zakončuje misi bossem
se dvěma fázemi, mířenou salvou a vějířem střel. Zachovává 3 životy, skóre, pauzu a restart.

## Spuštění

```sh
npm install
npm run dev
```

Šipky / WASD: pohyb. Mezerník: střelba. Esc: pauza. Enter: pokračování / restart.
Kamera je pevná. Při opuštění okna se hra pozastaví. Kolizní kruhy lze zapnout
zaškrtávátkem. Přepínač Terén skrývá pouze dekoraci, nikoli věže a střely. Ovládání je zatím pouze klávesnicí.

Pro testy používej Node.js 22.18+ (nebo novější podporovanou řadu).

Pro ladění závěrečného souboje: `npm run dev -- --mode boss`.
Produkční hra vždy začíná vlnami; restart po výsledku také vrací začátek mise.

## Příkazy

- `npm run dev` – vývojový server.
- `npm test` – testy kolizí a herních pravidel.
- `npm run typecheck` – kontrola typů.
- `npm run build` – kontrola typů a produkční sestavení do `dist/`.
- `npm run preview` – náhled produkčního sestavení.

## Soubory

- `src/main.ts` – vstup aplikace a úklid při HMR.
- `src/level.ts` – časované formace a části úrovně.
- `src/boss.ts` – pravidla souboje a útoků.
- `src/boss-model.ts` – 3D model a vizuální signalizace.
- `src/start-mode.ts` – omezení vývojového vstupu do souboje.
- `src/game.ts` – herní stav a pravidla bez Three.js.
- `src/collision.ts` – kolizní výpočty ve 2D.
- `src/terrain.ts` – opakované segmenty a stylizovaný stín.
- `src/terrain-layout.ts` – výpočet poloh segmentů.
- `src/scene.ts` – kamera, modely a synchronizace zobrazení.
- `tests/` – testy kolizí, herních pravidel a celé úrovně.
- `src/style.css` – základní styly.
- `index.html` – kontejner scény a nápověda.
