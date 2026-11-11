---
type: Task
id: TASK-0067
title: "EXP-003: UI del banco de ajuste"
description: Objetivos editables, fila expandible con stats del enemigo, tabla global de armas, diagnóstico 4-de-4, reset y export en la página de la mesa.
status: stable
task_status: ready
task_type: experiment
requirement: REQ-028
requirement_ids: [R-001, R-002, R-003, R-004, R-005, R-006, R-007, R-008, R-009, R-010, R-011, R-012, T-003, T-004, T-005, T-006]
depends_on: [TASK-0066]
unlocks: [TASK-0068]
created_at: 2026-11-11T20:20:00Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0067/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T20:20:00Z }
verified:
---

# Objetivo

Convertir la página de EXP-003 en el banco de ajuste de
[REQ-028](../requirements/REQ-028-ajuste-interactivo-balance.md): objetivos
editables por enemigo, editor expandible con stats compartidos, tabla global de
armas, diagnóstico 4-de-4 visible, recálculo de filas afectadas, reset y export.

# Contexto

- `experiments/EXP-003-mesa-combate/src/main.ts`: página, tabla de
  emparejamientos, detalle, export y API `window.__experiment`.
- `experiments/EXP-003-mesa-combate/src/ui.ts`: helpers de formato, export y
  snapshot.
- `experiments/EXP-003-mesa-combate/src/experiment.css`: estilos de la mesa.
- Motor y datos de [TASK-0066](TASK-0066-exp-003-banco-ajuste-motor.md).

# Criterios de aceptación

- [ ] Cada fila de la tabla tiene una acción «Ajustar» que abre un editor
      expandible con PV, habilidad, fuerza, defensa, resistencia, acciones,
      armadura, escudo y arma equipada del enemigo.
- [ ] El editor avisa de que el enemigo es compartido y que el cambio afecta a
      sus cuatro filas; no hay copias por fila.
- [ ] Una segunda tabla de armas (espada, hacha, daga, cuchillo) permite editar
      acierto y daño globalmente y muestra qué unidades usan cada arma.
- [ ] Cada enemigo tiene un campo de objetivo editable con guía 75/85/30,
      validación 0–100 y reset a la guía; el usuario puede fijar otro valor.
- [ ] Cada fila muestra objetivo, win % real, delta y estado dentro/fuera del
      margen de ±5 pp; cada enemigo muestra 4-de-4 y qué filas quedan fuera.
- [ ] Los avisos de problemática son legibles y no bloquean: dispersión entre
      héroes, bloque compartido que no centra las cuatro filas y arma global que
      mueve a ambos bandos.
- [ ] Al editar, se recalculan solo las filas afectadas con retardo y estado
      visible `aria-live`; la tabla no salta ni pierde el foco.
- [ ] Reset por campo, por enemigo, por arma y global; restaura catálogo base y
      guía de objetivos.
- [ ] El export de copiar/descargar incluye catálogo ajustado, objetivos,
      diagnóstico y el identificador determinista de overrides; el nombre no
      sobrescribe el export base.
- [ ] La API `window.__experiment` se amplía sin romper la existente y
      `?test=1&seed=1017` sigue siendo determinista.
- [ ] Tests de UI/helpers y `pnpm run verify` pasan; sin cambios en reglas,
      `src/` de producción, `tests/` de producción, `index.html` ni `public/`.

# Plan de test

- Unitario: estado del editor, validación de campos, formato de objetivo/delta,
  reset y selección de filas afectadas en la UI.
- Integración: cambiar un enemigo y un arma desde la API; export con overrides;
  mismo estado produce el mismo snapshot.
- E2E / visual: lo cubre [TASK-0068](TASK-0068-exp-003-banco-ajuste-e2e.md).
- Manual: ajustar un enemigo, comprobar el 4-de-4, cambiar un arma y restablecer.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0067/attempt-1/report.md`
- [ ] Salida de `pnpm run verify`
- [ ] Captura de la tabla con el editor expandible y la tabla de armas
- [ ] Commit SHA en la rama `task/TASK-0067`

# Restricciones

- No cambiar el motor de duelo ni las fórmulas.
- No editar `experiment.md`; lo actualiza `requirements-writer`.
- No añadir dependencias ni arte.
- No fijar objetivos ni stats en el código: los valores salen del estado y del
  catálogo ajustado.

# No objetivos

- E2E, QA visual y capturas finales
  ([TASK-0068](TASK-0068-exp-003-banco-ajuste-e2e.md)).
- Editar stats de héroes, hechizos o IA.
- Aprobar el balance o trasladar valores a producción.
