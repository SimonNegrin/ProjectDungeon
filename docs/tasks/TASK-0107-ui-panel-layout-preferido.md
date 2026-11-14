---
type: Task
id: TASK-0107
title: "UI: panel con títulos y layout preferido"
description: "Recomponer el panel en tres columnas con títulos Equipo, Bolsa y Suelo, figura humana, slots inset, columna derecha con cadáveres y suelo en rejilla y sin cabecera ni ayuda."
status: draft
task_status: ready
task_type: feature
requirement: REQ-033
requirement_ids: [R-012, R-013, R-014, R-015, R-019, R-020, P-001, P-002, P-003, P-004, S-001, S-002, S-003, S-004, T-007]
depends_on: [TASK-0104, TASK-0106]
unlocks: [TASK-0108, TASK-0109]
created_at: 2026-11-14T12:02:44Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0107/
priority: P1
risk: high
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T12:02:44Z }
verified:
---

# Objetivo

Que el panel se lea como una rejilla de inventario: tres columnas tituladas
Equipo, Bolsa y Suelo, figura humana en Equipo, slots cuadrados inset y una
columna derecha con cadáveres y suelo en rejilla, sin cabecera ni ayuda.

# Contexto

El panel actual tiene cabecera, ayuda, slots rectangulares, texto dentro de las
filas y una lista de suelo. REQ-033 fija la composición preferida de tres
columnas y el lenguaje inset/outset. La base visual llega de TASK-0104 y la ficha
del HUD derecho de TASK-0106.

# Criterios de aceptación

- [ ] Las tres columnas llevan título superior visible: **Equipo**, **Bolsa** y
      **Suelo**; cada una tiene marco outset y fondo propio.
- [ ] **Equipo** conserva la figura humana de ocho posiciones; **Bolsa** es una
      rejilla 2×4; **Suelo** es una rejilla de dos columnas.
- [ ] «Bolsa» es la etiqueta visible; el modelo y la documentación siguen usando
      «mochila».
- [ ] Todos los slots de item son cuadrados, del mismo tamaño en las tres
      columnas, con borde inset y solo icono; no llevan nombre, estado ni texto.
- [ ] El sprite de cada item queda centrado en el área interior del slot, completo,
      sin recorte, sin desborde y sin tapar el bisel.
- [ ] La columna **Suelo** muestra los cadáveres del tile, si existen, en una
      rejilla al inicio; cada cadáver muestra su sprite y el nombre si es personaje
      o el tipo si es enemigo. Sin cadáveres no queda título, hueco ni texto.
- [ ] Debajo de los cadáveres, los objetos del suelo van en rejilla de dos
      columnas; solo la columna derecha se desplaza.
- [ ] No hay línea de ayuda ni encabezado «Personaje · X / MP»; queda un título
      accesible oculto y un botón «Cerrar». El contador de Bolsa se mantiene.
- [ ] El panel conserva la navegación y los costes de REQ-018; abrir, navegar o
      cerrar no cambia el estado del motor.
- [ ] La distribución de tres columnas se valida a 900×700 sin solapes ni recortes.

# Plan de test

- Unitario: geometría de slots iguales; cadáveres con nombre/tipo; título y
  contador; ausencia de textos de ayuda/estado vacío.
- Integración: `pnpm run verify`; DOM del panel sin cabecera ni ayuda; tres títulos;
  sección de cadáveres ausente sin datos.
- E2E: mochila llena, suelo con y sin objetos, varios cadáveres, foco y scroll;
  comprobar que los slots comparten lado y que el sprite no desborda.
- Manual: capturas a 900×700 y 1280×720.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0107/attempt-1/report.md`
- [ ] Salida de `pnpm run verify` y del test E2E
- [ ] Capturas del panel con y sin cadáveres y con mochila llena
- [ ] Commit SHA

# Restricciones

- Sin cambios en reglas, costes, inventario ni navegación.
- No se implementa el cursor superpuesto ni la medición de CLS: van en TASK-0108.
- Sin arte nuevo: se usan los sprites existentes.

# No objetivos

- La distribución alternativa 1/3 + dos filas. Queda condicionada a que el QA de
  esta tarea demuestre que la de tres columnas no encaja a 900×700; entonces se
  abrirá una tarea aparte con REQ-033 R-021.
- Cursor, anti-CLS o QA visual final.
