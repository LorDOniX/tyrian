# Fáze 12 – odlet po misi, výběr lodí a úpravy animací

Tato fáze shrnuje změny po [fázi 11](faze11.md): závěrečný odlet ve všech
třech levelech, sprite vzhledy hráčovy lodi, menší sbíratelné bonusy a opravu
animace oranžových nepřátel ve třetím levelu.

## 1. Závěrečný odlet ve stylu Tyrianu

Po zničení bosse nejprve doběhne jeho série explozí. Potom loď hráče
automaticky zrychlí směrem nahoru a vyletí za horní okraj obrazovky.
Výsledek mise se zobrazí až po dokončení odletu. Platí to pro všechny tři levely.

Herní stav v `src/game.ts` má novou část mise `departing`. Funkce
`beginLevelDeparture()` uloží počáteční výšku lodi a vynuluje čas odletu.
Odstraní zbývající projektily i bonusy a vypne blikání z dočasné ochrany hráče.

Odlet trvá **2,2 sekundy**. Pro jeho průběh používáme vztah:

```ts
progress = elapsed / DEPARTURE_DURATION;
y = startY + (DEPARTURE_END_Y - startY) * progress * progress;
```

Kvadratický průběh znamená pozvolný rozjezd a postupné zrychlování. Cílová
výška je `18`, tedy šest jednotek nad horní hranou herní plochy. Díky tomu
zmizí také prodloužený plamen motoru. Poloha se počítá z uplynulého času,
takže výsledek nezávisí na počtu vykreslených snímků.

Během odletu se nepoužívají běžné hranice pohybu, ovládání, střelba ani kolize.
Terén se dál posouvá, loď postupně srovná náklon a pauza stále funguje.
Po odletu se nastaví `victory`; Enter pak přejde do dalšího levelu, případně
po posledním levelu zopakuje aktuální misi podle dosavadních pravidel.

V `src/scene.ts` se při odletu zesílí a prodlouží modrý plamen motoru
s bílým jádrem. Efekt funguje i se všemi novými sprite vzhledy hráče.
Ve vývojovém režimu jej lze samostatně vyzkoušet tlačítkem **Debug: odlet**.

## 2. Výběr vzhledu hráčovy lodi

Původní 3D trup hráče nahrazují sprity ze souboru
`Remastered Tyrian Graphics/tyrian.shp.007D3C.png`.
Tlačítko **Loď: …** otevře nabídku s náhledy všech sedmi trupů:

| Pořadí | Vzhled | Počet snímků |
| --- | --- | --- |
| 1 | Stříbrná – výchozí | 5 |
| 2 | Mrkev | 5 |
| 3 | Obrněná | 5 |
| 4 | Půlměsíc | 5 |
| 5 | Zlatá | 5 |
| 6 | Vidlice | 15 |
| 7 | Delta | 1 |

Názvy popisují vzhledy v této hře. Efekty motorů, projektily a drobné
komponenty na stejném zdrojovém listu nejsou samostatné lodě.

Definice výřezů, pořadí nabídky a výchozí vzhled jsou v `src/player-ships.ts`.
Funkce `playerShipPose()` převádí náklon lodi na snímek: při letu rovně
použije prostřední snímek a při pohybu do stran odpovídající náklon.
Delta má jediný snímek, a proto její sprite při zatáčení zůstává stejný.

Výběr mění pouze vykreslení. Všechny lodě mají stejné životy, rychlost,
zbraně a kolizní kruh. Zvolený vzhled se v `src/main.ts` uchovává mimo stav
mise, takže přetrvá restart, přechod mezi levely i vývojové přeskakování misí.
Po obnovení stránky se znovu použije první stříbrná loď.

Nabídka během výběru pozastaví hru. Po zavření pokračuje pouze tehdy,
pokud před otevřením běžela; původně pozastavená nebo ukončená hra zůstane
ve svém stavu. Nabídka má označenou aktuální volbu a lze ji zavřít i klávesou Esc.

### Rozšíření atlasu

Nové lodě přidávají **41 snímků**. Sdílený atlas zůstává velký
512 × 512 px a celkem nyní obsahuje **101 snímků**. Hráčovy lodě používají
volné spodní řady od `y = 416`; běžné snímky mají buňky 32 × 32 px,
široká delta buňku 64 × 32 px. Výřezy a UV souřadnice propojuje
`src/sprite-clips.ts`.

Atlas se obnovuje přes `npm run assets:prepare`, který vyžaduje FFmpeg.
Při běžném spuštění a sestavení se používá připravený
`src/assets/tyrian-fx.png`. Přesná zelená barva pozadí RGB (191, 220, 191)
se při přípravě zprůhlední, obrysy lodí zůstávají zachované.

## 3. Menší sbíratelné diamanty

Bonusy pro trojstřelu i opravu jsou zmenšené o **25 %**.
Konstanta `PICKUP_SCALE = 0.75` v `src/bonuses.ts` se používá při vykreslení
celé skupiny bonusu, takže se současně zmenší sprite i jeho rozlišovací symbol.
Jemné pulzování velikosti zůstává zachované.

Stejným poměrem je zmenšená sběrná oblast: poloměr se změnil
z `0.55` na `0.4125`. Vizuální velikost a oblast sběru tak odpovídají sobě.
Rychlost pohybu bonusu, délka trojstřely i účinek opravy zůstávají stejné.

## 4. Plynulé otáčení oranžových kapiček

První trojice nepřátel ve třetím levelu je typ `weaver`. Původně se při
kličkování přepínaly jeho sprite snímky podle směru vodorovného pohybu.
Při změně směru to působilo jako skok animace.

`enemySpritePose()` v `src/enemies.ts` nyní pro tento typ vrací stále
prostřední snímek. `src/scene.ts` místo přepínání plynule otáčí pouze
sprite kolem jeho středu:

```ts
icon.rotation.z = Math.PI + (enemy.age ?? 0) * 2.5;
```

Rychlost otáčení je **2,5 radiánu za sekundu**, přibližně jedna otáčka
za 2,51 sekundy. Vychází ze stáří konkrétního nepřítele, takže během pauzy
stojí. Otáčení nezávisí na změnách směru kličkování. Pohyb, mířená střelba,
životy a kolize nepřítele zůstávají stejné. Změna platí pro všechny další
výskyty tohoto typu, nejen pro úvodní trojici.

## Ověření

Při dokončení těchto změn prošlo **90 testů** a produkční sestavení
včetně kontroly TypeScriptu. Testy odletu v `tests/departure.test.ts`
pokrývají všechny tři levely, zrychlení, ignorování ovládání, pauzu,
zablokování předčasného přechodu a vyčištění stavu při restartu.
Dosavadní testy zničení bossů byly upravené tak, aby vyčkaly i na odlet.

V prohlížeči byl ověřen výchozí vzhled, nabídka sedmi lodí, změna spritu,
zachování volby po restartu a odlet s vybranou lodí. Pozdější zmenšení bonusů
a otáčení kapiček prošly testy i sestavením.

```sh
npm run dev:level3   # úvodní oranžoví nepřátelé
npm run dev:boss3    # souboj s posledním bossem
npm test
npm run build
```

Pro rychlou kontrolu vzhledů slouží nabídka **Loď: …**; pro kontrolu odletu
vývojové tlačítko **Debug: odlet**.
