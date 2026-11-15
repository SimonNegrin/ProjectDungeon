---
type: Task Report Detail
title: "TASK-0151: detalle del informe del intento 1"
description: Detalle de la fricción de layout del HUD y del reparto de specs E2E.
task: TASK-0151
attempt: 1
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T22:35:00Z }
---

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| El brief de HUD asume que una frase corta («Jugador N de M») cabe en la misma fila que el nombre, pero la columna de datos del HUD izquierdo mide ~92 px | Medición en Chromium a 1280×720: `.hud-character-data` 91,8 px con `--ui-scale` 1,6; «Jugador 1 de 2» necesita ~125 px; el brief pide «misma fila que el nombre» si no cabe | Se permite el salto en dos líneas; `hud-left-zones-qa` y `hud-three-zones-qa` siguen verdes (sin recorte ni scroll) | Cualquier tarea futura que añada texto junto al nombre del HUD repetirá la medición y la discusión sobre compactar | Anotar en el brief de HUD el ancho útil de la columna o pedir explícitamente la variante de línea completa bajo la miniatura | Bajo; no cambia criterios, no relaja tests | `pending` |

# Reparto de la ejecución E2E

Cada spec se ejecutó en un proceso de Playwright independiente con el servidor
`webServer` propio y 180 s de timeout de herramienta; no se ejecutó la suite
completa porque supera el timeout del intento. Las capturas y los `.zip` de
escenario se escribieron bajo `attempt-1/e2e/<spec>/` con `E2E_ARTIFACTS_DIR`.

# Nota sobre el reloj del aviso

`settle` equivale a `advance(1_000_000)` y consume solo lo que queda de la
timeline; el banner de ronda conserva 2000 ms menos el tramo posterior a su cue
(~350 ms), por eso sigue visible tras `settle` y se apaga al avanzar
`FEEDBACK_CONFIG.texts.roundBannerMs`.
