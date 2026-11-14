---
type: Task Brief
title: "TASK-0104: brief del intento 1"
description: Escala continua ligada al marco, paleta de ocho colores y relieve de biseles en la UI de juego.
task: TASK-0104
attempt: 1
status: stable
brief_bytes: 3273
read_detail: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T12:12:39Z }
---

# Objetivo

Toda la UI de juego —HUD, ficha, panel, lista de hechizos, submenú, banners,
marcas de daño y cursor— consume una única escala derivada del marco, los ocho
colores aprobados y un relieve de biseles outset/inset. Desaparecen tamaños
fijos, `clamp()` de viewport y el vocabulario web moderno (radios, sombras
suaves, degradados, blur y translucidez). La composición del HUD, la ficha y el
panel se rehace en TASK-0105/0106/0107; el cursor superpuesto en TASK-0108.

# No objetivos

- Recomponer HUD izquierdo, ficha derecha, panel, cadáveres o cursor.
- Cambiar el render del mundo, reglas, costes, navegación o snapshot.
- `F1`, pantalla de inicio o pausa; arte nuevo o dependencias.

# Invariantes

- Marco 16:9 y mapa 13×13 intactos; el canvas interno 2218×1248 no cambia.
- Una sola escala `--ui-scale` publicada desde `layout.ts`/`main.ts`; ningún
  tamaño de UI de juego queda en `rem` fijo, `px` fijo ni `clamp()`.
- Ocho colores exactos, sin literales fuera del bloque de tokens y sin
  `color-mix()`; biseles con el par claro `#6eb8a8` / oscuro `#2f142f`.
- `computeUiLine` pasa a ser lineal: sin redondeo a píxel de dispositivo ni a
  entero (sustituye REQ-032 R-004/T-002). Se acepta el render fraccionario.
- Los tests existentes se adaptan al contrato nuevo; no se debilitan ni se
  saltan. Cursor y frame-qa se actualizan solo por la paleta.

# Criterios de aceptación

En `docs/tasks/TASK-0104-ui-escala-continua-paleta-relieve.md#criterios-de-aceptación`.

# Contexto mínimo

- `src/host/layout.ts` (`computeFrameLayout`, `computeUiLine`),
  `src/host/main.ts` (`applyPresentation`) y `src/host/ui.css` (tokens y reglas).
- `index.html` y vistas `hud.ts`, `hud-detail.ts`, `inventory-panel-view.ts`,
  `spell-menu-view.ts`, `feedback-overlay-view.ts`, `cursor-view.ts`.
- REQ-033 R-002…R-005, R-016, R-018, T-001…T-003, T-011, con sus anclas.
- **Lee [brief-detalle.md](brief-detalle.md)**: contrato de escala, paleta,
  biseles, tamaños, auditoría de CSS, tests y evidencia.

# Artefactos

`artifacts/TASK-0104/attempt-1/`: `report.md`, `verify-output.txt`,
`e2e-output.txt`, capturas a 1280×720 y 900×700 (HUD, panel, overlays) y commit
en `task/TASK-0104`.

# Riesgos y decisiones del lead

- Los valores 12,8/18,8 px son aproximados (±1). Con el chrome actual el marco
  mide ≈488 px a 900×700 y ≈664 px a 1280×720; una base de ≈11,2 px lógicos
  cumple ambos. No introduzcas breakpoints: ajusta solo la constante lineal si
  la medición real lo exige.
- El footer está fuera de la UI de juego: desacopla su `font-size` de la escala
  para que un ResizeObserver no realimente el tamaño del marco.
- El círculo de visión/alarma conserva geometría circular (`border-radius:50%`);
  es forma, no radio decorativo. El resto de radios desaparece.
- `text-shadow` se sustituye por trazo de texto o fondo sólido; nada de halos.
- No se copian criterios ni requisito en el brief: se enlazan.
