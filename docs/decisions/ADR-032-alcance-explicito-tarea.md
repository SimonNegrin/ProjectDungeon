---
type: ADR
title: "ADR-032: alcance explícito por tarea y catálogo cerrado de raíces"
description: El campo scope de la ficha declara el alcance del diff, se congela en merge-base y los task_type quedan como atajo; la ficha propia y artifacts son lo único siempre permitido.
status: stable
decision_status: accepted
decided_by: [human:simon]
decided_at: 2026-11-16T14:04:07Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T14:04:07Z }
---

# Contexto

`verify:task` mide el diff de una tarea contra el alcance de su `task_type`. Al
cerrar el piloto de [ADR-031](ADR-031-arnes-dos-agentes.md) quedó una fricción
`pending`: ningún tipo admitía a la vez `tests/` y `docs/`, así que `TASK-0163`
—helper E2E más su página— landó la documentación fuera del diff de la tarea
(`ca7fcc9`). La auditoría encontró el mismo defecto en el otro eje: ningún tipo
admite `scripts/` y `tests/` juntos, de modo que el propio gate no podía
estrenar tests. En 163 tareas cerradas el caso mixto ocurrió una vez, pero
bloquea justo los cambios de arnés.

La causa no es la lista de raíces, sino que el `task_type` era la única
declaración de alcance: una etiqueta de clase resolvía una pregunta de intención.

# Decisión

- **`scope:` en la ficha.** Campo opcional, lista de raíces. Si falta, manda el
  `task_type`; si está, sustituye la lista del tipo. Una tarea `test` que
  documenta declara `scope: [tests/, docs/]`; una de arnés con tests, `[scripts/,
  tests/]`.
- **Catálogo cerrado.** `scripts/lib/scope.mjs` es la fuente única: `SCOPE_ROOTS`
  (raíces y ficheros raíz admitidos), `TYPE_SCOPE` (atajo por tipo) y las
  funciones de resolución que comparten `verify-task.mjs` y `validate-docs.mjs`.
  Una raíz nueva es un cambio de arnés revisado, no un atajo de una ficha.
- **Congelación.** `verify:task` lee la ficha en `merge-base` con `--base` y mide
  con el `scope` que tenía entonces. Si la ficha cambió el campo durante el
  intento, la comprobación «Alcance congelado» falla y el diff se mide con el
  alcance antiguo: ampliar la ficha no amplía lo permitido.
- **Siempre permitido.** `artifacts/`, la ficha propia y `docs/tasks/index.md`
  (lo regenera `tasks:board`). El resto de `docs/tasks/` deja de estar permitido:
  una tarea ya no puede reescribir fichas ajenas.
- **Tipos como atajo.** `docs` y `harness` comparten lista a propósito; `feature`,
  `test`, `qa` y `refactor` comparten la de código; `experiment` mantiene la suya.
  Ninguna lista cambia de contenido respecto a ADR-031 salvo el efecto de
  `docs/tasks/`.
- **Quién escribe.** `scope` no reparte permisos: `task-runner` sigue sin editar
  `docs/`, así que la documentación de una tarea mixta la redacta `game-lead` en
  el mismo intento ([workflow](../harness/workflow.md#quién-ejecuta-una-tarea-docs)).

# Alternativas descartadas

- **Añadir `tests/` a `harness`.** Una línea y riesgo nulo, pero no resuelve el
  caso reportado y deja el alcance atado al tipo.
- **Añadir `docs/` a `test`/`feature`/`qa`/`refactor`.** Ensancha 127 de las 163
  tareas a requisitos, ADR y glosario sin tarea `docs`, y borra la señal de que
  una tarea documenta a propósito.
- **No tocar el script y partir la documentación en una tarea `docs`.** Mantiene
  el gate intacto, pero duplica fichas y ramas y rompe la atomicidad de
  `scripts/`+`tests/`, que ningún tipo permite.

# Consecuencias

- Las 163 fichas cerradas no se tocan: sin `scope`, el comportamiento es el de
  antes. No se reescribe historia.
- El gate no se debilita: el alcance se declara antes de ejecutar, se congela y
  se valida contra un catálogo cerrado; además pierde el acceso a fichas ajenas.
- Coste: un módulo nuevo, dos scripts tocados, validación en `docs:check`, tests
  del resolvedor y esta nota. El caso que queda fuera es una raíz nueva fuera del
  catálogo (`.github/`): se añade con revisión.
- Riesgo abierto: quien escribe la ficha puede declarar un `scope` amplio. Queda
  visible en el diff de la ficha y congelado antes de que el runner empiece.

# Revert

Un solo commit de arnés. Revertirlo devuelve `scopeByType` y el permiso sobre
`docs/tasks/`; las fichas con `scope:` siguen siendo YAML válido y el campo queda
ignorado, así que no hay migración que deshacer.

```bash
git revert <sha-del-cambio>
```
