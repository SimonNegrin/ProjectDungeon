---
type: Experiment
id: EXP-001
title: Comparador de generadores de mazmorra
description: Compara BSP, salas con pasillos e híbrido con la misma semilla para elegir el generador de REQ-003.
status: draft
experiment_status: proposed
question: ¿Qué generador produce la mazmorra legible, variada y con los pasillos y huecos de puerta que queremos?
related_requirements: [REQ-003]
parameters:
  - id: roomTarget
    label: Salas objetivo
    type: range
    min: 8
    max: 12
    step: 1
    default: 10
  - id: roomMin
    label: Sala mínima
    type: range
    min: 3
    max: 6
    step: 1
    default: 3
    unit: tiles
  - id: roomMax
    label: Sala máxima
    type: range
    min: 8
    max: 11
    step: 1
    default: 11
    unit: tiles
  - id: loopRatio
    label: Bucles extra
    type: range
    min: 0
    max: 40
    step: 5
    default: 20
    unit: "%"
  - id: showDoors
    label: Marcar huecos de puerta
    type: toggle
    default: true
decision:
decided_by:
decided_at:
created_at: 2026-11-07T17:43:55Z
updated_at: 2026-11-07T17:43:55Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T17:43:55Z }
verified:
---

# Propósito

Responder una sola pregunta: qué generador produce la mazmorra que queremos para
[REQ-003](../../docs/requirements/REQ-003-generacion-mapa.md). El mapa de trabajo
es de 32×32; los controles permiten variar salas y bucles, pero no el tamaño.

El experimento usa la regla de muros ya aprobada: `wallSide1` solo en muros con
suelo al sur y `wallTop` en el resto. También dibuja los huecos de puerta y los
puntos de aparición para comprobar que el mapa es jugable.

# Hipótesis

- **BSP** dará la estructura más legible y las salas más previsibles.
- **Salas + pasillos** dará un resultado más orgánico, con más riesgo de espacios
  muertos y pasillos largos.
- **Híbrido** dará la sensación más laberíntica, pero puede complicar la lectura
  y la colocación de puertas.

La decisión no es "cuál es más bonito", sino cuál cumple mejor las propiedades de
`REQ-003` con la misma semilla.

# Opciones

| Variante | Descripción | Tradeoff |
|---|---|---|
| A | BSP: partición recursiva, salas en hojas, conexión entre salas con pasillos en L/Z y bucles extra. | Estructura clara y salas variadas; puede sentirse jerárquica y repetitiva. |
| B | Salas colocadas al azar sin solaparse, árbol de expansión y pasillos en L/Z, más bucles. | Más orgánico; puede dejar zonas vacías y pasillos largos. |
| C | Híbrido: salas + relleno laberíntico entre ellas + bucles. | Más sensación de mazmorra; más difícil de leer y de validar. |

# Cómo usarlo

1. Abrir `/experiments/EXP-001-generador-mazmorra/`.
2. Fijar una semilla y comparar A, B y C con los mismos parámetros.
3. Ajustar `roomTarget`, `roomMin`, `roomMax` y `loopRatio`.
4. Activar `showDoors` para revisar los accesos y los puntos de aparición.
5. Probar varias semillas; no decidir con una sola.
6. Elegir una variante, añadir notas y exportar el JSON de decisión.

# Métricas

- Número de salas y área mínima, mediana y máxima.
- Porcentaje de suelo transitable.
- Pasillos, esquinas, callejones y bucles.
- Huecos de puerta y conectividad (debe ser 100 %).
- Distancia de camino entre jugador y enemigo.
- Tiempo de generación.

# Observaciones

Pendiente de construir y probar. Rellenar tras la sesión de playtest con:
legibilidad, sensación de recorrido, claridad de las puertas y semillas
problemáticas.

# Decisión

- Opción:
- Motivo:
- Fecha:
- Decidido por:

# Evidencia

- [ ] Capturas de A/B/C con la misma semilla.
- [ ] JSON de decisión en `results/`.
- [ ] `pnpm run verify` y `pnpm run test:e2e` OK.

# Siguientes pasos

- Actualizar `REQ-003` a v2 con la variante y los parámetros elegidos.
- Promocionar el generador validado a `src/game/` y añadir tests de producción.
- Crear las tareas de generación, aparición, muros y E2E.
- Archivar el experimento o dejarlo como referencia.
