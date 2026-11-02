# Fáze 21 – Rudé nebe: pátá mise a mraky

Po dokončení čtvrté mise hráč nakoupí v hangáru a pokračuje do páté.
Rudé nebe má 68 sekund formací, 41 letadel, žádné pozemní kanony a závěrečného
bosse. Nákupy, skóre a kredity pokračují dál, nová mise obnoví životy a štíty.
Po zničení posledního bosse následuje exploze, odlet vzhůru a dokončení kampaně.

## Letadla z newshf.shp.000000.png

- **Falcon**: šedá stíhačka, 4 HP, 450 bodů. Kličkuje během průletu,
  třikrát vystřelí mířenou trojici. Tři snímky reagují na směr pohybu.
- **Emerald**: zelený doprovod, 6 HP, 650 bodů. Zastaví se nahoře,
  vyšle tři čtyřstřelové vějíře se střídavým úhlem a odletí dolů.

Formace postupně kombinují oba typy. Vybrané lodě nesou dočasné další dělo
nebo opravu. Zničení před výstřelem zruší připravenou salvu stejně jako dříve.

## Rudý maršál

Velký červený letoun je celý výřez `(0, 112, 144, 112)` ze stejného souboru.
Má 180 HP, čtyři kolizní kruhy pro trup a křídla a odměnu 12 500 bodů/kreditů.
Při příletu má ochranu. Střídá párové mířené salvy z křídel, vějířovou mříž
a otáčející se radiální salvy. Mezi útoky mění pozici a před střelbou rozsvítí
zbraně. Pod polovinou zdraví přejde po dokončení salvy a odpočinku do rychlejší
fáze. Nepoužívá vymyšlený poškozený sprite: zásahy signalizuje blikání.

## Jak fungují mraky

`cloud-layout.ts` počítá čtyři opakované pásy mraků z `scrollDistance`.
Mraky jedou dolů rychlostí 1,12násobku pozadí. Souřadnice se přetáčejí až mimo
obrazovku, takže mrak při návratu neposkočí uprostřed plochy. Nezávisí na hodinách
prohlížeče: pauza je zastaví a restart vrátí původní rozmístění.

`clouds.ts` složí jednu sdílenou texturu z měkkých kruhových gradientů přes Canvas.
Střed je hustý a okraje průhledné. Čtyři plochy sdílejí texturu, materiál i geometrii.
Vrstva používá `renderOrder = 8`: nepřátelé a boss se vykreslí před ní, takže
za mrakem zmizí; hráč, bonusy a všechny projektily se kreslí potom. Překrytí je
vizuální: skrytá letadla stále střílejí, lze je zasáhnout a mohou narazit do hráče.
Kolizní debug zůstává nad mraky. Mraky jsou aktivní pouze v páté misi a fungují
i při vypnutí terénu. Vlastní grafické prostředky se při ukončení scény uvolní.

## Spuštění a ověření

- `npm run dev:level5` – celá mise.
- `npm run dev:boss5` – přímý souboj s Rudým maršálem.
- Stejné možnosti jsou ve vývojových tlačítkách, produkce začíná první misí.

Testy kontrolují nové formace a útoky, fáze bosse, přenos výbavy z levelu 4,
průchod celé mise až po odlet a konec kampaně, pohyb a pauzu mraků i atlas.
Simulace celé mise chrání hráče před poškozením, boss dostává běžné střely;
nejde o automatické posouzení obtížnosti. Vzhled letadel, překrytí mraky a boss
jsou ověřeny také v prohlížeči.
