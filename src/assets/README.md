# Tyrian FX atlas

`tyrian-fx.png` je připravený RGBA atlas 512 × 512 px (60 snímků).
Vznikl z těchto souborů přidaných do repozitáře:

- `Remastered Tyrian Graphics/newsh6.shp.000000.png`
- `Remastered Tyrian Graphics/newsh(.shp.000000.png`
- `Remastered Tyrian Graphics/tyrian.shp.01673F.png`
- `Remastered Tyrian Graphics/newsh$.shp.000000.png`
- `Remastered Tyrian Graphics/newshi.shp.000000.png`
- `Remastered Tyrian Graphics/newsht.shp.000000.png`
- `Remastered Tyrian Graphics/newsho.shp.000000.png`

Výřezy a animační klipy: `src/sprite-clips.ts`.
Odstraněná barva pozadí: RGB (191, 220, 191), bez odstraňování jiných barev.
Efekty 12 × 14 px a lodě 24 × 28 px mají v atlasových buňkách 32 × 32 px
pevný střed a průhledný okraj. Starší klipy kompenzují zvětšení buňky přes
`referenceCell`, takže jejich velikost ve hře zůstává zachovaná. Dvě varianty
vzducholodi 96 × 140 px mají samostatné oblasti 128 × 160 px dané funkcí
`atlasRegion()`. Boss konvoje má dvě oblasti 160 × 64 px a dvě menší
varianty rozsvícených hlavní. Boss pevnosti z `newsho` má oblast 208 × 144 px
na pozici (256, 256), obsahující výřez 192 × 140 px. Dvě další malé lodě
využívají řádky y = 84 a 112 ze zdroje `newsh$`.

Obnovení: `npm run assets:prepare` (vyžaduje FFmpeg a Node.js 22.18+).
Běžný vývoj a build používají tento připravený soubor, FFmpeg nepotřebují.
Podrobnosti: `faze6.md`, `faze7.md`, `faze8.md`, `faze9.md` , `faze10.md` a `faze11.md` v kořeni projektu.
