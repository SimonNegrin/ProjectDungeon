---
type: Task Brief
title: "TASK-0048: brief del intento 1"
description: Render y debug del mapa growth en el host, con BSP intacto.
task: TASK-0048
attempt: 1
status: stable
brief_bytes: 2552
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T17:20:00Z }
---

# Objetivo

Que el host dibuje y exponga `growth` como en `EXP-004`: máscaras de sala,
puertas con estilo, bocas abiertas sin puerta, grupo de 6, entrada/salida y
enemigos del generador; `F1` añade debug sin cambiar el juego normal. BSP se ve
y funciona igual.

# No objetivos

- Transición de nivel, cámara secreta, arte/sprite nuevo, dependencias.
- `experiments/`, `index.html`, `public/` y valores creativos aprobados.
- QA E2E completa de `growth` (TASK-0049) y bundle (TASK-0047).

# Invariantes

- Host de solo lectura; sin `Math.random` ni relojes; misma semilla ⇒ mismo render.
- `roomAt` y el suelo usan `Room.cells`; sin máscara, caja (BSP).
- Sin `F1` no aparece información nueva; el HUD normal no cambia.
- No borrar, saltar ni debilitar tests; contrato BSP intacto.

# Criterios de aceptación

Viven en `docs/tasks/TASK-0048-host-render-spawn-puertas-salida.md#criterios-de-aceptación`.
Enlazar; no copiar.

# Contexto mínimo

- `src/host/{renderer,floor,assets,wall,debug,hud,main,session}.ts`.
- `src/game/map.ts` (`Room.cells`, `Door.style`, `Exit`, `MapEnemy`).
- `src/game/chambers/variants/growth.ts` y `core/{plan,contents,doors,enemies}.ts`:
  `openMouths`/`hotspots` existen pero no en `GeneratedMap`.
- Referencia de solo lectura: `experiments/EXP-004-salas-irregulares/src/render.ts`.
- `REQ-011` R-013, `REQ-012` R-012, `REQ-013` R-003/R-006/T-007.

# Artefactos

En `artifacts/TASK-0048/attempt-1/`: `report.md`, `test-output.txt`,
`verify-output.txt`, `e2e-output.txt`, `screenshots/`, `logs/`. Capturas
1280×720: normal, `F1` on/off, caverna, pasillo ancho, spawn, entrada/salida y
13×13; semillas deterministas con el core. Usa `E2E_ARTIFACTS_DIR`.

# Riesgos y decisiones abiertas

- `GeneratedMap` sin `openMouths`/`hotspots`: preferido añadir campos opcionales
  y poblarlos desde `growth` con tests; sin tocar BSP.
- Salida: `door` sobre muro del borde no abre paso; escaleras en suelo con
  recorte local tipo `STAIR_RECTS`; cruzar no inicia transición.
- E2E: baseline de 50 fallos por fixtures BSP 32×32. Adapta
  inyectando `BspMapGenerator` donde el caso pruebe BSP; cobertura `growth`
  completa a TASK-0049; documenta fallos restantes con evidencia y asígnalos.
  No debilites aserciones ni empeores el baseline.
