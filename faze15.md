# Fáze 15 – štít pro každý život a uzavřený trup bosse

Tato úprava mění pravidla ochrany z fáze 13 a opravuje otvor uprostřed
bosse čtvrtého levelu.

## Štíty patří k jednotlivým životům

Každý život lodi má vlastní plný štít. Základní kapacita je 6 bodů,
po zakoupení vylepšení 9 nebo 12. Zásah ubere jeden bod štítu.

**Zásah, který vyčerpá poslední bod štítu, okamžitě odebere jeden život.**
Pokud další život zbývá, štít se ihned obnoví na aktuální maximum podle
výbavy. Pokud byl život poslední, štít zůstane nulový a nastane konec hry.

Příklad se základní lodí:

| Situace | Životy | Štít |
| --- | --- | --- |
| Začátek mise | 3 | 6 / 6 |
| Po pěti zásazích | 3 | 1 / 6 |
| Šestý zásah | 2 | 6 / 6 |
| Po dalších šesti zásazích | 1 | 6 / 6 |
| Vyčerpání posledního štítu | 0 | 0 / 6 – konec hry |

Mezi poškozujícími zásahy stále platí sekundová ochranná doba. Díky tomu
současné projektily nebo trvající kontakt neuberou opakovaně obnovený štít
v témže okamžiku. Průběžná regenerace po čase byla odstraněna, včetně jejího
časovače a hlášení v HUD. Při částečně vyčerpaném štítu panel uvádí
„Obnova při ztrátě života“.

Oprava nadále přidává jeden život až do zakoupeného maxima trupu; aktuální
štít přitom nedoplňuje. Po prohře ani po ztrátě posledního života už nemůže
oprava loď oživit. Nová mise a restart začínají s plným štítem a životy podle
zakoupené výbavy. Pravidla jsou v `src/game.ts`.

## Pancíř uprostřed Stínového vládce

Původní sprite čtvrtého bosse obsahoval průhledný otvor v horní části trupu.
`src/dreadnought-boss-model.ts` jej nyní vyplňuje kovovým panelem s obrysem,
příčnými výztuhami a drobnými spoji, vykresleným pod původním spritem.
Výplň se pohybuje společně s bossem a funguje pro nepoškozenou i poškozenou
variantu. Při zásahu bliká s trupem a při zničení s ním zaniká.

Střed zároveň dostal další kolizní kruh v `src/dreadnought-boss.ts`.
Boss tak má devět kruhů a střely už nově uzavřenou částí neprocházejí.
Zásah více překrývajících se kruhů stále ubere jen jeden bod zdraví za střelu.
Počet životů, odměna a vzory bossových útoků zůstávají zachované.

## Ověření

Prošlo všech **109 testů** a produkční sestavení včetně kontroly TypeScriptu.
Testy ověřují celý cyklus tří životů, okamžité doplnění štítu, kapacity
6/9/12, ochranu po zásahu, absenci regenerace časem, konec hry a kolizi
nového pancíře. V prohlížeči byl zkontrolován vyplněný trup bosse a nové
hlášení panelu při poškození štítu.
