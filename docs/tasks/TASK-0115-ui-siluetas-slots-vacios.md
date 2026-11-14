---
type: Task
id: TASK-0115
title: "UI: siluetas sólidas en slots de equipamiento vacíos"
description: "Mostrar en cada slot de equipamiento vacío una silueta sólida del objeto representativo del hueco, derivada de items.png y oculta al equipar."
status: stable
task_status: ready
task_type: feature
requirement: REQ-033
requirement_ids: [R-019, R-020, R-029, P-008, S-001, S-005, T-010, T-017]
depends_on: [TASK-0114]
unlocks: [TASK-0117]
created_at: 2026-11-14T15:30:34Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0115/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T15:30:34Z }
verified:
---

# Objetivo

Que un slot de equipamiento vacío comunique qué objeto le corresponde mediante
una silueta sólida `#6eb8a8` obtenida de `items.png`, sin añadir arte. La silueta
desaparece en cuanto el slot se llena.

# Contexto

REQ-033 v7 R-029 y S-005 fijan ocho siluetas y su color. La tabla aprobada es:
casco `16.e. helm`, cuello `17.b. metal pendant`, anillo `18.b. gold band ring`,
armadura `13.e. scale mail`, escudo `12.a. buckler`, guantes `14.b. leather
gloves`, arma `1.d. long sword` y botas `15.b. leather boots`. La máscara debe
ocultarse con objeto equipado para evitar artefactos visuales.

# Criterios de aceptación

- [ ] Los ocho slots de equipamiento vacíos muestran la silueta de su tabla, con
      el recorte correcto de `items.png`.
- [ ] La silueta es de un solo color sólido `--ui-line-color` (#6eb8a8), sin
      degradados ni arte nuevo.
- [ ] El slot lleno muestra solo el sprite del objeto: no queda máscara, silueta
      ni resto visual al equipar o desequipar.
- [ ] La silueta no recibe foco, no captura clics y no altera el tamaño, el bisel
      ni el encaje del sprite del slot.
- [ ] Los slots vacíos de Bolsa y Suelo no muestran silueta; solo equipamiento.
- [ ] La tabla de siluetas vive en una única fuente, sin recortes duplicados por
      componente.
- [ ] Los tests de slots existentes se adaptan sin retirar cobertura.

# Plan de test

- Unitario: tabla de ocho siluetas, recortes dentro de la hoja y ausencia de
  silueta cuando el slot está ocupado.
- Integración: `pnpm run verify`; DOM del slot vacío y lleno; color y máscara.
- E2E: capturas de los ocho slots vacíos y de un slot lleno; comprobar que la
  silueta desaparece al equipar.
- Manual: revisar legibilidad y ausencia de artefactos a 900×700 y 1280×720.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0115/attempt-1/report.md`
- [ ] Salida de `pnpm run verify` y del E2E
- [ ] Capturas de slots vacíos y llenos
- [ ] Commit SHA

# Restricciones

- Sin arte nuevo, dependencias nuevas ni cambios en `items.png`.
- Sin cambios de reglas, inventario, equipo ni navegación.
- No se toca el cursor ni la figura.
- No se debilitan tests existentes.

# No objetivos

- Cursor del panel (TASK-0116).
- QA visual final (TASK-0117) y documentación (TASK-0118).
- Sustituir la figura por un sprite PNG.
