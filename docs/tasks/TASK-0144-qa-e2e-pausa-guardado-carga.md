---
type: Task
id: TASK-0144
title: "QA/E2E de pausa, guardado y carga"
description: "Cubrir la pausa global, el menú de cinco botones, el guardado restringido, la descarga `.zip`, la carga `.zip`/`.json`, los límites y el resultado sin guardado."
status: stable
task_status: blocked
task_type: qa
requirement: REQ-024
requirement_ids: [R-001, R-002, R-003, R-004, R-005, R-006, R-007, R-008, R-009, R-010, R-011, R-012, R-013, R-014, R-015, T-010]
depends_on: [TASK-0139, TASK-0140, TASK-0141, TASK-0153]
unlocks: []
created_at: 2026-11-14T23:31:45Z
completed_at:
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0144/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T23:31:45Z }
verified:
  - by: task-lead
    at: 2026-11-15T19:15:00Z
    note: >-
      Intento 1 verificado parcialmente (spec `a94f406`, evidencia `5d6e330`).
      Criterios 1-6 y 8 correctos: `pnpm run verify` 107/1678 y `pnpm run
      test:e2e` 258/258 reejecutados por el lead, capturas revisadas y probe
      reproducido. Criterio 7 bloqueado por defecto real: Victoria y Derrota
      siguen ofreciendo «Reiniciar» y `Esc` abre la pausa (REQ-024 R-012/T-013);
      propietario TASK-0153. Sin cambios de producción ni tests debilitados.
---

> **Bloqueada (2026-11-15).** El criterio 7 queda pendiente de TASK-0153, ahora
> en `depends_on`. Al cerrar TASK-0153 se verificará el resultado y se endurecerá
> el test de resultado del spec QA; allí deberá ajustarse
> `tests/e2e/game-input-hud.spec.ts:373`, que pulsa «Reiniciar».

# Objetivo

Que la pausa, el guardado y la carga queden verificados en navegador real, con
un archivo de ida y vuelta, rechazos limpios y sin partida rota.

# Contexto

TASK-0139 a TASK-0141 implementan pausa, guardado y carga. Esta tarea mide y
reporta; no cambia reglas. Los defectos vuelven a su tarea. La cobertura de botín
y cadáveres es TASK-0142; aquí se comprueba que el guardado los conserva.

# Criterios de aceptación

- [x] `Esc` abre y cierra la pausa desde personajes, enemiga y animación; con el
      panel abierto, el primer `Esc` cierra el panel.
- [x] La pausa congela turnos, beats y animaciones; el input de juego se ignora;
      reanudar continúa sin saltos.
- [x] El menú muestra Reanudar, Nueva partida, Cargar partida, Guardar partida y
      Controles en orden; la navegación por teclado y `Esc` funcionan.
- [x] Guardar solo está activo en fase de personajes y sin animación; en enemiga
      se desactiva con motivo; el nombre y el manifiesto son correctos.
- [x] Cargar desde el menú principal y desde la pausa; en pausa confirma; un
      archivo inválido no altera la partida; cargar restaura activo, ronda,
      cámara y HUD sin aviso de ronda.
- [x] Se rechazan archivos con rutas, entradas extra o tamaño por encima de los
      límites.
- [ ] El resultado no ofrece pausa ni guardado; no existe reinicio rápido ni `R`.
- [x] Capturas de pausa, menú, controles y error de carga; `pnpm run test:e2e` y
      `pnpm run verify` pasan.

# Plan de test

- Unitario: `pnpm run verify`.
- Integración: guardar, recargar la página y cargar el `.zip`; cargar un `.json`.
- E2E / visual: spec de pausa, guardado y carga con capturas.
- Manual: comprobar que la partida cargada se ve en estado final.

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0144/attempt-1/report.md`
- [x] Salida de `pnpm run test:e2e` y `pnpm run verify`
- [x] Capturas de pausa, menú, controles y error
- [x] Commit SHA `a94f406` (spec) y `5d6e330` (evidencia)

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm run test:e2e` | 240 s |
| `pnpm run verify` | 240 s |

# Restricciones

- No cambiar reglas, UI ni criterios; los defectos vuelven a su tarea.
- No debilitar, borrar ni saltar tests existentes.
- No probar la nube, cuentas ni autoguardado.
- Handoff: brief 1,5 KB, informe 2 KB; tope duro 4 KB.
- pnpm, nunca npm ni npx.

# No objetivos

- QA de botín, hotseat o pantalla de inicio.
- Migrar formatos antiguos.
- Probar audio.
- Rediseñar el menú de pausa.
