---
type: Task Brief
title: "TASK-0162: brief del intento 2"
description: Llevar el desglose por atributo a la ficha visible del jugador, no solo a F1.
task: TASK-0162
attempt: 2
status: stable
brief_bytes: 2420
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T09:35:00Z }
---

# Objetivo

Que el jugador lea, sin abrir `F1`, de dónde sale cada atributo del portador
(inherente, equipo y traits) y cuál es el total que usa el motor.

# Qué falló

El intento 1 cumple 5 de 6 criterios. El desglose existe en `stat-breakdown.ts` y
se ve en el overlay de `F1`, pero no en la UI de juego: `buildStats` rellena
`PanelStats.rows` y la vista del panel no lo pinta, y la ficha derecha solo
muestra el objeto seleccionado y el equipado. `F1` es debug, no la ficha del
jugador; REQ-019 T-012 pide el desglose en la UI del panel.

# Hipótesis

`PanelStats.rows` ya modela inherente/equipo/traits/total por atributo; falta
renderizarlo en una superficie que el jugador vea con el panel abierto. Es un
cambio de vista y DOM, sin tocar el motor ni el perfil efectivo.

# Alcance del intento

- Renderizar el desglose del portador (9 atributos, una entrada por línea) en la
  UI de juego: panel de inventario o ficha derecha mientras el panel está
  abierto. Elige la colocación que no rompa a 900×700 ni provoque Content Shift
  ([REQ-033](../../../docs/requirements/REQ-033-revision-visual-hud-panel.md) R-022).
- Mantener los totales copiados de `effectiveStats`; no recalcular sumas en la
  vista.
- Un E2E que abra el panel y lea el desglose sin pulsar `F1`, con captura.
- `F1` puede conservar el mismo desglose.

# Invariantes

- Sin cambios en `src/game/**`; sin nuevas dependencias.
- Listas DOM verticales, sin `·` entre stats (REQ-033 R-026); sin arte final.
- Tests y E2E existentes intactos; no se debilitan aserciones.
- El HUD izquierdo puede seguir con el resumen compacto de traits.

# Criterios de aceptación

Viven en `docs/tasks/TASK-0162-host-ui-traits-visibles-desglose-feedback.md`; el
2 es el que condiciona este intento.

# Artefactos

`artifacts/TASK-0162/attempt-2/`: `report.md`, `verify-output.txt`,
`e2e-output.txt` y `e2e/inventory/screenshots/` con el desglose visible.

# Riesgos

- Desbordamiento a 900×700 o desplazamiento del marco al abrir el panel.
- Duplicar el desglose en dos sitios con totales divergentes: usa una sola
  función (`statBreakdown`) para ambos.
