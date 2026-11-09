---
type: Task Brief
title: "TASK-0049: brief del intento 1"
description: Cerrar la QA E2E de growth, las capturas, la guarda de bundle y el paquete de playtest.
task: TASK-0049
attempt: 1
status: stable
brief_bytes: 3196
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T17:50:00Z }
---

# Objetivo

Dejar `growth` cubierto de extremo a extremo como generador por defecto: suite
E2E completa en verde, evidencia visual 1280×720, guarda de bundle, paquete de
playtest reproducible y EXP-004 alineado con la decisión registrada.

# No objetivos

- Cambiar reglas, valores, motor o render salvo bug demostrado con evidencia.
- Promocionar BSP/plantillas, selector runtime, cámara secreta o transición.
- Añadir dependencias, arte final o tocar `experiments/` fuera de EXP-004
  (`_shell` incluido).
- Declarar aprobado el playtest: solo se prepara el paquete.

# Invariantes

- Baseline en `e2e-baseline.txt`: 36 fallos / 38 pasan. Todos deben quedar en
  verde adaptando fixtures y expectativas al BSP actual inyectado, sin borrar,
  saltar ni debilitar aserciones; el recuento de tests no baja.
- Usar `openBspState`/`?test=1` para BSP y `waitForFunction`/`settle`; nada de
  esperas fijas. Reutilizar `tests/e2e/support.ts`.
- Producción no cambia de comportamiento; `dist/` sigue sin `buildBsp`,
  `pickTemplate` ni entry de EXP-004.
- Semilla `2738263054`: 22×18, 5 salas, grupo de 6, 11 enemigos y salida
  `door`; dos cargas idénticas.

# Criterios de aceptación

`../../docs/tasks/TASK-0049-e2e-qa-playtest-growth.md#criterios-de-aceptación`.
No copiar ni reinterpretar: cada criterio se verifica con evidencia.

# Contexto mínimo

- `tests/e2e/support.ts`: `openBspState`, `settle`, `walkTo`, `moveCursorTo`.
- Fallos por grupo y causa: `artifacts/TASK-0048/attempt-1/report-detalle.md`.
- `tests/e2e/host-growth-render-qa.spec.ts`: cobertura growth existente (semillas
  1/6/4/3); completar sin duplicar.
- `tests/e2e/artifacts.ts` y `playwright.config.ts`: servidor 4173 y
  `E2E_ARTIFACTS_DIR` → `<spec>/screenshots/`.
- `scripts/check-bundle.mjs` y `package.json`.
- `experiments/EXP-004-salas-irregulares/src/main.ts`: defaults actuales difieren
  del JSON en `roomMax` (9/8), `megaRoomChance` (17/15), `numPlayers` (3/6),
  `enemyPlayersFactor` (1.35/1.2) y `hiddenEnemyChance` (0.5/0.25).
- `experiments/EXP-004-salas-irregulares/results/decision-2026-11-09T14-59-21Z.json`.
- Requisitos: REQ-011 R-013, REQ-012 R-012, REQ-013 R-003/R-006.

# Artefactos

`artifacts/TASK-0049/attempt-1/`: `report.md`, `e2e-output.txt`,
`e2e-repeat-output.txt`, `verify-output.txt`, `bundle-output.txt`,
`screenshots/`, `playtest/` (`README.md`, `config.json`, `checklist.md`) y
`e2e-baseline.txt` (ya presente). Commit en `task/TASK-0049`.

# Riesgos y decisiones abiertas

- Preferir posiciones derivadas del snapshot/setup explícito antes que nuevas
  coordenadas frágiles; nunca relajar la intención de la aserción.
- EXP-004: preset o defaults actualizados, pero el JSON exportado debe contener
  los parámetros de la decisión; actualizar `experiment.md` si cambian defaults.
- El playtest de sensación queda para el usuario; el informe no lo aprueba.
