# Fáze 18 – fialový Bastion ze dvou zničitelných dílů

Fialová loď ve čtvrtém levelu byla chybně vykreslená jako jeden sprite,
který se při poškození přepínal na jiný. Dva výřezy z `newsh2.shp.000000.png`
ve skutečnosti nově používáme jako dvě části jednoho trupu za sebou:

| Díl | Výřez (x, y, šířka, výška) | Životy | Poloha vůči středu lodi |
| --- | --- | --- | --- |
| Zadní | 144, 56, 24, 28 | 4 | +1,05 na ose Y |
| Přední | 144, 84, 24, 28 | 3 | −1,05 na ose Y |

Obě části jsou viditelné od příletu a pohybují se společně. Průhledné okraje
sprite buněk se překrývají tak, aby díly navazovaly. Stále jde o jednu loď
s celkovou výdrží sedmi zásahů, ale každý zásah poškozuje konkrétní část.

## Ustřelení dílu

Každá část má vlastní kolizní kruh, životy a časovač záblesku při zásahu.
Při zničení díl exploduje, přestane se vykreslovat a zmizí jeho kolize.
Druhá část zůstane ve hře a lze ji samostatně ustřelit. Lze začít předním
nebo zadním dílem podle místa zásahu.

Jedna střela se spotřebuje na prvním živém dílu, který skutečně zasáhne.
Nemůže odečíst zdraví oběma částem najednou. Pokud jiná střela ve stejném
kroku už přední část zničila, následující střela ji ignoruje a může zasáhnout
zadní díl. Zásahy se vyhodnocují v časovém pořadí podél dráhy střel.

Za první ustřelený díl ještě nejsou body ani bonus. Až po zničení obou
se jednou přidá dosavadních **600 bodů i kreditů** a vydá případný nesený
bonus. Kontakt s hráčem celého Bastiona neodstraní; štít hráče se poškodí
podle běžných pravidel. Zničeným místem trupu už lze proletět bez kontaktu.

## Palba a odlet

Dokud žije přední díl, střelba vychází z něj. Po jeho ustřelení přejde ústí
palby a signalizace přípravy na zbývající zadní díl. Dosavadní počet čtyř
salv a jejich rychlost se nemění. Loď po vyčerpání salv dál odletí; ponechaný
zadní díl se neodstraní předčasně, dokud neopustí obrazovku.

## Implementace a ověření

- `src/enemies.ts`: části trupu, kolize, časovače a poloha ústí palby.
- `src/game.ts`: zásahy jednotlivých dílů, jejich exploze a odměna za celou loď.
- `src/scene.ts`: oba sprity současně, blikání zasažené části a zmizení ustřelené.
- `tests/bastion.test.ts`: obě pořadí ničení, rychlé a současné střely,
  kolize přeživšího dílu, přesun střelby a pauza.

Atlas ani zdrojové obrázky se nemusely měnit: oba výřezy již obsahují.
Prošlo všech **115 testů** a produkční build včetně kontroly TypeScriptu.
V prohlížeči bylo zkontrolováno sestavení obou dílů do jedné lodi.
