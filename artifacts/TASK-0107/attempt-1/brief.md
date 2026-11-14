---
type: Task Brief
title: "TASK-0107: brief del intento 1"
description: "Panel en tres columnas con títulos, slots cuadrados inset, figura, cadáveres y suelo en rejilla."
task: TASK-0107
attempt: 1
status: stable
brief_bytes: 3660
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T14:05:00Z }
---

# Objetivo

Recomponer el panel en tres columnas tituladas **Equipo**, **Bolsa** y **Suelo**:
figura humana de ocho posiciones, slots cuadrados inset solo con icono, cadáveres
del tile en rejilla al inicio de Suelo y objetos en dos columnas. Quitar cabecera,
ayuda y textos de estado. Validar la distribución a 900×700.

# No objetivos

- Alternativa 1/3 + dos filas (R-021): sólo si esta no encaja; entonces, parar.
- Cursor, anti-CLS y QA final (TASK-0108/0109).
- Reglas, costes, inventario, navegación, motor, render o arte nuevo.

# Invariantes

- Escala, paleta, tokens y biseles de TASK-0104; sin valores mágicos, radios,
  sombras, degradados, blur ni translucidez.
- El panel sigue modal **sólo sobre la franja del mapa**, con ambos HUD visibles
  (TASK-0100); no lo ensanches para que quepa.
- Presentación derivada del snapshot; no mutar estado, RNG ni percepción.
- No borrar ni debilitar tests: adapta los que citan cabecera o estados vacíos;
  nombre/MP siguen cubiertos en el HUD izquierdo.

# Criterios de aceptación

Viven en
[TASK-0107](../../../docs/tasks/TASK-0107-ui-panel-layout-preferido.md#criterios-de-aceptación).

# Contexto mínimo

- `index.html`: markup `inventory-*`; `src/host/ui.css`: bloque del panel;
  `src/host/inventory-panel.ts` (modelo puro); `inventory-panel-view.ts` (DOM).
- Cadáveres: unidades con `hp <= 0` en la casilla del jugador; nombre propio si
  es personaje o `BESTIARY[enemyType].name` si es enemigo; sprite de unidad
  existente (`rogues.png`/`monsters.png`). Sin contenedores ni acciones nuevas:
  son presentación y no entran en la navegación.
- Tests: `tests/unit/host/inventory-panel.test.ts`,
  `tests/e2e/panel-three-columns-qa.spec.ts`,
  `inventory-equipment-qa.spec.ts`, `panel-submenu-hud-qa.spec.ts`,
  `ui-foundations-qa.spec.ts`.
- Requisito:
  [REQ-033 R-012 a R-015, P-001 a P-004, S-001 a S-004, T-007/T-010](../../../docs/requirements/REQ-033-revision-visual-hud-panel.md#requisitos-creativos-decididos).

# Enfoque técnico

- Un único componente de slot para las tres columnas: cuadrado, borde inset y
  área interior común (celda de 32 px lógicos escalada); sprite completo,
  centrado y sin recorte. Bolsa 2×4; Suelo 2 columnas; Equipo conserva la figura.
- Títulos dentro del marco de cada columna, en la misma línea superior. «Bolsa»
  visible, «mochila» en modelo; contador compacto.
- Suelo: cadáveres al inicio y objetos debajo; sólo esa columna se desplaza. Sin
  cadáveres no queda sección, título, hueco ni texto.
- Sin cabecera «Personaje · X / MP», ayuda ni «No hay objetos/cadáveres». Título
  accesible oculto y botón «Cerrar».
- Evidencia: captura y log de geometría a 900×700 y 1280×720 con columnas dentro
  del panel, sin solapes ni recortes, slots cuadrados del mismo lado y sprite
  dentro del área interior. Si a 900×700 no encaja sin ensanchar el panel ni
  solapar, devuelve `blocked` con medidas y captura; no abras la alternativa.

# Artefactos

- `report.md`, `verify-output.txt`, `e2e-output.txt`, `screenshots/`, `logs/`.

# Riesgos

- El panel mide 56,25 % del marco (≈488 px a 900×700). No estires slots para
  llenar la columna: usa un lado común que quepa tres veces en Equipo.
- «Suelo siempre visible» se mantiene con la sección vacía accesible, sin texto
  visible de estado.
