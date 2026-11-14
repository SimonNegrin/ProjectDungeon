---
type: Task
id: TASK-0114
title: "UI: panel alineado arriba y figura sin cabeza"
description: "Alinear el contenido de las columnas del panel arriba, subir el casco a la primera fila y retirar el bloque verde de la cabeza de la figura."
status: stable
task_status: ready
task_type: feature
requirement: REQ-033
requirement_ids: [R-013, R-027, R-028, P-002, P-007, T-007, T-017]
depends_on: [TASK-0112]
unlocks: [TASK-0115, TASK-0116, TASK-0117]
created_at: 2026-11-14T15:30:34Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0114/
priority: P1
risk: low
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T15:30:34Z }
verified:
---

# Objetivo

Que las tres columnas del panel empiecen por su título y su contenido arriba, con
el slot de casco en la primera fila y sin ningún bloque verde no interactivo por
encima. La figura conserva torso, brazos y piernas como guía.

# Contexto

La rejilla de Equipo sigue centrada verticalmente y el bloque
`.inventory-figure-head` queda suelto sobre el casco. REQ-033 v7 R-027 y R-028
piden alineación superior y retirar solo la cabeza; el resto de la figura se
recoloca respecto a la rejilla nueva.

# Criterios de aceptación

- [ ] Las tres columnas del panel alinean su contenido arriba: título y contenido
      inmediatamente debajo, sin centrado vertical.
- [ ] La rejilla de Equipo empieza en la primera fila del área de contenido; el
      borde superior del casco coincide con ese inicio (±1 px).
- [ ] El bloque de cabeza desaparece del DOM y del CSS; no queda ningún recuadro
      verde por encima del casco.
- [ ] Torso, brazos y piernas se mantienen como guía y se recolocan respecto a la
      rejilla superior; no capturan foco ni clics y siguen `aria-hidden`.
- [ ] Bolsa y Suelo también empiezan arriba; sus títulos y rejillas no cambian de
      tamaño.
- [ ] Abrir, navegar o cambiar de contenido no desplaza el marco, los títulos ni
      las columnas.

# Plan de test

- Unitario: estructura del panel sin nodo de cabeza y figura con los bloques
  restantes.
- Integración: `pnpm run verify`; geometría de títulos, rejilla de Equipo y
  casco.
- E2E: medir la primera fila y el borde del casco a 900×700 y 1280×720;
  comprobar que no hay CLS al abrir y navegar.
- Manual: revisar que la figura sigue siendo reconocible sin la cabeza.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0114/attempt-1/report.md`
- [ ] Salida de `pnpm run verify` y del E2E
- [ ] Capturas del panel a 900×700 y 1280×720
- [ ] Commit SHA

# Restricciones

- Sin cambios de contenido, sprites, navegación ni reglas.
- No se sustituye la figura por un PNG: eso queda fuera de este corte.
- No se toca el cursor ni las siluetas.
- No se debilitan tests existentes.

# No objetivos

- Siluetas de slots vacíos (TASK-0115).
- Cursor del panel (TASK-0116).
- QA visual final (TASK-0117) y documentación (TASK-0118).
