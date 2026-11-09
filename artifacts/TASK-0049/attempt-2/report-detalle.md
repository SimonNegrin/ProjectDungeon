---
type: Task Report Detail
title: "TASK-0049: detalle del intento 2"
description: Texto pendiente de EXP-004 y diagnóstico del flake de captura.
task: TASK-0049
attempt: 2
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T19:40:00Z }
---

# Texto pendiente de EXP-004

Sustituir el paso 10 de
`experiments/EXP-004-salas-irregulares/experiment.md` por:

> 10. Reproducir la decisión registrada: `growth` con la semilla `2738263054` y la
>     configuración de playtest. Los defaults de los sliders ya coinciden con el
>     JSON de decisión (22×18, 5 salas, salas 3-8, pasillo 3, ancho 33 %, muro 1,
>     caverna 15 %, spawn 6, 6 jugadores, 0,02/1,2, emboscadas 0,25 y
>     `exitMode: random`), así que basta abrir con esa semilla sin tocar los
>     controles; las otras variantes siguen disponibles para comparar y se
>     promoverán solo si se piden expresamente.

No se aplicó porque `.opencode/agents/task-runner.md` (líneas 21-23) deniega la
edición de `experiments/**/experiment.md` a `task-runner`.

# Diagnóstico del flake

- `shot-a.png`/`shot-b.png` del lead difieren en 4 píxeles con delta 1:
  `(122,82)`, `(122,83)`, `(122,84)` y `(123,84)`.
- La geometría del HUD, marco, canvas y stage es idéntica entre cargas
  (rects con la misma precisión); el `toDataURL` del canvas también.
- La zona corresponde a la esquina inferior izquierda redondeada del panel HUD,
  no al canvas.
- Esperar canvas/fuentes y capturar dos veces el mismo test dejaba 1 fallo en 80.
- Promover el HUD con `will-change: transform` dio 0 fallos en 150 comparaciones
  de esa región y 0 en 100 ejecuciones del test completo.
