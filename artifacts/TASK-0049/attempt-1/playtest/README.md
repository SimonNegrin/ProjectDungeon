---
type: Playtest Guide
title: "TASK-0049: arranque del playtest growth"
description: Comando de arranque, semilla y configuración registrada para el playtest de growth.
status: draft
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T19:30:00Z }
---

# Playtest growth · TASK-0049

Paquete de arranque, **no aprobado**: la valoración de sensación la hace el
usuario.

## Arranque

```sh
pnpm install
pnpm run dev
```

Abrir `http://127.0.0.1:5173/?seed=2738263054`.

- `F1`: debug (spawn, salida, bocas, enemigos, puntos calientes, paletas).
- `R`: reiniciar la misma semilla.
- `F2`: nueva semilla.
- `E`: terminar turno; `Espacio`: moverse/interactuar; `F`: atacar.

La configuración registrada está en `config.json` y coincide con
`experiments/EXP-004-salas-irregulares/results/decision-2026-11-09T14-59-21Z.json`.

## Alcance de la semilla

22×18, 5 salas, grupo de 6, 11 enemigos y salida `door` en `(21,10)` con acceso
en `(20,10)`. El viewport de juego es 13×13 tiles.

## Capturas de referencia

- `../host-growth-render-qa/screenshots/growth-playtest-normal.png`
- `../host-growth-render-qa/screenshots/growth-playtest-debug.png`
- `../host-growth-render-qa/screenshots/growth-playtest-exit.png`

## Después del playtest

Anotar en `checklist.md` si densidad, emboscadas o representación de la salida
piden ajustes. Cualquier cambio de reglas o valores necesita requisito y tarea;
este paquete no los modifica.
