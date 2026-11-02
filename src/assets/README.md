# Tyrian FX atlas

`tyrian-fx.png` je připravený RGBA atlas 512 × 1024 px (124 snímků).
Vznikl z těchto souborů přidaných do repozitáře:

- `Remastered Tyrian Graphics/newsh6.shp.000000.png`
- `Remastered Tyrian Graphics/newsh(.shp.000000.png`
- `Remastered Tyrian Graphics/tyrian.shp.01673F.png`
- `Remastered Tyrian Graphics/tyrian.shp.007D3C.png`
- `Remastered Tyrian Graphics/newsh$.shp.000000.png`
- `Remastered Tyrian Graphics/newshi.shp.000000.png`
- `Remastered Tyrian Graphics/newsht.shp.000000.png`
- `Remastered Tyrian Graphics/newsho.shp.000000.png`
- `Remastered Tyrian Graphics/newsh2.shp.000000.png`
- `Remastered Tyrian Graphics/newsh4.shp.000000.png`
- `Remastered Tyrian Graphics/newshs.shp.000000.png`
- `Remastered Tyrian Graphics/newshd.shp.000000.png`
- `Remastered Tyrian Graphics/newsh8.shp.000000.png`

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

Sedm vzhledů hráče je popsáno v `src/player-ships.ts`: šest trupů s náklony
(včetně patnácti snímků vidlice) a široká delta s jedním snímkem. Celkem
41 nových snímků používá spodní řady atlasu od y = 416; delta má buňku 64 × 32 px.
První stříbrný trup je výchozí. Efekty, projektily a malé komponenty na zdrojovém
listu nejsou samostatné lodě. Původní 3D trup hráče nahrazují sprite modely,
3D terén a ortografická kamera zůstávají.

Čtvrtá mise používá čtyři snímky tří nepřátel z `newsh2` a dva celé trupy
bosse z `newsh4`. Boss má výřezy (108, 0, 120, 112) a (108, 112, 120, 112),
umístěné v atlasu do oblastí 128 × 128 px na (0, 288) a (128, 288).
List `newsh4` má v levém horním rohu kresbu, proto se klíč pozadí bere
z konstanty `TYRIAN_BACKGROUND` v `scripts/sprite-pixels.ts`, nikoli z prvního
pixelu obrázku. Hnědé části trupu tak zůstávají zachované a zelené pozadí
včetně otvoru v těle bosse je průhledné. Podrobnosti jsou ve `faze14.md`.

Původní průhledný střed bosse z `newsh4` nyní ve hře překrývá pancéřový
panel z `src/dreadnought-boss-model.ts`. Doplněný kolizní kruh zahrnuje i
tuto část trupu; výplň funguje v obou variantách spritu.

Pozemní kanóny používají `newshs`: otočná hlava má výřezy
(192, 56, 24, 28) a (192, 84, 24, 28), pevná základna (0, 196, 24, 28).
Přibyly klipy `groundCannon` a `groundCannonBase`, celkem tři snímky.
Při přípravě výstřelu se použije rozsvícená varianta hlavy. Více ve `faze17.md`.

Dva snímky `bastionShip` z `newsh2` jsou dvě části téhož trupu, nikoli
varianty poškození. Ve hře se vykreslují současně za sebou a každý díl
má vlastní zdraví; detaily jsou ve `faze18.md`.

List `newshd` přidává dva typy dvojitých kanónů (`twinSteelCannon`,
`twinGoldCannon`, po třech snímcích) a dva padající kameny (`smallRock`,
`largeRock`, po jednom snímku). Kanóny používají spodní volné buňky
od (320, 480), kameny buňky (480, 192) a (416, 224). Tyto výřezy zůstávají v horních 512 řádcích atlasu. Výřezy a pravidla popisuje `faze19.md`.

První boss používá klip `commanderBoss` ze zdroje `newsh8`: celý výřez
(0, 28, 72, 56), tedy velkou loď pod horní čtveřicí malých lodí vlevo.
Má oblast 96 × 64 px na (0, 512). Kvůli ní atlas narostl na 512 × 1024 px;
polohy předchozích výřezů zůstávají stejné a normalizované UV se přepočítají
podle nového rozměru. Více ve `faze20.md`.

Pátý level používá `newshf.shp.000000.png`:
- Rudý maršál: celý trup `(0, 112, 144, 112)`, index 119.
- Falcon: tři šedá letadla `(96/120/144, 0, 24, 28)`, indexy 120–122.
- Emerald: zelené letadlo `(192, 0, 24, 28)`, index 123.

Mraky vznikají procedurálně v `clouds.ts` pomocí CanvasTexture; nevyžadují
externí texturu ani úpravu původních assetů.
