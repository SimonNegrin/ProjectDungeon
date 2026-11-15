---
type: Task Report
title: "TASK-0139: informe del intento 2"
description: Corrección de la regresión de input tras cerrar el panel por el guard de la pausa.
task: TASK-0139
attempt: 2
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T17:20:00Z }
artifacts: artifacts/TASK-0139/attempt-2/
verified:
---

# Estado

`success`. Se corrige solo la regresión del intento 1: el input vuelve a
procesarse tras cerrar el panel; pausa y `Esc` conservan su comportamiento.

# Diagnóstico

Hipótesis confirmada. El guard `if (event.defaultPrevented) return;` del
listener global descartaba la primera flecha cuando el foco seguía en una fila
oculta del panel: el keydown del panel hacía `preventDefault` y el host no
movía el cursor. No era un fallo del motor ni del cierre de la pausa.

# Cambios

- `src/host/main.ts`: fuera el guard global `event.defaultPrevented`.
- `src/host/pause-menu-view.ts`: las teclas que consume la pausa (`Esc`, `Tab`,
  `Enter`/Espacio y flechas/W-S de la raíz) llaman a `preventDefault` y
  `stopImmediatePropagation`; el host ya no recibe el `Esc` que cierra/reanuda.
- `tests/e2e/hud-vertical-lists-qa.spec.ts`: comprueba de forma determinista que
  la primera `ArrowRight` tras cerrar el panel mueve el cursor.
- Commit: `f0dbe24`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run test:e2e tests/e2e/hud-vertical-lists-qa.spec.ts --repeat-each=40 --workers=4` | 40/40 | `e2e-output.txt` |
| `pnpm run test:e2e tests/e2e/pause-menu.spec.ts` | 4/4 | `e2e-output.txt` |
| `pnpm run test:e2e` | 241/241 | `e2e-output.txt` |
| `pnpm run verify` | OK (1649 unitarios, build y bundle) | `verify-output.txt` |

# Desviaciones

- Ninguna de alcance. Las capturas y la evidencia del intento 1 no se tocan.

# Problemas conocidos y preguntas abiertas

- Sigue pendiente retirar los botones «Reiniciar» del resultado en `TASK-0144`
  si el lead lo considera parte de «sin reinicio rápido».
- Guardar (`TASK-0140`) y Cargar (`TASK-0141`) siguen sin archivo.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 0 (instrucción directa del lead) |
| `report_bytes` | 2220 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
