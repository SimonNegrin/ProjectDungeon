---
type: Task
id: TASK-0087
title: "Motor: martillo, espada electrizada, daga arcana y colocación determinista"
description: "Añadir al catálogo las tres armas nuevas con sus paquetes y colocar al menos una de forma determinista en el mapa, sin cambiar el equipo inicial del roster."
status: stable
task_status: in_progress
task_type: feature
requirement: REQ-029
requirement_ids: [R-003, R-004, R-012, T-002]
depends_on: [TASK-0085]
unlocks: [TASK-0090, TASK-0092]
created_at: 2026-11-13T12:30:00Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0087/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T12:30:00Z }
verified:
---

# Objetivo

Que el catálogo incluya el martillo (contundente), la espada electrizada (filo +
eléctrico) y la daga arcana (punzante + mágico) con los valores estimados de la
hoja, y que al menos una de las nuevas armas aparezca de forma determinista en el
mapa del primer corte, recogible con las reglas de inventario existentes.

# Contexto

- El catálogo con `damagePackets` y la validación llegan en TASK-0085.
- Tabla de armas y notas de colocación:
  [contenido estimado v1](../requirements/REQ-029-tipos-dano-resistencias.md#contenido-estimado-v1).
- `src/game/equipment.ts` es la fuente única de armas; `src/game/map.ts` declara
  las armas del mapa y `src/game/engine.ts` resuelve la recogida y el cambio.
- `src/host/hud.ts` y `src/host/feedback-events.ts` leen el catálogo por ID; no
  deben aparecer listas de armas duplicadas.
- [REQ-029](../requirements/REQ-029-tipos-dano-resistencias.md#requisitos-técnicos)
  T-002 y R-012; [REQ-018](../requirements/REQ-018-inventario-equipo.md) para la
  recogida y el cambio.

# Criterios de aceptación

- [ ] El martillo declara acierto +2 y contundente 4; la espada electrizada,
      acierto +3, filo 3 y eléctrico 1; la daga arcana, acierto +4, punzante 2 y
      mágico 1, con IDs y nombres estables.
- [ ] La validación del catálogo acepta las tres armas y sigue rechazando más de
      un físico, más de un elemental o más de dos paquetes.
- [ ] Al menos una de las tres armas nuevas aparece de forma determinista en el
      mapa para una semilla fija; la colocación queda declarada en datos y no
      depende de azar no registrado.
- [ ] La recogida y el cambio de arma funcionan con las reglas de inventario
      vigentes; el HUD y el feedback muestran el nombre desde el catálogo, sin
      listas paralelas.
- [ ] El equipo inicial de los nueve arquetipos no cambia y la tabla de `REQ-015`
      sigue siendo válida.
- [ ] Los valores quedan marcados como estimados; no se rebalancean las armas
      existentes ni los enemigos.
- [ ] `pnpm run verify` pasa; sin dependencias nuevas.

# Plan de test

- Unitario: valores y paquetes de las tres armas; validación; el arma nueva se
  coloca con la semilla fija y no con otra; recogida y cambio por slot.
- Integración: ataque con espada electrizada y daga arcana contra un enemigo;
  el desglose usa los dos paquetes (se comprueba en TASK-0088 y TASK-0090).
- E2E / visual: no aplica; llega en TASK-0092.
- Manual: recoger el arma nueva y comprobar que el HUD no muestra IDs internos.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0087/attempt-1/report.md`
- [ ] Salida de `pnpm run verify` y de los tests focalizados
- [ ] Commit SHA en la rama `task/TASK-0087`

# Restricciones

- No cambiar las fórmulas ni el resolvedor de TASK-0085.
- No cambiar el equipo inicial ni los stats del roster.
- No colocar las tres armas si una basta; la elección se justifica en el informe.
- No añadir arte nuevo ni iconos.
- Sin dependencias nuevas.

# No objetivos

- Perfiles de resistencia (TASK-0086).
- Desglose en eventos (TASK-0088).
- HUD de bandas y feedback por paquete (TASK-0089).
- Armas a distancia, traits o estados alterados.
