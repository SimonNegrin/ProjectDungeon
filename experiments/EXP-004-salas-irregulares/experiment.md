---
type: Experiment
id: EXP-004
title: Comparador de generadores de salas irregulares
description: Compara tres formas de generar mazmorras densas con salas poligonales, pared con pared y pasillos cortos usando el tileset real y la misma semilla.
status: draft
experiment_status: proposed
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
  showDebug: false
  showDoors: true
  showSpawn: true
decision:
decided_by:
decided_at:
created_at: 2026-11-08T23:55:54Z
updated_at: 2026-11-08T23:55:54Z
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
4. Activar y desactivar la capa de debug: máscaras de sala, puertas, anchura de
   pasillo, sala de spawn, huecos y enemigos.
5. Alternar la vista de mapa completo y la vista de juego 13×13 para comprobar
   que la cámara y la lectura funcionan a escala real.
6. Probar al menos 8 semillas, incluidas varias que activen caverna y pasillo
   ancho; no decidir con una sola.
7. Comparar con las tres capturas de referencia del usuario.
8. Elegir una variante, añadir notas y exportar el JSON de decisión.

# Métricas

- Número de salas, roles y área de cada una.
- Relación área/caja de límites y número de muescas por sala.
- Hornacinas de 1-2 tiles y callejones.
- Parejas de salas con pared compartida y puertas directas.
- Longitud de cada pasillo (0-3) y número de bucles.
- Pasillos anchos de 2 tiles, longitud y ausencia de puertas.
- Caverna: área de la sala principal y número de anexas.
- Sala de spawn: accesos, huecos libres y distancia a enemigos.
- Enemigos por sala, salas vacías y tipos.
- Conectividad (debe ser 100 %) y ausencia de pasos diagonales.
- Tiempo de generación y número de intentos internos.

# Observaciones

Pendiente de construir y probar en `TASK-0040`. Rellenar con capturas y una
tabla comparativa por semilla.

# Decisión

- Opción:
- Motivo:
- Fecha:
- Decidido por:
- Semilla y parámetros:

# Evidencia

- Pendiente: capturas A/B/C, JSON de decisión e informe de `TASK-0040`.

# Siguientes pasos

- Actualizar `REQ-011` a v2 con el algoritmo y los parámetros elegidos.
- Crear las tareas de implementación del generador, el modelo de sala, el render
  de puertas y el reparto de enemigos.
- Promocionar la variante elegida a `src/game/` con tests de producción.
- Archivar el experimento o dejarlo como referencia.
