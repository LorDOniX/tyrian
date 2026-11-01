# Fáze 16 – jedno až pět děl vedle sebe

Loď začíná s jedním dělem. Každý nákup výzbroje přidá přesně jedno další,
až do maxima **pěti děl**. Všechny střely letí souběžně přímo dopředu;
trvalá vějířová trojstřela byla nahrazena řadou samostatných hlavní.

| Výzbroj | Počet děl | Cena dalšího děla |
| --- | --- | --- |
| Základní | 1 | 5 000 kreditů |
| První vylepšení | 2 | 10 000 kreditů |
| Druhé vylepšení | 3 | 15 000 kreditů |
| Třetí vylepšení | 4 | 20 000 kreditů |
| Maximum | 5 | Další nákup není dostupný |

Hlavně jsou vykreslené na přední části vybraného trupu a jejich poloha
odpovídá místu výstřelů. Jsou rovnoměrně rozmístěné kolem středu lodi
s rozestupem 0,32 herní jednotky. Jeden a tři nebo pět paprsků mají dělo
uprostřed; dva a čtyři jsou rozmístěné symetricky po stranách středu.

Každé dělo vypálí při jedné salvě jednu střelu rychlostí 22 jednotek za
sekundu, bez vodorovné složky pohybu. Kadence všech stupňů je stejná:
jedna salva každých 0,22 sekundy. Nákup tedy přidává dělo, nikoli další
zrychlení palby. Velikost a poškození jednotlivých střel zůstávají zachované.

## Dočasný bonus

> Pozdější [fáze 17](faze17.md) upravuje bonus na jedno dočasné dělo navíc,
> stále s maximem pěti. Následující popis zachycuje původní nastavení fáze 16.

Sbíratelný zbraňový bonus nyní přidává **dvě děla na 12 sekund**, nejvýše
však do pěti. U základní zbraně tedy dočasně střílejí tři děla, u dvou čtyři
a u tří či čtyř pět. Při maximální výzbroji limit zůstává pět.
Další sebraný bonus prodlouží trvání podle dosavadních pravidel, počet
se nesčítá přes maximum. Po vypršení se vrátí zakoupený počet hlavní.

## Hangár a HUD

Hangár ukazuje výzbroj jako stupeň **1 / 5** až **5 / 5**, účinek dalšího
nákupu a správnou cenu. Štít a pancéřování mají nadále tři stupně celkem.
Panel lodi uvádí zakoupený počet děl, informace o zbrani případně navíc
ukazuje počet dočasně aktivních hlavní a zbývající čas bonusu.

Výbava se stále přenáší mezi misemi a při restartu. Pravidla životů a štítů
z fáze 15 se nemění. Vývojový náhled hangáru má nově 50 000 kreditů,
aby šlo vyzkoušet všechny čtyři nákupy výzbroje. Produkční hra tyto
ukázkové kredity nepřidává.

## Kód a ověření

- `src/upgrades.ts`: ceny, počet děl, názvy a společná kadence.
- `src/bonuses.ts`: výpočet symetrických míst výstřelu a dočasného bonusu.
- `src/scene.ts`: viditelné hlavně odpovídající aktuální salvě.
- `src/main.ts`: pět stupňů výzbroje v hangáru a ukazatele počtu děl.

Testy ověřují všech pět stupňů, rovnoběžný let střel, jejich symetrické
rozmístění, rozestupy, dočasný bonus a zablokování nákupu nad maximum.
Prošlo všech **109 testů** a produkční build včetně kontroly TypeScriptu.
V prohlížeči byly ověřeny všechny čtyři nákupy, zablokování dalšího nákupu
a pět souběžných paprsků po přechodu do další mise bez chyb v konzoli.

```sh
npm run dev:shop   # hangár s rozpočtem pro vyzkoušení pěti děl
npm test
npm run build
```
