# Fáze 17 – sprite kanóny a jedno dočasné dělo navíc

## Pozemní kanóny ze souboru newshs

Pozemní věže ve všech misích používají sprity z
`Remastered Tyrian Graphics/newshs.shp.000000.png`.
Původní 3D hlavu a hlaveň nahrazuje otočná sprite věž, pod níž je pevná
sprite základna. Zůstává míření na hráče, signalizace přípravy výstřelu,
bliknutí při zásahu, exploze i dosavadní pravidla poškození.

Zdrojové výřezy mají rozměry 24 × 28 px:

| Část | x | y |
| --- | --- | --- |
| Hlava v klidu | 192 | 56 |
| Rozsvícená hlava | 192 | 84 |
| Pevná základna | 0 | 196 |

Klipy `groundCannon` a `groundCannonBase` jsou ve `src/sprite-clips.ts`.
Otočná část má vlastní pivot; základna se při míření neotáčí. Střed hlavy
je posunut tak, aby její poloha odpovídala základně a dosavadnímu ústí
hlavně vzdálenému 1,05 jednotky od středu věže. Podklad se vykresluje nad
terénem, kanón pod létajícími loděmi a střelami. Přepínač terénu kanóny
neskrývá, protože patří k herním cílům.

Nové snímky používají stávající sdílený atlas 512 × 512 px, který má nyní
110 snímků. Byl znovu připraven příkazem `npm run assets:prepare`.
Herní logika věží, kolizní poloměr, dva body zdraví a odměna 200 bodů se nemění.

## Bonus na mapě přidává jedno dělo

Sbíratelný zbraňový bonus nyní přidává **jedno dělo na 12 sekund**, nejvýše
však do pěti. Chová se tedy jako dočasný další stupeň zakoupené výzbroje:

| Zakoupená děla | Děla během bonusu | Po vypršení |
| --- | --- | --- |
| 1 | 2 | 1 |
| 2 | 3 | 2 |
| 3 | 4 | 3 |
| 4 | 5 | 4 |
| 5 | 5 | 5 |

Všechny střely stále letí rovnoběžně dopředu, hlaveň navíc je také vidět
na lodi. Změna nepřidává trvalý nákup a neodečítá kredity. Další bonus
obnoví dobu trvání na 12 sekund, počet děl se přes limit nesčítá.
Po vypršení se vždy vrací skutečně zakoupená výzbroj.

Počet aktivních děl určuje `weaponGunCount()` v `src/upgrades.ts`;
výpočet je společný pro střelbu, vykreslení hlavní i HUD. Nápověda a zpráva
po sebrání uvádějí **+1 dělo**.

## Ověření

Prošlo všech **109 testů** a produkční build včetně kontroly TypeScriptu.
Testy bonusu ověřují všech pět zakoupených stupňů, přidání jednoho děla,
limit pěti a návrat na zakoupený počet po vypršení. Testy atlasu ověřují
platné výřezy a nepřekrývající se oblasti. V prohlížeči byl ověřen kanón
na mapě, jeho natočení směrem k hráči a nové označení bonusu bez chyb v konzoli.
