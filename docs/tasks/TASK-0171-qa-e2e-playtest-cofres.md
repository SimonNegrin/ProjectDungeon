---
type: Task
id: TASK-0171
title: "QA/E2E y playtest de cofres, botín y maza circular"
description: "Cubrir con E2E y QA visual el ciclo completo de cofres y el determinismo del botín, y preparar el playtest que valida por fin el ataque circular de REQ-019."
status: stable
task_status: done
task_type: qa
requirement: REQ-020
requirement_ids: [R-001, R-002, R-003, R-004, R-005, R-008, R-010, R-011, R-012, T-009, T-010]
depends_on: [TASK-0170]
unlocks: [TASK-0172]
created_at: 2026-11-16T16:20:04Z
completed_at: 2026-11-16T19:00:20Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0171/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T16:20:04Z }
verified:
  - by: game-lead
    at: 2026-11-16T19:00:20Z
    note: >-
      Intento 1 verificado (`ed9619b0`, `398fbdef`, `2f659c75`) tras corregir
      el banner de feedback tapado por el panel. Siete criterios firmados: E2E
      real con semilla 295, Cofre/Suelo exclusivos, cofre vacío persistente,
      guardado/carga sin repetir tiradas, curva 1/6 jugadores, capturas a dos
      tamaños y 290 E2E. Playtest de la maza preparado y pendiente de usuario.
      Detalle en `attempt-1/lead-verify/verification.md`.
---

# Objetivo

Que el hito de cofres quede probado de punta a punta —aparición, botín, apertura,
transferencia, guardado y feedback— y que el usuario pueda playtestear la maza
circular con una fuente jugable, según [REQ-020](../requirements/REQ-020-cofres-saqueo.md#requisitos-creativos-decididos).

# Contexto

TASK-0167 a TASK-0170 dejan motor y UI. Las piezas de traits de
[REQ-019](../requirements/REQ-019-traits-objetos.md) no se han podido probar en
mesa; este es el primer corte con cofres. La evidencia E2E se filtra por spec con
`E2E_ARTIFACTS_SPECS` ([TASK-0163](TASK-0163-arnes-artefactos-e2e-filtrados.md)).

# Criterios de aceptación

- [x] E2E: partida nueva con semilla fija genera cofres en salas no-spawn, abre
      uno con `Espacio`/`Enter`, coge todo, deposita y comprueba el coste de la
      acción.
- [x] E2E: la columna derecha alterna «Cofre» y «Suelo» sin mezclar fuentes; el
      HUD muestra el cofre cerrado sin contenido y el contenido al abrirlo.
- [x] E2E: el cofre abierto y vacío permanece; el guardado y la carga conservan
      cofres, contenido y estado sin repetir tiradas.
- [x] QA visual a 1280×720 y 900×700 de las dos vistas, con feedback de apertura y
      transferencia y sin CLS.
- [x] Prueba de la curva: con el equipo inicial hay al menos una mejora por nivel
      y las cuatro piezas de traits son alcanzables con semillas fijas.
- [x] Playtest preparado: ruta de la maza circular y qué debe mirar el usuario
      (alcance del ataque circular, daño, sensación de mejora y ritmo de cofres).
- [x] `pnpm run verify` pasa y la evidencia queda en el informe.

# Plan de test

- Unitario: ninguno nuevo; se apoya en TASK-0167 a TASK-0170.
- Integración: dos semillas con 1 y 6 jugadores.
- E2E / visual: `tests/e2e/chests.spec.ts` nuevo; capturas en
  `<spec>/screenshots/`.
- Manual: playtest con la maza circular.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0171/attempt-1/report.md`
- [ ] Salida de `pnpm run verify`
- [ ] Capturas E2E de «Cofre», «Suelo» y feedback
- [ ] Commit SHA

# Restricciones

- Sin cambios de reglas ni de botín; un defecto se documenta y se corrige con
  tarea propia o dentro de este intento si es del hito y no cambia criterios.
- No relajar tests de REQ-018, REQ-021, REQ-031 ni REQ-034.
- Handoff 2 KB, tope duro 4 KB; pnpm, nunca npm.

# No objetivos

- Ajuste de valores por los resultados del playtest: se decide con el usuario.
- Documentación y ADR (TASK-0172).
- Cofres cerrados, llaves y trampas.
