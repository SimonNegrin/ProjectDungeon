---
type: Task Brief
title: "TASK-0041: detalle del intento 2"
description: Evidencia independiente del fallo de separación del spawn y diagnóstico.
task: TASK-0041
attempt: 2
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T11:25:00Z }
---

# Veredicto del intento 1

Rechazado por un criterio de aceptación: el spawn relaja la separación entre
huecos. El resto del intento 1 es válido y no debe rehacerse.

## Evidencia reproducible

Análisis independiente del lead sobre las tres variantes y 20 semillas
(60 mapas), ejecutado con un test temporal no commiteado y guardado en:

- [lead-verification-summary.json](../attempt-1/lead-verification-summary.json)
- [lead-verification-saturation.json](../attempt-1/lead-verification-saturation.json)
- [lead-verification-access-weight.json](../attempt-1/lead-verification-access-weight.json)

Resultados:

| Comprobación | Resultado |
|---|---|
| Mapas con algún hueco a Chebyshev >2 del acceso | 49/60 |
| Mapas con algún par de huecos a Chebyshev <2 | 32/60 |
| Mapas con aviso de separación de spawn relajada | 32/60 |
| Mapas con visión al spawn relajada | 7/60 |
| Mapas con `planned < T` (capacidad) | 5/60 |
| Mapas con 6 huecos separados posibles en radio 2 | 5/60 |
| Mapas con 6 huecos separados posibles en radio 3 | 16/60 |
| Mapas con 6 huecos separados posibles en sala completa | 33/60 |
| Mapas con separación relajada aunque la sala completa admite 6 separados | 5/60 |
| Mapas con separación relajada y sala completa con <6 separados | 27/60 |

Casos concretos:

- `growth` semilla 7: `minPair=1`, `maxRadius=3`; el JSON exportado contiene
  `"La sala de spawn no reunió los huecos pedidos con separación; se abrió a la
  sala completa y se relajó la separación."`
- `growth` semilla 1: `minPair=1`, `maxRadius=4`.
- `bsp` semilla 7: `maxRadius=7`, sin relajar separación; es un fallback de sala
  completa, no el fallo principal.
- `templates` semilla 3: `minPair=1`, `maxRadius=5`.

El fallback en sí está permitido por el criterio (“se amplía a radio 3 y
después a la sala completa, con aviso”), pero **la separación ≥2 no** se puede
relajar. En 27/60 mapas no existen 6 huecos separados ni en la sala completa:
la respuesta correcta es devolver menos de 6 con aviso, no juntar personajes.
En 5/60 la sala completa sí admite 6 separados y el relleno greedy no los
encuentra: una búsqueda exhaustiva/backtracking lo arregla.

## Código implicado

- `experiments/EXP-004-salas-irregulares/src/spawn.ts`:
  - `fillParty` acepta `relaxSeparation` y lo usa en la última llamada.
  - `chooseParty` llama a `fillParty` con `relaxSeparation: true` cuando la sala
    completa tampoco llega a `minTiles`; eso coloca huecos adyacentes.
  - `chooseParty` es greedy: elige por `freeNeighbors >= 2`, cercanía y hash; no
    hace búsqueda de un conjunto máximo.
- `spawn.test.ts`:
  - El test “sin fallback, el grupo queda a radio 2 y separado 2” hace
    `if (hasSpawnRelaxWarning(map)) continue;`, así que no comprueba separación
    precisamente en los mapas que la incumplen.
  - El test “los mapas por defecto no relajan la separación...” solo comprueba
    separación de **enemigos**, no de `spawns.party`.
  - El test de fallback de sala pequeña comprueba <6 y aviso, pero no exige
    separación (trivial con 3 celdas, pero debe quedar explícito).
- `experiment.md` y `report.md` dicen que el grupo queda con “separación ≥2” y
  solo mencionan la relajación de visión; no mencionan la separación de spawn.
  Corrige la redacción y reporta la frecuencia real del fallback.

## Corrección esperada

1. Elimina la rama que relaja `SPAWN_SEPARATION`. Nunca devuelvas pares a
   Chebyshev <2.
2. Sustituye el relleno greedy por una búsqueda determinista (backtracking o
   conjunto máximo con desempate por hash) que:
   - empiece por el acceso;
   - pruebe radio 2, luego radio 3, luego sala completa;
   - priorice tiles con ≥2 vecinos libres;
   - devuelva el máximo encontrado y avise si es < `minTiles`.
3. Añade tests:
   - sintético con 5×5 de suelo y acceso centrado: 6 huecos separados en radio 2,
     sin aviso de fallback;
   - sintético con 6 separados solo en radio 3: aviso y todos a ≤3;
   - sintético sin 6 separados: `party.length < 6`, warning y separación ≥2;
   - barrido A/B/C × 20 semillas: todos los pares ≥2, `party[0]` = acceso, y
     cualquier hueco >2 o longitud <6 tiene warning.
4. Mantén las capturas/JSON de `attempt-1`; si el spawn cambia visualmente,
   regenera y anota qué ficheros.

## Secundario, no bloqueante

`accessesFor` pasó de contar puertas + 2 por pasillo ancho a contar todas las
`openMouths` por sala. En algunos mapas el número de accesos sube mucho (p. ej.
`growth` semilla 2, sala 2: 7). Revisa que cuente aperturas físicas por sala y
que no cambie la sala más protegida; si lo cambia, es una regresión de
`REQ-012` R-001 aunque no esté en los criterios de esta tarea.
