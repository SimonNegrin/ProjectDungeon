---
type: Task
id: TASK-0175
title: "EXP-004: P real, suelo por salas y total aplicado"
description: "El experimento muestra y exporta la fórmula con el suelo por salas, de modo que la densidad aprobada se pueda probar con 1-6 jugadores."
status: stable
task_status: backlog
task_type: experiment
scope: [src/, tests/, experiments/]
requirement: REQ-012
requirement_ids: [T-012, T-015]
depends_on: [TASK-0174]
unlocks: []
created_at: 2026-11-16T20:07:05Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0175/
priority: P2
risk: low
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T20:07:05Z }
verified:
---

# Objetivo

Que `EXP-004` enseñe la regla real de densidad: fórmula, suelo por salas y total
aplicado, con la party de 1 a 6, según
[REQ-012 T-012 y T-015](../requirements/REQ-012-spawn-sala-protegida.md#requisitos-técnicos)
y [ADR-034](../decisions/ADR-034-densidad-enemigos-party-real.md).

# Contexto

El experimento ya expone factores, `P`, `T`, reparto, puntos calientes y
emboscadas. Tras TASK-0174 el cálculo aplica `T = max(fórmula, salas no-spawn)`;
el panel y el JSON de decisión deben declararlo, y las expectativas de factor 0
cambian de 0 enemigos a una ficha por sala no-spawn.

# Criterios de aceptación

- [ ] El panel muestra `N`, `P`, el número de salas no-spawn, el total de la
      fórmula y el total aplicado.
- [ ] Cuando manda el suelo, el panel muestra un aviso con los tres valores.
- [ ] Con factores a 0 el total aplicado es el número de salas no-spawn y el mapa
      reparte una ficha por sala.
- [ ] Cambiar `P` de 1 a 6 cambia el total como la fórmula; el JSON exportado
      incluye factores, `P`, salas no-spawn, ambos totales y el desglose.
- [ ] Determinismo y emboscadas no cambian: misma semilla y parámetros devuelven
      lo mismo, y la probabilidad de emboscada no altera el total.
- [ ] Solo se adaptan los tests de factor 0 y suelo; `pnpm run verify` pasa.

# Plan de test

- Unitario: cálculo y payload del experimento con suelo, factores a 0 y `P` de 1
  a 6.
- Integración: página del experimento con la misma semilla antes y después del
  cambio, sin alterar determinismo ni emboscadas.
- E2E / visual: no.
- Manual: pasada del usuario por el panel y el export.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0175/attempt-1/report.md`
- [ ] Salida de `pnpm run verify` en `artifacts/TASK-0175/attempt-1/`
- [ ] Commit SHA

# Restricciones

- Sin cambios en producción: el motor llega resuelto por TASK-0174.
- No cambiar la fórmula ni los factores por defecto.
- No debilitar tests de determinismo, reparto o emboscadas.
- Handoff 2 KB, tope duro 4 KB; pnpm, nunca npm.

# No objetivos

- UI de partida, HUD o debug del juego.
- Prueba de extremo a extremo del flujo real: TASK-0176.
- Ajuste de balance por playtest.
