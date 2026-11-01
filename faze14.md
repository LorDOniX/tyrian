# Fáze 14 – Slévárna stínů a dražší vylepšení

Kampaň nově obsahuje čtyři mise. Po vítězství ve třetí lze v hangáru nakoupit
výbavu a klávesou Enter pokračovat do čtvrté. Přenesou se zakoupená vylepšení,
skóre a nevyužité kredity; ochrana lodi se doplní podle její aktuální výbavy.
Konec kampaně se zobrazí až po poražení čtvrtého bosse a závěrečném odletu.

## Ceny v hangáru × 2

| Vylepšení | První nákup | Druhý nákup |
| --- | --- | --- |
| Výzbroj | 5 000 kreditů | 10 000 kreditů |
| Generátor štítu | 4 000 kreditů | 8 000 kreditů |
| Pancéřování | 5 000 kreditů | 10 000 kreditů |

Všechny ceny v `src/upgrades.ts` jsou přesně dvojnásobné proti fázi 13.
Účinky zakoupené výbavy, obnova štítu a odměny za starší nepřátele se nemění.
Při neúspěchu se skóre i peníze stále vracejí na checkpoint začátku mise.

## Čtvrtý level

> [Fáze 19](faze19.md) později přidává k původním vlnám 15 padajících kamenů
> a rozšiřuje počet pozemních věží z pěti na devět.

**Slévárna stínů** má 64 sekund časovaných vln, **39 nepřátel** a **pět
pozemních věží**. První část představuje hlídky, druhá kombinuje rotující
salvy a mířené útoky, poslední část obrannou linii obrněnců a průletových lodí.
Mise používá vlastní fialový terén s oranžovým značením.

Vlny se překrývají, nové lodě mají více životů a rychlejší či hustší palbu
než úvodní nepřátelé. Každý střelec ale má omezený počet salv a nakonec
odletí. Vyčkání na konec časovače nestačí: před příchodem bosse se musí vyřešit
zbývající lodě, věže a nepřátelské projektily. Některé vlny nesou opravu
nebo dočasnou trojstřelu.

### Noví nepřátelé z newsh2

Zdroj je `Remastered Tyrian Graphics/newsh2.shp.000000.png`.
Výřezy udávají souřadnice od levého horního rohu obrázku.

| Typ | Výřez (x, y, šířka, výška) | Životy | Útok | Odměna |
| --- | --- | --- | --- | --- |
| Wraith – modrá průletová loď | 96, 56, 48, 28 | 4 | Tři mířené vějíře po třech střelách | 450 |
| Bastion – fialový obrněnec | 144, 56, 24, 28 | 7 | Čtyři vějíře po pěti střelách | 600 |
| Rotor – rotační dron | 0, 168, 24, 28 | 3 | Tři kruhové salvy po šesti střelách | 350 |

Wraith kličkuje během sestupu a střílí za letu. Jeho střely mají rychlost 7.
Bastion se zastaví v horní části obrazovky; střídá vějíře posunuté o 10 stupňů
s rychlostí střel 6,3. Oba jeho sprity tvoří zadní a přední díl, každý se
samostatným zdravím a možností ustřelení; opravu popisuje [fáze 18](faze18.md). Rotor se plynule otáčí a další kruhovou salvu
pootočí o 30 stupňů; rychlost střel je 5,5.

Nové lodě už v předloze směřují dolů. Nemají převzaté přepínání snímků
náklonu starších lodí; používají stabilní trup, poškozenou variantu nebo plynulé
otáčení podle typu. Pravidla jsou v `src/enemies.ts`, vlny v `src/level.ts`.

## Boss z newsh4 – Stínový vládce

Boss používá dva trupy ze souboru `newsh4.shp.000000.png`:

- nepoškozený: (108, 0, 120, 112);
- poškozený: (108, 112, 120, 112).

Má **150 životů**, devět kolizních kruhů a přilétá pod dočasným štítem.
Kolizní kruhy sledují tělo, ramena a středový pancíř. Původní otvor
byl následně uzavřen ve [fázi 15](faze15.md). Po poklesu na 75 životů se zobrazí poškozený vzhled.
Přechod do rychlejší druhé fáze počká na konec aktuální salvy a odpočinku.

Boss střídá tři vzory:

1. **Kleště:** obě ramena míří na polohu hráče zaznamenanou při zahájení salvy.
   Střídavě pootočené dvojice svírají tuto polohu; vypálené střely hráče dál
   nesledují. V první fázi jsou čtyři dvojice, ve druhé šest, po 0,2 sekundy.
2. **Mříž:** sedmistřelový vějíř s další salvou posunutou o 9 stupňů.
   První fáze vypálí dvě salvy, druhá tři; rozestup je 0,38 sekundy.
3. **Šroubovice:** pootočené kruhové pulzy. První fáze má tři pulzy po osmi
   střelách, druhá čtyři po deseti; další pulz pootočí mezery o 17 stupňů.

Rychlost hlavních útoků stoupne z 6,4 na 7,4; kruhové pulzy jsou o 1,2
pomalejší. Příprava se zkrátí z 0,85 na 0,6 sekundy a odpočinek z 1 na 0,75
sekundy. Mezi útoky boss přelétává mezi vodorovnými pozicemi −3, 3 a 0.
Signalizace na hlavních upozorňuje na přípravu střelby a změnu fáze.

Zničení přidá jednou **10 000 bodů i kreditů**, odstraní nepřátelské projektily
a zruší chystané výstřely. Následuje série explozí, odlet hráčovy lodi a hangár
na konci kampaně. Poslední misi lze zopakovat s nakoupenou výbavou.

Pravidla jsou v `src/dreadnought-boss.ts`, vzhled a signalizace
v `src/dreadnought-boss-model.ts`. První tři bossové zůstávají zachovaní.

## Atlas a průhlednost

Atlas má stále 512 × 512 px, nově **107 snímků**. Nové malé lodě vyplňují
volná místa vedle velkých trupů, dvě varianty bosse mají samostatné oblasti
128 × 128 px. Rozmístění všech klipů se ověřuje proti překryvům.

U `newsh4` není první pixel obrázku barvou pozadí: roh překrývá kresba.
Příprava proto používá explicitní `TYRIAN_BACKGROUND = [191, 220, 191]`.
Zelené pozadí se odstraní a hnědé části lodí zůstanou zachované. Změna je
v `scripts/prepare-sprites.ts` a `scripts/sprite-pixels.ts`.

## Spuštění a ověření

```sh
npm run dev:level4   # čtvrtá mise od začátku
npm run dev:boss4    # přímo před Stínovým vládcem
npm run assets:prepare
npm test
npm run build
```

Ve vývoji jsou také tlačítka pro start čtvrtého levelu a jeho bosse.
Produkční hra vždy začíná prvním levelem. Přímé debug starty používají
základní loď; během běžné kampaně se výbava přenáší z předchozího hangáru.

Prošlo **109 testů** a produkční build včetně kontroly TypeScriptu. Nové testy
pokrývají ceny, návaznost čtvrtého levelu, střelbu a konečný odlet nových
nepřátel, kolize a útoky bosse, změnu fáze, jednorázovou odměnu a celý průchod
misí včetně závěrečného odletu. Test průchodu chrání hráče před zásahy,
aby ověřil konečnost mise; obtížnost je určená k dalšímu ladění hraním.
V prohlížeči byly ověřeny nové sprity, palba bosse, HUD a ceny hangáru
bez chyb v konzoli.
