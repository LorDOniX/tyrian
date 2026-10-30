# Fáze 1: 3D vykreslení, které se hraje jako 2D

Cílem je základ vertikální vesmírné střílečky inspirované stylem Tyrianu:
loď vidíš shora, létáš doleva, doprava, nahoru a dolů a okolí ubíhá dolů.
Použijeme vlastní jednoduché 3D objekty. Nejde o rekonstrukci původního enginu ani grafiky Tyrianu.

## 1. Nejdůležitější rozdělení: pravidla hry a vykreslení

**Pravidla hry jsou dvourozměrná, obraz vytváří 3D renderer.**
Loď potřebuje pro pohyb jen dvě čísla: `x` a `y`. Její model ale má také
hloubku `z`, materiál, osvětlení a může se naklánět.
Takovému spojení se často říká 2.5D.

Three.js předá geometrii, materiály a kameru grafické kartě. Ta promítne
vrcholy modelů na obrazovku, vyplní trojúhelníky a vypočítá výsledné barvy.
Hloubkový buffer rozhoduje, které povrchy zakrývají jiné. Nemusíme ručně
kreslit každý pixel ani řadit všechny části lodi jako 2D obrázky.

Tok jednoho snímku:

```text
klávesnice → směr → změna souřadnic podle času
                       ↓
             aktualizace střel a hvězd
                       ↓
          renderer.render(scene, camera) → obraz
```

## 2. Souřadnice: vybrali jsme rovinu XY

V `src/scene.ts` používáme následující dohodu:

```text
             +Y (dopředu / horní okraj)
              ↑
              |
   -X ←────── 0 ──────→ +X
              |
              ↓
             -Y (dolní okraj)

+Z míří z obrazovky ke kameře, -Z do pozadí.
```

Loď je kolem `z = 0`. Hvězdy jsou v `z = -8` a `z = -5`.
Kamera je v `(0, 0, 30)` a dívá se do počátku.
„Shora“ zde znamená shora na herní plochu XY. Nemusíme nutně použít
zemní rovinu XZ, kterou měla původní ukázka s kostkou.
Tato volba nám umožní používat `y` jako směr nahoru na obrazovce.

Jedna světová jednotka není jeden pixel. Herní plocha má 18 × 24 jednotek.
Loď letící rychlostí 9 jednotek za sekundu přejede její šířku přibližně za dvě sekundy.

## 3. Proč ortografická kamera

Perspektivní kamera zmenšuje vzdálenější objekty a sbíhá rovnoběžky.
Pro pevně vymezenou 2D herní plochu jsme vybrali `OrthographicCamera`.
Ta používá rovnoběžné promítání: samotná vzdálenost od kamery nemění
velikost objektu na obrazovce.

```ts
const camera = new THREE.OrthographicCamera(-9, 9, 12, -12, 0.1, 100);
camera.position.set(0, 0, 30);
camera.lookAt(0, 0, 0);
```

První čtyři parametry určují levý, pravý, horní a dolní okraj záběru.
Poslední dva určují vzdálenosti ořezových rovin od kamery.
Objekty mimo tento objem kamera nevykreslí.

**Ortografická kamera nezruší třetí rozměr.** Kabina pořád vystupuje
nad trup, světlo reaguje na natočení povrchů a při bočním pohybu je vidět
náklon lodi. Pouze se neprojevuje perspektivní zmenšování.

Při změně velikosti okna zachováváme celý výřez 18 × 24 i jeho poměr 3:4.
`resize()` spočítá měřítko a přes `renderer.setViewport()` vycentruje obraz.
Kolem něj zůstanou pruhy pozadí. Díky tomu má hráč na širokém i úzkém okně
stejné množství herního prostoru a modely nejsou roztažené.

## 4. Z čeho se skládá loď

`ship` je `THREE.Group`: společný rodič několika modelů.
Trup je kužel, křídla kvádr, kabina koule a plamen další kužel.
Každý `Mesh` spojuje:

- **Geometry**: vrcholy a trojúhelníky, tedy tvar.
- **Material**: barvu a způsob reakce na světlo.
- **Transformaci**: pozici, natočení a měřítko.

Pozice částí jsou místní souřadnice vůči skupině. Změna `ship.position`
posune celou loď. `ship.rotation.y` nakloní celý model, aniž bychom měnili
pravidla pohybu. Kabina v místním `z = 0.4` leží blíž ke kameře než trup.

`MeshStandardMaterial` potřebuje světlo. Používáme okolní světlo, aby
stíny nebyly úplně černé, a směrové světlo, aby byl patrný objem.
Střely a plamen mají `MeshBasicMaterial`, který světlo nepotřebuje.
V této fázi nepočítáme vržené stíny ani efekty bloom.

## 5. Plynulý pohyb a čas

Události klávesnice pouze ukládají stisknuté klávesy do `Set`.
Pohyb se počítá ve smyčce, takže nezávisí na opakování kláves operačním systémem.

```ts
nováPozice = původníPozice + směr * rychlost * dt;
```

`dt` je čas od minulého snímku v sekundách. Při 60 FPS je asi `1 / 60`.
Bez něj by pohyb závisel na rychlosti monitoru. Limit `0.05` zabrání velkému
skoku například po návratu z neaktivní záložky; při dlouhém snímku tedy
záměrně část času zahodíme. Pro první prototyp je to jednoduchá ochrana,
pro složitější fyziku lze později použít pevný simulační krok.

Směr diagonálního pohybu normalizujeme, aby loď šikmo nelétala rychleji.
`clamp()` omezuje její střed tak, aby se model vešel do herní plochy.
Při ztrátě zaměření nebo změně viditelnosti mažeme klávesy, aby loď
nezůstala letět kvůli ztracené události `keyup`.

## 6. Jak vzniká dojem letu

Kamera zůstává stát. Loď se pohybuje jen uvnitř obrazovky a hvězdy se
posouvají dolů. Hvězda za spodním okrajem se vrátí nad horní okraj.
Nemusíme tak vytvářet nekonečně velký svět.

Máme dvě vrstvy s různou rychlostí. Pomalejší vrstva působí vzdáleněji.
U ortografické kamery samotné rozdílné `z` tento pohybový efekt nevytvoří:
paralaxu zde programujeme pomocí různých rychlostí. Později stejný princip
použijeme pro terén, budovy nebo mraky.

Hvězdy jsou `THREE.Points`: každá vrstva používá jednu geometrii s mnoha body.
Po změně pole souřadnic nastavíme `needsUpdate`, aby se data přenesla na GPU.

## 7. Střelba jako první další herní objekt

Mezerník vytváří střelu u přídě. Střela se pohybuje v kladném směru Y.
Časovač `cooldown` omezuje kadenci na jednu střelu přibližně každých 0,14 s.
Za horním okrajem střelu odstraníme ze scény i seznamu.

Střely sdílejí geometrii a materiál. Při odstranění jedné střely je proto
neuvolňujeme: zbývající střely je stále používají. Uvolnění GPU prostředků
probíhá při ukončení scény, například při výměně modulu během vývoje.

Zatím nejsou nepřátelé, kolize, životy ani skóre. To je další fáze:
nepřítel má také polohu XY, střely testují zásah v této rovině a 3D modely
jen zobrazují výsledek. Vizuální náklon lodi nemusí měnit její kolizní tvar.

## 8. Co otevřít a co vyzkoušet

Spusť `npm run dev` a otevři adresu z terminálu. Ovládání je klávesnicí:
šipky nebo WASD pro pohyb, mezerník pro střelbu. Dotykové ovládání zatím není.

Čti soubory v tomto pořadí:

1. `src/main.ts`: spuštění scény a registrace úklidu při HMR.
2. `src/scene.ts`: kamera → model → hvězdy → vstup → resize → smyčka → úklid.
3. `src/style.css` a `index.html`: celá plocha okna a HTML nápověda nad canvasem.

Malé pokusy, vždy měň jen jednu věc:

1. Změň `SHIP_SPEED` z 9 na 4. Ověř také diagonální pohyb.
2. Změň `SCROLL_SPEED` na 0. Loď se ovládá stejně, ale zmizí dojem letu vpřed.
3. Změň `camera.position.z` z 30 na 40. Velikost lodi se nezmění.
4. Změň polohu směrového světla. Uvidíš jinak osvětlené plochy modelu.
5. Nastav cíl náklonu `direction.x * -0.35` na nulu. Ovládání zůstane stejné.
6. Změň velikost okna. Celá herní plocha i proporce lodi musí zůstat zachované.
7. Drž mezerník a přepni do jiné záložky. Po návratu nemá střelba pokračovat bez stisku.

Kontrola zdrojů: `npm run typecheck`. Produkční sestavení: `npm run build`.

## Reference

- [Three.js: OrthographicCamera](https://threejs.org/docs/#OrthographicCamera)
- [Three.js: WebGLRenderer](https://threejs.org/docs/#WebGLRenderer)
- [Three.js: MeshStandardMaterial](https://threejs.org/docs/#MeshStandardMaterial)

Dokumentace popisuje API; volba roviny XY, pevného výřezu a rychlostí vrstev
je konkrétní návrh tohoto prototypu.
