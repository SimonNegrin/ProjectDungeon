---
type: Task
id: TASK-0086
title: "Motor: perfiles de resistencia v1 de roster, bestiario y familias"
description: "Declarar los perfiles estimados de los nueve arquetipos, los tres enemigos actuales y seis plantillas de familia, con herencia por familia y sobrescritura por enemigo, sin tocar el resolvedor."
status: stable
task_status: backlog
task_type: feature
requirement: REQ-029
requirement_ids: [R-007, R-013, R-014, T-003]
depends_on: [TASK-0085]
unlocks: [TASK-0088, TASK-0089, TASK-0090]
created_at: 2026-11-13T12:30:00Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0086/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T12:30:00Z }
verified:
---

# Objetivo

Que roster, bestiario y familias declaren los perfiles de resistencia estimados
v1 de la hoja, con una plantilla reutilizable por familia y sobrescritura
opcional por enemigo concreto. Cambiar una banda cambia el combate sin tocar el
resolvedor.

# Contexto

- El modelo de perfil y el resolvedor llegan en TASK-0085.
- Tablas de referencia:
  [perfiles de héroe](../requirements/REQ-029-tipos-dano-resistencias.md#perfiles-de-héroe),
  [enemigos actuales](../requirements/REQ-029-tipos-dano-resistencias.md#perfiles-de-enemigo-actuales)
  y [familias](../requirements/REQ-029-tipos-dano-resistencias.md#plantillas-de-familia-para-el-bestiario-futuro).
- `src/game/roster.ts` y `src/game/bestiary.ts` son las fuentes únicas; no se
  duplican valores en el host ni en los tests.
- [REQ-029](../requirements/REQ-029-tipos-dano-resistencias.md#requisitos-técnicos)
  T-003 y R-013.
- Los valores son estimados para probar; no se rebalancea el resto del juego.

# Criterios de aceptación

- [ ] Los nueve arquetipos de `REQ-015` declaran exactamente las bandas de la
      tabla de héroe (V/N/R) y los tres enemigos actuales, las de su tabla.
- [ ] Existen seis plantillas de familia reutilizables (humanoide, constructo, no
      muerto, bestia, elemental y dragón) como datos; un enemigo concreto puede
      sobrescribir una banda sin duplicar el perfil entero.
- [ ] Una unidad sin perfil explícito sigue recibiendo normal en los cinco tipos.
- [ ] El perfil es serializable y se expone en snapshot y debug; dos unidades con
      el mismo perfil reciben el mismo tratamiento.
- [ ] Cambiar una banda en el catálogo cambia el combate esperado sin editar el
      resolvedor; los tests leen el perfil del catálogo y no copian la tabla.
- [ ] Los valores quedan marcados como estimados v1; no se ajustan armas, PV,
      acciones ni hechizos.
- [ ] `pnpm run verify` pasa; sin dependencias nuevas.

# Plan de test

- Unitario: cobertura de las tres tablas; sobrescritura de una banda; herencia
  de familia; perfil por defecto normal; serialización; mismo perfil, mismo
  resultado.
- Integración: un golpe contra un resistente y un vulnerable usa las bandas del
  catálogo; cambiar la banda en un fixture cambia el resultado sin tocar el
  resolvedor.
- E2E / visual: no aplica; llega en TASK-0092.
- Manual: revisar que las debilidades de cada arquetipo se leen con facilidad en
  el panel de debug.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0086/attempt-1/report.md`
- [ ] Salida de `pnpm run verify` y de los tests focalizados
- [ ] Commit SHA en la rama `task/TASK-0086`

# Restricciones

- No cambiar el resolvedor ni las fórmulas de TASK-0085.
- No añadir armas nuevas (TASK-0087).
- No asignar las 64 entradas del bestiario a familias.
- No rebalancear PV, armas, hechizos ni acciones.
- Sin dependencias nuevas.

# No objetivos

- HUD de bandas (TASK-0089).
- Desglose de eventos (TASK-0088).
- Ajuste fino de perfiles; queda aplazado a roster y bestiario completos.
