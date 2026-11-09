---
type: Experiment
id: EXP-004
title: Comparador de generadores de salas irregulares
description: Compara tres formas de generar mazmorras densas con salas poligonales, pared con pared y pasillos cortos usando el tileset real y la misma semilla; incluye puertas validadas, spawn alrededor del acceso, enemigos interiores con emboscadas y salida de nivel.
status: stable
experiment_status: decided
question: ¿Qué algoritmo y qué parámetros producen salas caprichosas, pegadas y con pasillos cortos, manteniendo la mazmorra legible y jugable con entrada, enemigos y salida?
related_requirements: [REQ-011, REQ-012, REQ-013]
seed: 2738263054
parameters:
  mapWidth: 22
  mapHeight: 18
  roomCount: 5
  roomMin: 3
  roomMax: 8
  corridorMaxLength: 3
  wideCorridorChance: 33
  wallThickness: 1
  megaRoomChance: 15
  spawnMinTiles: 6
  numPlayers: 6
  enemySurfaceFactor: 0.02
  enemyPlayersFactor: 1.2
  hiddenEnemyChance: 0.25
  exitMode: random
  variant: growth
  showDebug: false
  showDoors: true
  showSpawn: true
  showEnemies: true
decision: growth
decided_by: human:simon
decided_at: 2026-11-09T14:59:21.082Z
created_at: 2026-11-08T23:55:54Z
updated_at: 2026-11-09T15:30:00Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T23:55:54Z }
verified:
---

# Propósito

Responder una sola pregunta: qué algoritmo y qué parámetros producen la mazmorra
densa de [REQ-011](../../docs/requirements/REQ-011-generador-densa-salas-irregulares.md)
y permiten validar el reparto de
[REQ-012](../../docs/requirements/REQ-012-spawn-sala-protegida.md) y la salida de
[REQ-013](../../docs/requirements/REQ-013-entrada-salida-exploracion.md).

El experimento usa el tileset real de 32rogues, la regla de muro por borde y las
paletas de suelo de `REQ-008`. No es una maqueta abstracta: las salas, los muros,
las puertas y el spawn deben leerse como en el juego.

La v2 aplica las reglas aprobadas de puertas (soporte de muro, conexión entre dos
salas, separación Chebyshev ≥3 y máximo una por pasillo), coloca al grupo
alrededor del acceso de la sala de spawn y calcula los enemigos por superficie y
jugadores con factores configurables.

La v3 añade el mínimo global de 3 salas, la preferencia por una sala de spawn que
no sea la mayor cuando hay empate de protección, la adyacencia en parejas (máximo
2 por componente en 8 direcciones), la colocación de enemigos en el interior con
emboscadas probabilísticas en puntos calientes y la salida de nivel como puerta
exterior o escalera. La salida no es funcional: solo se dibuja y se mide.

# Hipótesis

- **A · Crecimiento sobre roca** dará las siluetas más orgánicas y los rincones
  más naturales, con riesgo de salas que se fusionan o de muros demasiado finos.
- **B · BSP con máscaras** reutiliza una estructura ya validada y garantiza
  conectividad, pero puede sentirse más en caja y menos "tallada".
- **C · Plantillas empaquetadas** dará el aspecto más artesanal y reconocible,
  con riesgo de repetición y de que el empaquetado falle en mapas pequeños.

La decisión no es solo estética: la variante elegida debe cumplir las
restricciones de forma, pared compartida, pasillos cortos, spawn protegido y
reparto de enemigos sin relajar la jugabilidad.

La v2 añade tres hipótesis de lectura: una puerta con dos muros en la línea y
separación suficiente deja de parecer un agujero accidental; un grupo alrededor
del acceso se lee como una llegada y no como fichas pegadas a la pared; y un
presupuesto de enemigos por superficie y jugadores hace que las salas grandes se
sientan más habitadas sin multiplicar fichas en las pequeñas.

La v3 añade cuatro hipótesis: permitir parejas de jugadores hace que el grupo se
lea como una formación sin perder separación táctica; los enemigos interiores y
las emboscadas en rincones hacen que las salas se lean habitadas y no como un
perímetro de fichas; una probabilidad de emboscada evita que el jugador aprenda
una posición fija; y una salida a distancia ≥2 convierte la exploración en un
recorrido con al menos una sala intermedia, en vez de un mapa que se resuelve
junto al spawn.

# Opciones

| Variante | Descripción | Tradeoff |
|---|---|---|
| A | Crecimiento sobre roca: se parte de un mapa macizo, se siembran salas y cada una crece con una máscara irregular; después se empaquetan y se abren puertas o pasillos cortos. | Siluetas muy orgánicas; más riesgo de fusiones, muros finos y búsqueda costosa. |
| B | BSP con máscaras: partición BSP en 4-6 hojas; cada sala llena su hoja con una máscara irregular y 1-2 tiles de muro; las hojas vecinas se conectan con puerta directa y el resto con pasillos de 1-3 tiles. | Conectividad y determinismo más fáciles; puede quedar más rígido y repetir la estructura de árbol. |
| C | Plantillas empaquetadas: biblioteca de formas L/T/con muescas, rotadas y espejadas, colocadas en un grafo empaquetado; puertas en paredes compartidas y pasillos cortos donde haga falta. | Aspecto muy artesanal y controlado; riesgo de repetición y de encajar mal en mapas pequeños. |

# Cómo usarlo

1. Abrir `/experiments/EXP-004-salas-irregulares/`.
2. Fijar la semilla de referencia `279837264` para comparar A, B y C, o la
   semilla de playtest `2738263054` para reproducir la configuración elegida.
3. Ajustar tamaño, número de salas, longitud máxima de pasillo, probabilidad de
   pasillo ancho, grosor de muro y probabilidad de caverna.
4. Ajustar `numPlayers` (1-6), `enemySurfaceFactor` (0-0,10),
   `enemyPlayersFactor` (0-3,00) y `hiddenEnemyChance` (0-1) para comparar
   densidades y emboscadas; la configuración registrada es 6 jugadores, 0,02,
   1,2 y 0,25.
5. Cambiar `exitMode` entre `door`, `stairs-down`, `stairs-up` y `random` para
   comparar la lectura de la salida y su distancia al spawn; producción usa
   `random` por defecto.
6. Activar y desactivar la capa de debug: máscaras de sala, puertas válidas,
   bocas abiertas, anchura de pasillo, acceso y huecos de spawn, puntos calientes,
   emboscados, entrada, salida y enemigos.
7. Alternar la vista de mapa completo y la vista de juego 13×13 para comprobar
   que la cámara y la lectura funcionan a escala real.
8. Probar al menos 8 semillas, incluidas varias que activen caverna y pasillo
   ancho; no decidir con una sola.
9. Comparar con las tres capturas de referencia del usuario.
10. Reproducir la decisión registrada: `growth` con la semilla `2738263054` y la
    configuración de playtest. Las otras variantes siguen disponibles para
    comparar y se promoverán solo si se piden expresamente. Los sliders
    conservan sus defaults históricos; para reproducir la configuración exacta,
    fija los valores del JSON de decisión o cárgalo cuando la tarea de QA añada
    el preset.

# Métricas

- Número de salas, roles y área de cada una.
- Relación área/caja de límites y número de muescas por sala.
- Hornacinas de 1-2 tiles y callejones.
- Parejas de salas con pared compartida y puertas directas.
- Puertas válidas, bocas abiertas y motivo; distancia Chebyshev entre puertas;
  puertas por pasillo y soporte de muro.
- Longitud de cada pasillo (0-3) y número de bucles.
- Pasillos anchos de 2 tiles, longitud y ausencia de puertas.
- Caverna: área de la sala principal y número de anexas.
- Sala de spawn: accesos, tile de acceso, huecos libres, distancia al acceso,
  componentes adyacentes y si coincide con la sala mayor.
- Enemigos: `N`, `P`, factores, término por superficie, término por jugadores,
  total `T`, presupuesto por sala, tipos y salas vacías.
- Enemigos por sala, componentes adyacentes, interiores, borde y ausencia de
  línea de visión al spawn.
- Puntos calientes: total, elegibles, tiradas, ocupados, motivo (`rincón`,
  `sin-LOS`, `ambos`) y porcentaje ocupado por mapa.
- Salida: sala, tipo, posición, acceso, distancia de grafo desde el spawn,
  camino, motivo de fallback y reserva del tile. En `door`, la puerta es muro y
  el acceso es el suelo interior adyacente.
- Conectividad (debe ser 100 %) y ausencia de pasos diagonales.
- Tiempo de generación y número de intentos internos.

# Observaciones

Construido y probado en `TASK-0040` (intentos 1 y 2). La página compara A/B/C
con la misma semilla, tileset real, puertas, spawn, enemigos, métricas y vista
13×13. El intento 2 corrige las puertas de la vista 13×13, hace funcional el
grosor de muro y mantiene el contrato.

La v2 se implementó en `TASK-0041` (intentos 1 y 2); el intento 2 corrigió el
spawn. Las tres variantes validan cada puerta sobre la geometría final: soporte
de dos muros en la línea, suelo a ambos lados, conexión entre salas distintas,
separación global Chebyshev ≥3 y como máximo una puerta por pasillo. Los
pasillos anchos no llevan puertas. Los accesos descartados quedan como bocas
abiertas con motivo (`sin-soporte`, `sin-suelo`, `misma-sala`, `separacion`,
`una-por-pasillo`, `pasillo-ancho`) y se dibujan en debug.

El spawn elige el suelo interior junto a la puerta más cercana al centro (o la
boca si no hay puerta), con `party[0]` en el acceso. El resto se busca con una
búsqueda determinista que maximiza huecos separados ≥2, primero en radio 2,
después en radio 3 y por último en la sala completa, priorizando tiles con al
menos dos vecinos libres. La separación **nunca** se relaja: si no caben 6, se
devuelven los que quepan (≥1) con un aviso, antes que juntar huecos adyacentes.
En el barrido A/B/C × 20 semillas, 56 de 60 mapas usan algún fallback (30 se
quedan por debajo de 6 huecos con aviso, 2 necesitan radio 3 y 24 usan la sala
completa con 6); solo 4 mapas caben en radio 2. Es el comportamiento esperado de
las salas irregulares, no un caso aislado.

El total de enemigos usa `T = ceil(enemySurfaceFactor × N) + ceil(enemyPlayersFactor × P)`
con `N` = suelo de salas (sin pasillos) y `P` = jugadores. Con los valores por
defecto y las semillas muestreadas, `N` ronda 85-162 y `T` queda en 7-9. El
reparto es proporcional al área con mínimo 1 por sala no-spawn, 0 en spawn y
tipos 60/20/20; los cobardes van a las salas más lejanas y los brutos a las de
mayor área. Los enemigos se separan ≥2 y el presupuesto se recorta a lo que cabe
con esa separación. En mapas de dos salas o con una sala pequeña junto al
spawn, la línea de visión inicial se relaja con un aviso honesto (R-011); en el
resto no hay visión al spawn.

La **v3** se implementó en `TASK-0042` (intentos 1 y 2). Sustituye la separación
≥2 por **componentes adyacentes ≤2 en 8 direcciones**, permite parejas de
jugadores y enemigos, prefiere celdas interiores, añade emboscadas en puntos
calientes con `hiddenEnemyChance` (0,5 por defecto), evita la sala mayor en el
desempate de spawn, fija el mínimo de 3 salas y añade la salida con `exitMode`.
La reserva del tile y del acceso de salida se aplica antes de colocar enemigos.

El intento 2 corrigió la componente global de enemigos: las fichas ya colocadas
se usan como restricción al elegir cada sala, con reubicación determinista si una
sala se queda corta. `stats.hotspotRolls` y `enemy.hotspotRolls` cuentan todos
los puntos calientes. El barrido A/B/C × 200 semillas (600 mapas) deja 0
incidencias de `validateMap`, 0 componentes >2, 0 salas no-spawn vacías y 0 mapas
por debajo de `T`; la verificación independiente del lead amplió el barrido a
1.200 mapas con el mismo resultado.

| Variante | Salas 3/4/5/6 | Caverna | Pasillo ancho | Spawn = mayor | Huecos | Salidas door/down/up | Distancia 1/2/3/4 | Fallback door |
|---|---|---|---|---|---|---|---|---|
| A · crecimiento | 46/19/135/0 | 46 | 39 | 5 | 6 en 200/200 | 48/85/67 | 0/127/51/22 | 18 |
| B · BSP | 39/0/161/0 | 39 | 26 | 20 | 6 en 200/200 | 28/105/67 | 0/160/22/18 | 38 |
| C · plantillas | 36/15/148/1 | 36 | 40 | 1 | 6 en 200/200 | 56/77/67 | 2/114/70/14 | 10 |

La caverna tiene siempre exactamente 3 salas (caverna + 2 anexas de 4-5 tiles);
en mapas de 3 salas no se añaden bucles ni pasillos anchos extra. Las 2 salidas a
distancia 1 de C llevan el aviso «No hay una sala no-spawn a distancia ≥2» y se
aceptan por el fallback documentado. Con `hiddenEnemyChance` 0 no hay emboscados;
con 0,5 el barrido deja 828/2589, 770/2536 y 831/2884 puntos elegibles ocupados
(29-32 %), nunca 0 % ni 100 %. Los no emboscados prefieren interior; el borde
solo aparece cuando no hay interior compatible o la ficha es una emboscada. El
spawn no queda en la sala mayor en A (5/200) y C (1/200); en B ocurre 20/200
cuando la caverna es la única más protegida.

**Cajas a gap 0 (decisión documentada):** 33/200 mapas de BSP tienen cajas de sala
que se tocan sin muro. No se cambió la generación ni la aceptación; se añadió un
aviso no fatal y la componente global ≤2 resuelve el cruce de fichas.

**Escaleras (desviación documentada):** el tileset real incluye `staircase down`
y `staircase up` en `tiles.txt` 17.h/17.i, pero `src/host/assets.ts` no expone su
recorte y producción no se toca. El experimento define el recorte local
`STAIR_RECTS` en `src/render.ts` (`sx` 224/256, `sy` 512, 32×32) y superpone
huellas doradas y una flecha para que la escalera se lea a 32 px y en 13×13. El
render de `door` dibuja un marco dorado sobre el muro del borde; no abre paso.

**Decisión de playtest (2026-11-09):** se elige **A · crecimiento (`growth`)** con
la semilla `2738263054` y la configuración registrada: 22×18, 5 salas, salas de
3-8 tiles, pasillo máximo 3, ancho 33 %, muro 1, caverna 15 %, 6 huecos de
spawn, 6 jugadores, factores 0,02/1,2, emboscadas 0,25 y `exitMode: random`.
`growth` pasa a generador por defecto en producción. La representación final de
la salida se valida en el playtest de producción; no bloquea la promoción. BSP
con máscaras y plantillas quedan en el experimento hasta que se pidan.

- Informe de la v1: [attempt-2/report.md](../../artifacts/TASK-0040/attempt-2/report.md).
- Capturas de la v1: [attempt-2/screenshots/](../../artifacts/TASK-0040/attempt-2/screenshots/).
- Tests de la v1: `pnpm run test`, `pnpm run docs:check` y `pnpm run build` en verde.
- Informe de la v2: [attempt-2/report.md](../../artifacts/TASK-0041/attempt-2/report.md).
- Capturas de la v2: [attempt-2/screenshots/](../../artifacts/TASK-0041/attempt-2/screenshots/).

# Decisión

- Opción: **A · crecimiento de salas sobre roca (`growth`)**.
- Motivo: es la variante que el usuario elige tras el playtest; se promociona a
  producción sin arrastrar BSP con máscaras ni plantillas al bundle.
- Fecha: 2026-11-09T14:59:21.082Z.
- Decidido por: `human:simon`.
- Semilla y parámetros: `2738263054`, 22×18, 5 salas, salas 3-8, pasillo 3,
  ancho 33 %, muro 1, caverna 15 %, spawn 6, 6 jugadores, 0,02/1,2, emboscadas
  0,25 y `exitMode: random`.
- Registro: [decision-2026-11-09T14-59-21Z.json](results/decision-2026-11-09T14-59-21Z.json).

# Evidencia

- Informe de la v1: [report.md](../../artifacts/TASK-0040/attempt-2/report.md).
- Capturas A/B/C normal y debug de la v1: [screenshots/](../../artifacts/TASK-0040/attempt-2/screenshots/).
- Export de ejemplo de la v1: [decision-example.json](../../artifacts/TASK-0040/attempt-2/decision-example.json).
- Salidas de test, docs y build de la v1 en `artifacts/TASK-0040/attempt-2/`.
- Informe de la v2: [artifacts/TASK-0041/attempt-2/report.md](../../artifacts/TASK-0041/attempt-2/report.md).
- Capturas y JSON de la v2: [artifacts/TASK-0041/attempt-2/](../../artifacts/TASK-0041/attempt-2/).
- Informe de la v3: [artifacts/TASK-0042/attempt-2/report.md](../../artifacts/TASK-0042/attempt-2/report.md).
- Capturas, JSON y barrido de la v3: [artifacts/TASK-0042/attempt-2/](../../artifacts/TASK-0042/attempt-2/).
- Requisitos de la v3: [REQ-011 v3](../../docs/requirements/REQ-011-generador-densa-salas-irregulares.md),
  [REQ-012 v3](../../docs/requirements/REQ-012-spawn-sala-protegida.md) y
  [REQ-013](../../docs/requirements/REQ-013-entrada-salida-exploracion.md).

# Siguientes pasos

- Promocionar `growth` a `src/game/chambers/variants/growth.ts` con el modelo
  compartido en `src/game/chambers/core/` y un import estático en producción.
- Crear las tareas `TASK-0043` a `TASK-0049`: modelo, núcleo, spawn/enemigos/
  salida, variante, guarda de bundle, host y QA/playtest.
- Mantener BSP como alternativa inyectable; no borrar ni debilitar sus tests.
- Dejar A/B/C restantes en este experimento hasta que se pidan expresamente.
- Añadir la cámara secreta después del playtest de producción, solo sobre
  `growth`.
