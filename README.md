# 3D shora

Prototyp vertikální střílečky: 3D modely, ortografická kamera a pohyb ve 2D.
Základ vykreslování vysvětluje [faze1.md](faze1.md), nepřátele a herní pravidla
[faze2.md](faze2.md). Fáze 3 přidává [první úroveň](faze3.md): pevné vlny, střelce s mířenými
střelami a vítězství. Zachovává 3 životy, skóre, pauzu a restart.

## Spuštění

```sh
npm install
npm run dev
```

Šipky / WASD: pohyb. Mezerník: střelba. Esc: pauza. Enter: pokračování / restart.
Kamera je pevná. Při opuštění okna se hra pozastaví. Kolizní kruhy lze zapnout
zaškrtávátkem. Ovládání je zatím pouze klávesnicí.

Pro testy používej Node.js 22.18+ (nebo novější podporovanou řadu).

## Příkazy

- `npm run dev` – vývojový server.
- `npm test` – testy kolizí a herních pravidel.
- `npm run typecheck` – kontrola typů.
- `npm run build` – kontrola typů a produkční sestavení do `dist/`.
- `npm run preview` – náhled produkčního sestavení.

## Soubory

- `src/main.ts` – vstup aplikace a úklid při HMR.
- `src/level.ts` – časované formace a části úrovně.
- `src/game.ts` – herní stav a pravidla bez Three.js.
- `src/collision.ts` – kolizní výpočty ve 2D.
- `src/scene.ts` – kamera, modely a synchronizace zobrazení.
- `tests/` – testy kolizí, herních pravidel a celé úrovně.
- `src/style.css` – základní styly.
- `index.html` – kontejner scény a nápověda.
