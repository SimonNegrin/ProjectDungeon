---
type: Experiment
id: EXP-004
title: Comparador de generadores de salas irregulares
description: Compara tres formas de generar mazmorras densas con salas poligonales, pared con pared y pasillos cortos usando el tileset real y la misma semilla; incluye puertas validadas, spawn alrededor del acceso, enemigos interiores con emboscadas y salida de nivel.
status: draft
experiment_status: ready
question: ¿Qué algoritmo y qué parámetros producen salas caprichosas, pegadas y con pasillos cortos, manteniendo la mazmorra legible y jugable con entrada, enemigos y salida?
related_requirements: [REQ-011, REQ-012, REQ-013]
seed: 279837264
parameters:
  mapWidth: 22
  mapHeight: 18
  roomCount: 5
  roomMin: 3
  roomMax: 9
  corridorMaxLength: 3
  wideCorridorChance: 33
  wallThickness: "1-2"
  megaRoomChance: 17
  spawnMinTiles: 6
  numPlayers: 3
  enemySurfaceFactor: 0.02
  enemyPlayersFactor: 1.35
  hiddenEnemyChance: 0.5
  exitMode: random
  showDebug: false
  showDoors: true
  showSpawn: true
  showEnemies: true
decision:
decided_by:
decided_at:
created_at: 2026-11-08T23:55:54Z
updated_at: 2026-11-09T12:21:36Z
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
2. Fijar la semilla de referencia `279837264` y comparar A, B y C con los mismos
   parámetros.
3. Ajustar tamaño, número de salas, longitud máxima de pasillo, probabilidad de
   pasillo ancho, grosor de muro y probabilidad de caverna.
4. Ajustar `numPlayers` (1-6), `enemySurfaceFactor` (0-0,10),
   `enemyPlayersFactor` (0-3,00) y `hiddenEnemyChance` (0-1) para comparar
   densidades y emboscadas; por defecto 3 jugadores, 0,02, 1,35 y 0,5.
5. Cambiar `exitMode` entre `door`, `stairs-down`, `stairs-up` y `random` para
   comparar la lectura de la salida y su distancia al spawn.
6. Activar y desactivar la capa de debug: máscaras de sala, puertas válidas,
   bocas abiertas, anchura de pasillo, acceso y huecos de spawn, puntos calientes,
   emboscados, entrada, salida y enemigos.
7. Alternar la vista de mapa completo y la vista de juego 13×13 para comprobar
   que la cámara y la lectura funcionan a escala real.
8. Probar al menos 8 semillas, incluidas varias que activen caverna y pasillo
   ancho; no decidir con una sola.
9. Comparar con las tres capturas de referencia del usuario.
10. Elegir una variante y una representación de salida, añadir notas y exportar
    el JSON de decisión.

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

La **v3** se aprobó el 2026-11-09 y **todavía no está implementada**. Sustituye
la separación ≥2 por componentes adyacentes ≤2 en 8 direcciones, permite parejas
de jugadores, añade preferencia por interior y emboscadas en puntos calientes con
`hiddenEnemyChance` (0,5 por defecto), evita la sala mayor en el desempate de
spawn, fija el mínimo de 3 salas y añade la salida con `exitMode`. Las capturas y
métricas de la v2 no validan estos cambios; hace falta una tarea nueva.

Queda pendiente el playtest para elegir variante y representación de salida; la
decisión no se cierra aquí.

- Informe de la v1: [attempt-2/report.md](../../artifacts/TASK-0040/attempt-2/report.md).
- Capturas de la v1: [attempt-2/screenshots/](../../artifacts/TASK-0040/attempt-2/screenshots/).
- Tests de la v1: `pnpm run test`, `pnpm run docs:check` y `pnpm run build` en verde.
- Informe de la v2: [attempt-2/report.md](../../artifacts/TASK-0041/attempt-2/report.md).
- Capturas de la v2: [attempt-2/screenshots/](../../artifacts/TASK-0041/attempt-2/screenshots/).

# Decisión

- Opción:
- Motivo:
- Fecha:
- Decidido por:
- Semilla y parámetros:

# Evidencia

- Informe de la v1: [report.md](../../artifacts/TASK-0040/attempt-2/report.md).
- Capturas A/B/C normal y debug de la v1: [screenshots/](../../artifacts/TASK-0040/attempt-2/screenshots/).
- Export de ejemplo de la v1: [decision-example.json](../../artifacts/TASK-0040/attempt-2/decision-example.json).
- Salidas de test, docs y build de la v1 en `artifacts/TASK-0040/attempt-2/`.
- Informe de la v2: [artifacts/TASK-0041/attempt-2/report.md](../../artifacts/TASK-0041/attempt-2/report.md).
- Capturas y JSON de la v2: [artifacts/TASK-0041/attempt-2/](../../artifacts/TASK-0041/attempt-2/).
- Requisitos de la v3: [REQ-011 v3](../../docs/requirements/REQ-011-generador-densa-salas-irregulares.md),
  [REQ-012 v3](../../docs/requirements/REQ-012-spawn-sala-protegida.md) y
  [REQ-013](../../docs/requirements/REQ-013-entrada-salida-exploracion.md).

# Siguientes pasos

- Crear y ejecutar la tarea de `EXP-004` v3: distribución orgánica, emboscadas,
  spawn no-mayor, mínimo de 3 salas y salida.
- Revisar las capturas de la v3 con el usuario y comparar `exitMode`.
- Elegir variante y representación de salida; registrar la decisión.
- Actualizar `REQ-011`, `REQ-012` y `REQ-013` con el algoritmo, los parámetros y
  la salida elegidos tras el playtest.
- Crear las tareas de implementación del generador, el modelo de sala, el render
  de puertas, el reparto de enemigos y el encadenado de niveles.
- Promocionar la variante elegida a `src/game/` con tests de producción.
- Archivar el experimento o dejarlo como referencia.
