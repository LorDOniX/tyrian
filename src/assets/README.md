# Tyrian FX atlas

`tyrian-fx.png` je připravený RGBA atlas 512 × 128 px (47 snímků).
Vznikl z těchto souborů přidaných do repozitáře:

- `Remastered Tyrian Graphics/newsh6.shp.000000.png`
- `Remastered Tyrian Graphics/newsh(.shp.000000.png`
- `Remastered Tyrian Graphics/tyrian.shp.01673F.png`
- `Remastered Tyrian Graphics/newsh$.shp.000000.png`

Výřezy a animační klipy: `src/sprite-clips.ts`.
Odstraněná barva pozadí: RGB (191, 220, 191), bez odstraňování jiných barev.
Efekty 12 × 14 px a lodě 24 × 28 px mají v atlasových buňkách 32 × 32 px
pevný střed a průhledný okraj. Starší klipy kompenzují zvětšení buňky přes
`referenceCell`, takže jejich velikost ve hře zůstává zachovaná.

Obnovení: `npm run assets:prepare` (vyžaduje FFmpeg a Node.js 22.18+).
Běžný vývoj a build používají tento připravený soubor, FFmpeg nepotřebují.
Podrobnosti: `faze6.md`, `faze7.md` a `faze8.md` v kořeni projektu.
