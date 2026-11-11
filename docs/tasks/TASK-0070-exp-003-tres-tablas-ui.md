---
type: Task
id: TASK-0070
title: "EXP-003: tres tablas inline a ancho completo"
description: Tabla de combates con stats compartidos, tabla de armas y tabla de héroes, con edición inline, celdas agrupadas, detalle ampliado, resets y ancho completo.
status: draft
task_status: backlog
task_type: experiment
requirement: REQ-028
requirement_ids: [R-001, R-002, R-003, R-004, R-005, R-006, R-007, R-008, R-009, R-010, R-011, R-012, R-013, R-014, R-015, R-016, R-017, R-018, R-019, R-020, T-004, T-005, T-006, T-007]
depends_on: [TASK-0069]
unlocks: [TASK-0071]
created_at: 2026-11-11T22:35:00Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0070/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T22:35:00Z }
verified:
---

# Objetivo

Sustituir el editor expandible por las tres tablas inline de
[REQ-028](../requirements/REQ-028-ajuste-interactivo-balance.md): combates,
armas y héroes, a ancho completo, con edición en celda, celdas agrupadas para el
bloque compartido del enemigo y recálculo quirúrgico.

# Contexto

- `experiments/EXP-003-mesa-combate/src/main.ts`: tabla actual de 18 columnas,
  panel del banco, editor expandible, detalle, export y API.
- `experiments/EXP-003-mesa-combate/src/bench-ui.ts`: validación, campos y
  etiquetas.
- `experiments/EXP-003-mesa-combate/src/experiment.css`: estilos de la mesa.
- Motor y datos de [TASK-0069](TASK-0069-exp-003-tres-tablas-motor.md).

# Criterios de aceptación

- [ ] La tabla de combates tiene exactamente las columnas: Héroe, Enemigo,
      Victorias héroe, Victorias enemigo, % objetivo, % real, PV, Acierto, Daño,
      Defensa, Resistencia, Acciones, Armadura, Escudo y Arma.
- [ ] Las filas se agrupan por enemigo, cuatro héroes por bloque; enemigo,
      objetivo y stats compartidos usan celdas agrupadas verticalmente con un
      solo input por stat.
- [ ] Al enfocar un stat compartido se resaltan las cuatro filas del enemigo; el
      input conserva el foco tras el recálculo.
- [ ] `% real` muestra el win %, el delta y el estado dentro/fuera de ±5 pp en la
      misma celda; el bloque del enemigo muestra el 4-de-4 y el héroe fuera.
- [ ] La tabla de armas tiene Arma, Acierto y Daño; bajo el nombre del arma
      aparecen las unidades que la usan.
- [ ] La tabla de héroes tiene Héroe, Arma inicial, PV, Acierto, Daño, Defensa,
      Resistencia, Acciones, Armadura, Escudo y Nivel de magia; el selector de
      arma incluye «sin arma».
- [ ] Editar un stat de enemigo recalcula sus 4 filas; un stat de héroe, sus 3
      filas; un stat de arma, todas las filas donde se use; un objetivo, solo el
      diagnóstico. El estado indica cuántas filas se recalcularon.
- [ ] La tabla de 18 columnas desaparece; al seleccionar una fila se actualiza el
      detalle, que conserva acciones, hechizos, maná, PV, réplicas y duración y
      añade banda, TTK, turnos/rondas y daño.
- [ ] Botones de reset por tabla y global; no hay resets por campo dentro de las
      celdas.
- [ ] Las tablas usan el ancho completo de la ventana, con inputs compactos y sin
      overflow horizontal de documento a 1280×720; a 900×700 el scroll, si
      aparece, queda dentro de la tabla.
- [ ] El export conserva catálogo ajustado, objetivos, diagnóstico e
      identificador de overrides; el nombre base y el ajustado se distinguen.
- [ ] Tests de UI/helpers y `pnpm run verify` pasan; sin cambios en reglas,
      fórmulas, `src/` de producción, `tests/` de producción, `index.html` ni
      `public/`.

# Plan de test

- Unitario: helpers de tabla, validación de campos, formato de delta/estado,
  agrupación por enemigo, resets y selección de filas afectadas en la UI.
- Integración: editar enemigo/héroe/arma desde la UI; foco y valores tras
  recalcular; export con overrides; mismo estado produce el mismo snapshot.
- E2E / visual: lo cubre [TASK-0071](TASK-0071-exp-003-tres-tablas-e2e.md).
- Manual: recorrer las tres tablas, editar un stat de cada tipo y restablecer.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0070/attempt-1/report.md`
- [ ] Salida de `pnpm run verify`
- [ ] Captura de las tres tablas
- [ ] Commit SHA en la rama `task/TASK-0070`

# Restricciones

- No cambiar el motor de duelo ni las fórmulas.
- No editar `experiment.md`; lo actualiza `requirements-writer`.
- No añadir dependencias ni arte.
- No duplicar la tabla de resultados: la de combates la sustituye.

# No objetivos

- E2E, QA visual y capturas finales
  ([TASK-0071](TASK-0071-exp-003-tres-tablas-e2e.md)).
- MP, hechizos, perfiles de IA, defensa de arma o grupos 2v2.
- Aprobar el balance o trasladar valores a producción.
