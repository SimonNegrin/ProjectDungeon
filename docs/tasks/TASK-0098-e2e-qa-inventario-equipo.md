---
type: Task
id: TASK-0098
title: "E2E y QA visual del inventario y el equipo"
description: "Cubrir en navegador el panel con teclado, equipar y desequipar, recoger y soltar, mochila llena, dos manos con escudo, costes de MP sin acción y ausencia de G y 1-3, con capturas de 1280×720 y 900×700."
status: stable
task_status: blocked
task_type: test
requirement: REQ-018
requirement_ids: [T-012]
depends_on: [TASK-0095, TASK-0096]
unlocks: []
created_at: 2026-11-13T19:22:51Z
completed_at:
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0098/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T19:22:51Z }
verified:
  - by: task-lead
    at: 2026-11-13T22:10:00Z
    note: >-
      Bloqueada tras verificar el intento 1 (commits `fdf862f` y `8cb1a7e`).
      Reejecutados `pnpm run verify` (1249/1249), `pnpm run test:e2e`
      (131/131) y los seis specs tocados con `--repeat-each=3` (90/90),
      además del spec nuevo en Chromium con ventana (`--headed`, 8/8).
      Diff revisado: solo `tests/e2e/**` y `artifacts/TASK-0098/**`, sin tests
      borrados, saltados ni aserciones debilitadas. Queda sin cubrir el
      criterio «E2E de arma a dos manos con escudo» y su captura: el catálogo
      vigente no tiene armas `hands: 2`; TASK-0093 difirió la maza a
      REQ-019/REQ-020 y esta tarea prohíbe tocar el catálogo. La regla sí está
      cubierta en unitarios (`tests/unit/game/inventory.test.ts:609`).
      Decisión necesaria en `requirements-writer`: enmendar el criterio o
      añadir la pieza en su tarea de REQ-019.
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
- [ ] E2E de arma a dos manos con escudo puesto: el escudo vuelve a la mochila y,
      si no cabe, se rechaza el cambio entero.
- [ ] E2E de equipar desde el suelo con la mochila llena: rechazo sin mover nada.
- [ ] E2E de que `G` no recoge y `1`-`3` no cambian de arma.
- [ ] Los sprites del suelo y del panel se ven y coinciden con el objeto; `F1`
      muestra mochila, equipo, capacidad y objetos del suelo.
- [ ] Capturas de 1280×720 y 900×700 con panel abierto, mochila llena, dos manos y
      suelo vacío; la mesa las puede leer sin ayuda.
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

- Traits (`REQ-019`), cofres y cadáveres (`REQ-020`).
- Hotseat, guardado y HUD lateral.
