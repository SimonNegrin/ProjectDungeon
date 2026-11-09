---
type: Experiment
id: EXP-004
title: Comparador de generadores de salas irregulares
description: Compara tres formas de generar mazmorras densas con salas poligonales, pared con pared y pasillos cortos usando el tileset real y la misma semilla; incluye puertas validadas, spawn alrededor del acceso y enemigos por superficie y jugadores.
status: draft
experiment_status: ready
question: ¿Qué algoritmo y qué parámetros producen salas caprichosas, pegadas y con pasillos cortos, manteniendo la mazmorra legible y jugable?
related_requirements: [REQ-011, REQ-012]
seed: 279837264
parameters:
  mapWidth: 22
  mapHeight: 18
  roomTarget: 5
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
  showDebug: false
  showDoors: true
  showSpawn: true
  showEnemies: true
decision:
decided_by:
decided_at:
created_at: 2026-11-08T23:55:54Z
updated_at: 2026-11-09T11:15:00Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T23:55:54Z }
verified:
---

# Propósito

Responder una sola pregunta: qué algoritmo y qué parámetros producen la mazmorra
densa de [REQ-011](../../docs/requirements/REQ-011-generador-densa-salas-irregulares.md)
y permiten validar el reparto de
[REQ-012](../../docs/requirements/REQ-012-spawn-sala-protegida.md).

El experimento usa el tileset real de 32rogues, la regla de muro por borde y las
paletas de suelo de `REQ-008`. No es una maqueta abstracta: las salas, los muros,
las puertas y el spawn deben leerse como en el juego.

La v2 aplica las reglas aprobadas de puertas (soporte de muro, conexión entre dos
salas, separación Chebyshev ≥3 y máximo una por pasillo), coloca al grupo
alrededor del acceso de la sala de spawn y calcula los enemigos por superficie y
jugadores con factores configurables.

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
4. Ajustar `numPlayers` (1-6), `enemySurfaceFactor` (0-0,10) y
   `enemyPlayersFactor` (0-3,00) para comparar densidades; por defecto 3
   jugadores, 0,02 y 1,35.
5. Activar y desactivar la capa de debug: máscaras de sala, puertas válidas,
   bocas abiertas, anchura de pasillo, acceso y huecos de spawn, y enemigos.
6. Alternar la vista de mapa completo y la vista de juego 13×13 para comprobar
   que la cámara y la lectura funcionan a escala real.
7. Probar al menos 8 semillas, incluidas varias que activen caverna y pasillo
   ancho; no decidir con una sola.
8. Comparar con las tres capturas de referencia del usuario.
9. Elegir una variante, añadir notas y exportar el JSON de decisión.

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
- Sala de spawn: accesos, tile de acceso, huecos libres, distancia al acceso y
  separación entre personajes.
- Enemigos: `N`, `P`, factores, término por superficie, término por jugadores,
  total `T`, presupuesto por sala, tipos y salas vacías.
- Enemigos por sala, separación y ausencia de línea de visión al spawn.
- Conectividad (debe ser 100 %) y ausencia de pasos diagonales.
- Tiempo de generación y número de intentos internos.

# Observaciones

Construido y probado en `TASK-0040` (intentos 1 y 2). La página compara A/B/C
con la misma semilla, tileset real, puertas, spawn, enemigos, métricas y vista
13×13. El intento 2 corrige las puertas de la vista 13×13, hace funcional el
grosor de muro y mantiene el contrato.

La v2 se implementó en `TASK-0041` (intento 1). Las tres variantes validan cada
puerta sobre la geometría final: soporte de dos muros en la línea, suelo a ambos
lados, conexión entre salas distintas, separación global Chebyshev ≥3 y como
máximo una puerta por pasillo. Los pasillos anchos no llevan puertas. Los accesos
descartados quedan como bocas abiertas con motivo (`sin-soporte`, `sin-suelo`,
`misma-sala`, `separacion`, `una-por-pasillo`, `pasillo-ancho`) y se dibujan en
debug.

El spawn elige el suelo interior junto a la puerta más cercana al centro (o la
boca si no hay puerta), con `party[0]` en el acceso. El resto prioriza tiles con
al menos dos vecinos libres, separación ≥2 y radio 2; si no caben 6, se amplía a
radio 3 y después a la sala completa con un aviso honesto. En algunas semillas
BSP y de crecimiento el acceso queda en un brazo estrecho y hay que usar el
fallback de sala completa; no se oculta el aviso.

El total de enemigos usa `T = ceil(enemySurfaceFactor × N) + ceil(enemyPlayersFactor × P)`
con `N` = suelo de salas (sin pasillos) y `P` = jugadores. Con los valores por
defecto y las semillas muestreadas, `N` ronda 85-162 y `T` queda en 7-9. El
reparto es proporcional al área con mínimo 1 por sala no-spawn, 0 en spawn y
tipos 60/20/20; los cobardes van a las salas más lejanas y los brutos a las de
mayor área. Los enemigos se separan ≥2 y el presupuesto se recorta a lo que cabe
con esa separación. En mapas de dos salas o con una sala pequeña junto al
spawn, la línea de visión inicial se relaja con un aviso honesto (R-011); en el
resto no hay visión al spawn.

Queda pendiente el playtest para elegir variante; la decisión no se cierra aquí.

- Informe de la v1: [attempt-2/report.md](../../artifacts/TASK-0040/attempt-2/report.md).
- Capturas de la v1: [attempt-2/screenshots/](../../artifacts/TASK-0040/attempt-2/screenshots/).
- Tests de la v1: `pnpm run test`, `pnpm run docs:check` y `pnpm run build` en verde.

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
- Informe de la v2: [artifacts/TASK-0041/attempt-1/report.md](../../artifacts/TASK-0041/attempt-1/report.md).
- Capturas y JSON de la v2: [artifacts/TASK-0041/attempt-1/](../../artifacts/TASK-0041/attempt-1/).

# Siguientes pasos

- Ejecutar `TASK-0041` y revisar las capturas de la v2 con el usuario.
- Actualizar `REQ-011` a v2 con el algoritmo y los parámetros elegidos tras el
  playtest.
- Crear las tareas de implementación del generador, el modelo de sala, el render
  de puertas y el reparto de enemigos.
- Promocionar la variante elegida a `src/game/` con tests de producción.
- Archivar el experimento o dejarlo como referencia.
