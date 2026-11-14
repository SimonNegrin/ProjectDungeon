---
type: Task
id: TASK-0113
title: "UI: listas verticales de stats y traits"
description: "Mostrar stats y traits del HUD izquierdo y de la ficha derecha como listas verticales, una entrada por línea y sin separadores."
status: stable
task_status: backlog
task_type: feature
requirement: REQ-033
requirement_ids: [R-007, R-010, R-011, R-026, T-006, T-016]
depends_on: []
unlocks: [TASK-0117]
created_at: 2026-11-14T15:30:34Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0113/
priority: P1
risk: low
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T15:30:34Z }
verified:
---

# Objetivo

Que todos los stats y traits visibles en el HUD izquierdo y en la ficha derecha
se lean como listas verticales, una entrada por línea, sin separadores `·`.
PV, MP, acciones y filas numéricas del HUD conservan su formato.

# Contexto

Varios textos del HUD se componen como cadenas con ` · ` (`statsLabel` y
`traitsLabel`), y la ficha derecha ya usa listas. REQ-033 v7 R-026 y T-016
unifican ambos HUD en listas verticales. El cambio es de presentación: no toca
el catálogo, los valores ni las reglas.

# Criterios de aceptación

- [ ] Los atributos del HUD izquierdo se renderizan como elementos de lista, uno
      por línea.
- [ ] Los traits del HUD izquierdo se renderizan como elementos de lista, uno por
      línea, y desaparecen sin dejar hueco si no existen.
- [ ] Los stats del arma actual y de la ficha derecha también quedan uno por
      línea, incluidos los objetos seleccionados y equipados.
- [ ] No aparece el separador `·` entre stats o traits; tampoco una línea
      horizontal con varias entradas.
- [ ] PV, MP, acciones y las filas numéricas del HUD mantienen su estructura y
      valores.
- [ ] Los estados condicionales (sin maná, sin traits, sin arma, objeto vacío) se
      conservan.
- [ ] Los tests de HUD y ficha se adaptan a listas sin retirar cobertura.

# Plan de test

- Unitario: funciones de etiquetas o modelo que alimentan stats y traits; casos
  con uno, varios y ningún trait/stat.
- Integración: `pnpm run verify`; comprobar el DOM de ambos HUD.
- E2E: personaje con varios stats y traits; objeto con varios stats y traits;
  ausencia de `·`; cada entrada en su línea.
- Manual: revisar densidad y legibilidad a 900×700 y 1280×720.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0113/attempt-1/report.md`
- [ ] Salida de `pnpm run verify` y del E2E
- [ ] Capturas del HUD y de la ficha con varios stats y traits
- [ ] Commit SHA

# Restricciones

- Sin cambios en valores, fórmulas, catálogo, equipo ni reglas.
- Sin cambios de escala, paleta ni relieve.
- No se debilitan tests existentes.

# No objetivos

- Biseles (TASK-0112), panel (TASK-0114), siluetas (TASK-0115) y cursor
  (TASK-0116).
- QA visual final (TASK-0117) y documentación (TASK-0118).
