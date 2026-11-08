---
type: Playtest Note
title: "TASK-0025: playtest de EXP-003"
description: Decisión A de human:simon y observaciones sobre dificultad y cooperativo.
task: TASK-0025
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T17:21:00Z }
---

# Decisión

- Experimento: EXP-003.
- Opción: **A · Propuesta** (tabla de REQ-010).
- Semilla: 1017; 1.000 duelos.
- Referencia: jugador contra centinela, 30/36 de impacto, 2,63 ataques
  esperados para matar, 991/9 victorias y 5,65 turnos medios.
- JSON: `experiments/EXP-003-mesa-combate/results/decision-2026-11-08T17-18-00Z.json`.

# Comentario de human:simon

> La tabla se siente un poco fácil, el jugador gana los combates por amplio
> margen aunque pierde puntos de vida. Entiendo que porque son combates
> singulares. En una partida real el jugador puede enfrentarse a varios enemigos
> simultaneamente lo que hará la experiencia algo más difícil. Esto me ha hecho
> pensar en como ajustarla dificultad cuando hayan múltiples jugadores
> cooperando. Una idea podría ser simplemente aumentar el número de enemigos. O
> quizás añadir un factor numerico que incremente con el número de jugadores y
> que multiplique todas las habilidades de los enemigos.

# Lectura

- La tabla A se acepta para el combate singular de este corte; la sensación de
  facilidad se explica por el duelo 1 contra 1 y por la ventaja de PV del
  jugador.
- El escalado por número de jugadores es una idea de **cooperativo**, fuera de
  EXP-003 y de REQ-010. No se implementa, no se decide y no se convierte en
  tarea en este intento. Queda anotada para el corte de cooperativo (fase 2),
  con dos palancas por comparar: más enemigos o un multiplicador de habilidades
  enemigas por jugador.
- El registro formal de `decision`, `decided_by` y `decided_at` en EXP-003 y la
  actualización de REQ-010 corresponden a `requirements-writer`; este intento no
  los toca.
