---
type: Experiment
id: EXP-002
title: Ritmo del movimiento animado
description: Compara duraciones de paso, pausa por tile y tratamiento de la diagonal para elegir el ritmo con el que los personajes recorren el camino.
status: draft
experiment_status: ready
question: ¿Qué duración de paso, pausa por tile y tratamiento de la diagonal hacen que recorrer el camino se sienta ágil y legible?
related_requirements: [REQ-006]
seed: 279837264
parameters:
  stepMs: 125
  pauseMs: 50
  diagonal: constant-speed
decision:
decided_by:
decided_at:
created_at: 2026-11-08T09:51:14Z
updated_at: 2026-11-08T09:51:14Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T09:51:14Z }
verified:
---

# Propósito

Responder una sola pregunta: qué ritmo debe tener el recorrido animado de
[REQ-006](../../docs/requirements/REQ-006-movimiento-animado.md). El resto de la
experiencia ya está decidida: jugador y enemigos se animan, la cámara sigue a
píxel entero, el input se bloquea y el cursor se oculta mientras se camina.

Este experimento no decide **si** hay pausa ni **cómo** sigue la cámara: decide
**cuánto dura un paso**, **cuánto dura la pausa** y **cuánto tarda la diagonal**.
La cámara continua es una constante de la maqueta para que el ritmo se juzgue con
la sensación real.

# Hipótesis

- Un paso demasiado corto se lee como un teletransporte suave y no permite
  distinguir los tiles; uno demasiado largo hace que mover 6 MP se sienta lento.
- Sin pausa, el recorrido parece un deslizamiento continuo; con demasiada pausa,
  el personaje parece dudar en cada tile.
- En diagonal, la velocidad constante (≈1,41× de duración) se percibe más natural
  que una duración constante, que acelera visualmente la diagonal.
- El preset Medio (125 ms + 50 ms) debería quedar cerca del equilibrio, pero la
  decisión es del usuario.

# Opciones

| Variante | Paso | Pausa | Lectura esperada |
|---|---:|---:|---|
| A · Ágil | 90 ms | 30 ms | Rápido y responsive; puede costar ver los tiles intermedios. |
| B · Medio | 125 ms | 50 ms | Equilibrio entre legibilidad y ritmo; el camino de 6 pasos ronda 1 s. |
| C · Pausado | 160 ms | 75 ms | Muy legible, casi táctico; puede sentirse lento al gastar 6 MP. |

Además de los presets, los sliders permiten ajustar el paso (40–250 ms) y la
pausa (0–200 ms), y el selector de diagonal permite comparar:

- **Velocidad constante:** la diagonal tarda `paso × √2` (≈1,41×).
- **Duración constante:** la diagonal tarda lo mismo que un paso recto y se
  percibe más rápida.

# Cómo usarlo

1. Abrir `/experiments/EXP-002-ritmo-movimiento/`.
2. Elegir el escenario **corto** (2–3 pasos) o **largo** (6 pasos con una
   diagonal y borde de mapa) y pulsar **Recorrer**.
3. Comparar A, B y C con la misma semilla y el mismo escenario.
4. Ajustar los sliders y el modo de diagonal; repetir hasta que el recorrido se
   sienta correcto.
5. Observar la cámara, el MP que baja paso a paso y la pausa en el destino.
6. Elegir un preset o dejar los valores personalizados, añadir notas y exportar
   el JSON de decisión.

Durante la reproducción las teclas de juego se ignoran y el cursor no se dibuja,
igual que en el juego. Al terminar aparece el aviso **Listo** y se puede repetir.

# Métricas

- `stepMs`, `pauseMs` y modo de diagonal de la opción elegida.
- Duración total del camino largo (6 pasos) con esos valores.
- Número de pasos y si el escenario incluye diagonal.
- Notas del usuario sobre legibilidad, cámara y sensación de bloqueo.

# Observaciones

Rellenar después de la prueba. Registrar al menos la variante elegida, los
valores exactos y si la diagonal se prefiere a velocidad constante o a duración
constante.

# Decisión

- Opción:
- `stepMs`:
- `pauseMs`:
- Diagonal:
- Motivo:
- Fecha:
- Decidido por:
- Semilla y escenario usados:

# Evidencia

- JSON de decisión en `results/`.
- Capturas de A/B/C y del escenario largo.
- Informe de `TASK-0017` en `artifacts/TASK-0017/attempt-1/report.md`.

# Siguientes pasos

- Actualizar `REQ-006` a v2 con los valores decididos y marcarla `stable`.
- Crear las tareas de implementación: host/render/cámara, input/HUD, E2E y QA
  visual.
- Archivar el experimento o dejarlo como referencia; no se importa desde
  producción.
