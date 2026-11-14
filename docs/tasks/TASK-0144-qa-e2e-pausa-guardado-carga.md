---
type: Task
id: TASK-0144
title: "QA/E2E de pausa, guardado y carga"
description: "Cubrir la pausa global, el menú de cinco botones, el guardado restringido, la descarga `.zip`, la carga `.zip`/`.json`, los límites y el resultado sin guardado."
status: stable
task_status: backlog
task_type: qa
requirement: REQ-024
requirement_ids: [R-001, R-002, R-003, R-004, R-005, R-006, R-007, R-008, R-009, R-010, R-011, R-012, R-013, R-014, R-015, T-010]
depends_on: [TASK-0139, TASK-0140, TASK-0141]
unlocks: []
created_at: 2026-11-14T23:31:45Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0144/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T23:31:45Z }
verified:
---

# Objetivo

Que la pausa, el guardado y la carga queden verificados en navegador real, con
un archivo de ida y vuelta, rechazos limpios y sin partida rota.

# Contexto

TASK-0139 a TASK-0141 implementan pausa, guardado y carga. Esta tarea mide y
reporta; no cambia reglas. Los defectos vuelven a su tarea. La cobertura de botín
y cadáveres es TASK-0142; aquí se comprueba que el guardado los conserva.

# Criterios de aceptación

- [ ] `Esc` abre y cierra la pausa desde personajes, enemiga y animación; con el
      panel abierto, el primer `Esc` cierra el panel.
- [ ] La pausa congela turnos, beats y animaciones; el input de juego se ignora;
      reanudar continúa sin saltos.
- [ ] El menú muestra Reanudar, Nueva partida, Cargar partida, Guardar partida y
      Controles en orden; la navegación por teclado y `Esc` funcionan.
- [ ] Guardar solo está activo en fase de personajes y sin animación; en enemiga
      se desactiva con motivo; el nombre y el manifiesto son correctos.
- [ ] Cargar desde el menú principal y desde la pausa; en pausa confirma; un
      archivo inválido no altera la partida; cargar restaura activo, ronda,
      cámara y HUD sin aviso de ronda.
- [ ] Se rechazan archivos con rutas, entradas extra o tamaño por encima de los
      límites.
- [ ] El resultado no ofrece pausa ni guardado; no existe reinicio rápido ni `R`.
- [ ] Capturas de pausa, menú, controles y error de carga; `pnpm run test:e2e` y
      `pnpm run verify` pasan.

# Plan de test

- Unitario: `pnpm run verify`.
- Integración: guardar, recargar la página y cargar el `.zip`; cargar un `.json`.
- E2E / visual: spec de pausa, guardado y carga con capturas.
- Manual: comprobar que la partida cargada se ve en estado final.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0144/attempt-1/report.md`
- [ ] Salida de `pnpm run test:e2e` y `pnpm run verify`
- [ ] Capturas de pausa, menú, controles y error
- [ ] Commit SHA

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
