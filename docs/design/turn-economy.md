---
type: Design
title: Economía de turno provisional
description: Valores iniciales de movimiento, acción, combate, orden y cámara para el primer prototipo.
status: draft
decision_status: provisional
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T14:33:11Z }
---

# Propósito

Fijar unos valores jugables para el primer prototipo local. No son definitivos:
están pensados para poder probar el loop y ajustarlos después con experimentos y
playtests.

# Rejilla y movimiento

| Regla | Valor provisional |
|---|---|
| Rejilla | Cuadrada, 20×20. |
| Posición inicial del jugador | (4,4). |
| Posición inicial del enemigo | (15,15). |
| Direcciones | 8 direcciones, incluida la diagonal. |
| Coste de movimiento | 1 MP por casilla, también en diagonal. |
| MP de jugador | 6. |
| MP de enemigo | 4. |
| Ocupación | Jugadores y enemigos bloquean la casilla. |
| Corte de esquina | No permitido: para moverse en diagonal, las dos casillas ortogonales adyacentes deben estar libres. |
| Cámara | Viewport de 12×12 tiles; sigue al jugador activo y se limita a los bordes del mapa. |

# Acción

- Cada unidad tiene **una acción por turno**: atacar, interactuar o esperar.
- Se puede mover antes y después de la acción, mientras queden MP.
- Atacar no termina el turno por sí solo.
- El turno termina al pulsar `E`. Si no quedan MP y la acción está usada, el HUD
  sugiere terminar, pero el prototipo no auto-termina.
- Al empezar un turno se restauran MP y acción.

# Combate

| Regla | Valor provisional |
|---|---|
| Alcance cuerpo a cuerpo | 1 casilla, incluidas las diagonales. |
| Alcance a distancia | 4 casillas, con línea de visión. |
| Línea de visión | Bresenham sobre la rejilla; diagonales permitidas. |
| Cobertura | No existe en el primer prototipo. |
| Vida de jugador | 20. |
| Vida de enemigo | 10. |
| Daño de ataque básico | 5. |
| Daño de enemigo | 3. |
| Muerte | Al llegar a 0 de vida. |

Los valores de vida y daño son placeholders para probar el loop, no una
propuesta de balance.

# Orden de turnos

1. Todos los jugadores actúan en orden fijo, determinado por su índice.
2. Cuando el último jugador termina, empieza la fase enemiga.
3. Todos los enemigos actúan en orden de índice.
4. Al terminar el último enemigo, vuelve la fase de jugadores.

En el primer prototipo hay un solo jugador y un solo enemigo, pero el estado ya
representa listas de jugadores y enemigos.

# IA enemiga

Para el primer prototipo:

1. Elegir al jugador más cercano.
2. Si está en rango de ataque, atacar.
3. Si no, avanzar hacia él usando el pathfinding más simple que funcione.
4. Si no puede avanzar ni atacar, esperar.

La IA debe ser determinista y testeable.

# Controles provisionales

| Tecla | Acción |
|---|---|
| `WASD` / flechas | Mover al jugador activo. |
| `Espacio` / `Enter` | Atacar al enemigo adyacente. |
| `E` | Terminar turno. |
| `R` | Reiniciar la sala. |
| `F1` | Alternar overlay de debug. |

En el futuro hotseat se reutilizarán las mismas teclas para el jugador activo.
En la fase remota, el móvil enviará comandos equivalentes.

# Victoria y derrota

- **Victoria**: no quedan enemigos vivos.
- **Derrota**: no quedan jugadores vivos.
- Al terminar, se muestra un overlay con el resultado y la opción de reiniciar.

# Ajuste futuro

Estos valores se podrán comparar en experimentos interactivos:

- coste diagonal 1 frente a 1,5;
- 4, 6 u 8 MP;
- atacar antes o después de mover;
- una acción frente a puntos de acción;
- velocidad y claridad de la cámara.
