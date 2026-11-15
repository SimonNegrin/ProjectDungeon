---
type: Task Brief
title: "TASK-0144: brief del intento 1"
description: QA E2E de pausa, guardado y carga; bloqueo si el resultado aún ofrece pausa o reinicio.
task: TASK-0144
attempt: 1
status: stable
brief_bytes: 2099
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T19:00:00Z }
---

# Objetivo

Añadir un spec E2E de QA que cubra los criterios 1-8 en navegador real, con
capturas y salidas. Si el resultado ofrece pausa o reinicio, no lo arregles:
documenta el fallo con evidencia y devuelve `blocked` (propietario TASK-0153).

# No objetivos

- Cambiar `src/`, `index.html`, reglas o UI.
- Tocar TASK-0145, TASK-0153, TASK-0157 ni TASK-0158.
- Probar nube, hotseat, botín o audio.

# Invariantes

- pnpm; nunca npm ni npx. Timeouts de la ficha.
- No borrar, saltar ni debilitar tests existentes.
- Ida y vuelta con archivo real: descarga → recarga → carga.

# Criterios de aceptación

`docs/tasks/TASK-0144-qa-e2e-pausa-guardado-carga.md#criterios-de-aceptación`.

# Contexto mínimo

- Specs: `tests/e2e/{pause-menu,save-game,load-game}.spec.ts`; helpers en
  `tests/e2e/support.ts` y `artifacts.ts`.
- Carga/límites: `src/host/load-game.ts`, `src/host/save-zip.ts`; guardado:
  `src/host/save-game.ts`; pausa: `src/host/pause-menu.ts`.
- Resultado: overlays «Reiniciar» en `index.html`, cableado en
  `src/host/main.ts`; `Esc` → pausa en `src/host/input.ts`. Es de TASK-0153.
- REQ-024 R-012/T-015: `docs/requirements/REQ-024-menu-pausa-guardado.md`.

# Artefactos

- `report.md`, `e2e-output.txt`, `verify-output.txt`, `screenshots/`,
  `probe/` si hay defecto y SHA(s).

# Riesgos y decisiones abiertas

- Sospecha: el resultado muestra «Reiniciar» y `Esc` abre la pausa. Confírmalo
  con un probe E2E; si falla, `blocked` con salida y captura, sin tocar
  producción.
- Los `.zip` inválidos se construyen en el test (rutas, entradas extra, >4
  entradas, >5 MB comprimido, >20 MB/5 MB descomprimido), sin red.
- `pnpm run test:e2e` pasa con el spec QA; el probe del defecto se ejecuta
  aparte y queda como artefacto, no como test rojo en la suite.
