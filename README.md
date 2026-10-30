# 3D shora

Prototyp vertikální střílečky: 3D modely, ortografická kamera a pohyb ve 2D.
Vysvětlení návrhu a kódu najdeš v [faze1.md](faze1.md).

## Spuštění

```sh
npm install
npm run dev
```

Šipky / WASD: pohyb. Mezerník: střelba. Kamera je pevná.

## Příkazy

- `npm run dev` – vývojový server.
- `npm run typecheck` – kontrola typů.
- `npm run build` – kontrola typů a produkční sestavení do `dist/`.
- `npm run preview` – náhled produkčního sestavení.

## Soubory

- `src/main.ts` – vstup aplikace a úklid při HMR.
- `src/scene.ts` – kamera, model lodi, hvězdy, ovládání a střelba.
- `src/style.css` – základní styly.
- `index.html` – kontejner scény a nápověda.
