# Fáze 20 – první boss z newsh8

Boss na konci prvního levelu nově používá velkou loď ze souboru
`Remastered Tyrian Graphics/newsh8.shp.000000.png`: tu vlevo pod čtyřmi
malými loděmi v horním řádku. Výřez obsahuje celý středový trup i oba
boční bloky s oranžovými výstupy, ne pouze jednu část lodi.

## Sprite a vykreslení

Klip `commanderBoss` v `src/sprite-clips.ts` má jeden snímek o rozměrech
72 × 56 px na zdrojové pozici (0, 28). V atlasu zabírá oblast 96 × 64 px
na pozici (0, 512). Přesné zelené pozadí se při přípravě odstraní jako
u ostatních sprite assetů.

`src/boss-model.ts` nyní vykresluje tento sprite místo původního 3D trupu.
Zůstává příletový štít, bliknutí při zásahu, signalizace přípravy střelby,
barevné rozlišení druhé bojové fáze a zmenšení trupu během závěrečných
explozí. Signály jsou zarovnané s dosavadními místy výstřelů.

Herní pravidla se nemění: boss má 60 životů, tři kolizní kruhy, dvě fáze,
mířenou salvu a vějíř. Za zničení dává 2 000 bodů i kreditů. Následuje
odlet hráče a hangár pro nákup před druhým levelem. Další bossové mají
dosavadní vlastní sprity.

## Rozšíření atlasu

Pro celý větší výřez se atlas rozšířil z 512 × 512 na **512 × 1024 px**.
Obsahuje nyní **119 snímků**. Polohy všech předchozích výřezů zůstávají
zachované; UV souřadnice i náhledy v nabídce lodí vycházejí z aktuálního
rozměru atlasu. Geometrie a textura jsou nadále sdílené.

## Ověření

Prošlo všech **123 testů** a produkční sestavení včetně kontroly TypeScriptu.
Testy atlasu ověřují rozměry, výřezy a nepřekrývající se oblasti; dosavadní
testy prvního bosse a celého prvního levelu nadále procházejí. V prohlížeči
byl zkontrolován nový trup při souboji, střelba a HUD bez chyb v konzoli.

```sh
npm run dev -- --mode boss   # přímo k prvnímu bossovi
npm run assets:prepare
npm test
npm run build
```
