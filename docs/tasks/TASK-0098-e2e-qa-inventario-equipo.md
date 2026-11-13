---
type: Task
id: TASK-0098
title: "E2E y QA visual del inventario y el equipo"
description: "Cubrir en navegador el panel con teclado, equipar y desequipar, recoger y soltar, mochila llena, costes de MP sin acción y ausencia de G y 1-3, con capturas de 1280×720 y 900×700."
status: stable
task_status: done
task_type: test
requirement: REQ-018
requirement_ids: [T-012]
depends_on: [TASK-0095, TASK-0096]
unlocks: [TASK-0097]
created_at: 2026-11-13T19:22:51Z
completed_at: 2026-11-13T21:31:00Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0098/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T19:22:51Z }
verified:
  - by: task-lead
    at: 2026-11-13T21:23:00Z
    note: >-
      Intento 1 verificado (commits `fdf862f` y `8cb1a7e`). Reejecutados
      `pnpm run verify` (1249/1249), `pnpm run test:e2e` (131/131) y los seis
      specs tocados con `--repeat-each=3` (90/90), además del spec nuevo en
      Chromium con ventana (`--headed`, 8/8). Diff revisado: solo
      `tests/e2e/**` y `artifacts/TASK-0098/**`, sin tests borrados, saltados
      ni aserciones debilitadas. El criterio «E2E de arma a dos manos con
      escudo» quedó bloqueado porque el catálogo no tiene armas `hands: 2`.
  - by: task-lead
    at: 2026-11-13T21:31:00Z
    note: >-
      Cierre tras la enmienda aceptada: REQ-018 v5 (R-004) deja este corte sin
      arma a dos manos jugable y REQ-019 v3 (T-013) recibe el E2E diferido; la
      tarea retira el criterio y su captura y lo deja en No objetivos. La regla
      sigue cubierta en unitarios (`tests/unit/game/inventory.test.ts:609`).
      `pnpm run docs:check` OK (469 documentos, 98 tareas) y `pnpm run verify`
      OK (1249/1249, build y bundle). No se repite el E2E porque desde el
      intento 1 solo cambiaron documentos; 131/131 y 90/90 siguen vigentes.
      Sin referencias al criterio diferido fuera de No objetivos.
---

# Objetivo

Que un recorrido real de navegador demuestre que el inventario y el equipo se
gestionan solo con teclado desde el panel, que los costes y rechazos son los
decididos y que los sprites y el debug coinciden con el estado.

# Contexto

- Modelo, operaciones, panel, sprites y debug llegan de TASK-0094 a TASK-0096.
- Los specs viven en `tests/e2e/`; el helper de MP compartido es de TASK-0032 y las
  capturas usan `E2E_ARTIFACTS_DIR` con sufijo de repetición.
- [REQ-018](../requirements/REQ-018-inventario-equipo.md#requisitos-técnicos)
  T-012; [REQ-017](../requirements/REQ-017-feedback-visual-eventos.md) para los
  cues; [REQ-006](../requirements/REQ-006-movimiento-animado.md) para el bloqueo
  durante animaciones.
- Hay que conservar los tests de combate y recogida existentes, actualizándolos
  donde ya no exista `G`.

# Criterios de aceptación

- [ ] E2E de apertura y cierre del panel con `I` y `Escape`, con el mapa bloqueado
      mientras está abierto y la zona del suelo omitida si el tile está vacío.
- [ ] E2E de equipar y desequipar solo con teclado, comparación y desglose de
      stats visibles, y cobro de 1 MP sin consumir acción.
- [ ] E2E de recoger y soltar con 1 MP, con la mochila llena rechazando sin mover
      nada y con el objeto equipado volviendo al suelo al soltarlo.
- [ ] E2E de equipar desde el suelo con la mochila llena: rechazo sin mover nada.
- [ ] E2E de que `G` no recoge y `1`-`3` no cambian de arma.
- [ ] Los sprites del suelo y del panel se ven y coinciden con el objeto; `F1`
      muestra mochila, equipo, capacidad y objetos del suelo.
- [ ] Capturas de 1280×720 y 900×700 con panel abierto, mochila llena y suelo
      vacío; la mesa las puede leer sin ayuda.
- [ ] `pnpm run verify` y `pnpm run test:e2e` pasan; los specs de combate,
      movimiento y feedback conservan su intención; sin tests debilitados.

# Plan de test

- Unitario: no aplica; el motor ya está cubierto por TASK-0094.
- Integración: los helpers de MP y de estado siguen sirviendo para las esperas.
- E2E / visual: los casos de arriba, con `--repeat-each=3` sobre los specs tocados.
- Manual: revisar las capturas y repetir la gestión completa con teclado.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0098/attempt-1/report.md`
- [ ] Salida de `pnpm run verify` y `pnpm run test:e2e`
- [ ] Capturas en `<spec>/screenshots/` con `E2E_ARTIFACTS_DIR`
- [ ] Commit SHA en la rama `task/TASK-0098`

# Restricciones

- No cambiar reglas, costes, catálogo ni UI para que pase el test.
- No añadir hooks de test fuera de `?test=1`.
- No reescribir evidencia histórica de otros artefactos.
- Sin dependencias nuevas.

# No objetivos

- E2E de arma a dos manos con escudo: este corte no tiene ninguna arma a dos
  manos en el catálogo (REQ-018 R-004 v5); la regla queda cubierta en unitarios y
  su E2E pasa a la tarea de REQ-019 que añade la maza.
- Traits (`REQ-019`), cofres y cadáveres (`REQ-020`).
- Hotseat, guardado y HUD lateral.
