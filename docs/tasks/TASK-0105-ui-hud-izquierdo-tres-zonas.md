---
type: Task
id: TASK-0105
title: "UI: HUD izquierdo en tres zonas"
description: "Recomponer la columna izquierda en Personaje, Arma y Stats+Traits, con el sprite a la izquierda de la ficha y las teclas y la sugerencia al pie."
status: stable
task_status: done
task_type: feature
requirement: REQ-033
requirement_ids: [R-001, R-007, R-008, T-005]
depends_on: [TASK-0104]
unlocks: [TASK-0109, TASK-0111]
created_at: 2026-11-14T12:02:44Z
completed_at: 2026-11-14T13:03:32Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0105/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T12:02:44Z }
verified:
  - by: task-lead
    at: 2026-11-14T13:03:32Z
    note: >-
      Intento 1 verificado (código `8458651`, tests `d42e9de`, evidencia
      `392d00b`/`95da521`; fusión `f4de835`). HUD izquierdo en tres zonas
      `ui-outset` con fondo `--ui-raised`: Personaje en dos columnas con retrato
      a la izquierda y nombre/arquetipo/condición alineados arriba; Arma con
      sprite de `items.png`, nombre, acierto y daño, zona oculta sin arma; Stats
      con PV, MP, acciones y atributos, magia/maná solo con nivel/maná y traits
      omitidos sin datos. Fase, turno, PV enemigo y estado ya no existen en el
      DOM del HUD y siguen en `F1`; teclas y sugerencia quedan al pie, fuera de
      las zonas y sin marco. Reejecutados con timeout `pnpm run verify` (120 s:
      1307/1307, docs, config, tsc, build y bundle) y `pnpm run test:e2e` (180 s:
      163/163), sin procesos huérfanos. Revisado el diff completo: `src/host/**`,
      `index.html`, `tests/**` y artefactos; sin cambios en `src/game/**`,
      requisitos, arnés, plantillas, dependencias ni tareas 0106-0110. Las
      aserciones retiradas se sustituyeron por ausencia en el HUD y presencia en
      `F1`, sin debilitar cobertura. Capturas revisadas a 900×700 y 1280×720.
      El fallo intermitente de `EXP-004` por timeout de 5 s con 92 workers no se
      reprodujo en la reejecución; se clasifica como fricción de arnés y queda
      `deferred` a `harness-keeper`.
---

# Objetivo

Que el HUD izquierdo muestre tres zonas enmarcadas —Personaje, Arma y
Stats+Traits— con la información del jugador activo y sin los datos que REQ-033
retira.

# Contexto

La columna izquierda actual mezcla ficha, fase, turno, PV del enemigo, estado,
teclas y sugerencia. REQ-033 R-007/R-008 fija tres zonas y un pie; la base de
escala, paleta y relieve llega de TASK-0104.

# Criterios de aceptación

- [ ] La zona **Personaje** va en dos columnas: sprite a la izquierda; nombre,
      arquetipo y condición fantasma a la derecha, alineados arriba.
- [ ] La zona **Arma actual** muestra sprite, nombre, acierto y daño; si no hay
      arma, no se muestra ni deja texto vacío.
- [ ] La zona **Stats+Traits** muestra PV, MP, acciones y atributos; magia y maná
      solo si el personaje los tiene; traits solo si existen.
- [ ] No se muestran fase, turno, PV del enemigo ni estado de partida.
- [ ] Las teclas y la sugerencia de fin de turno se mantienen como texto plano al
      pie, fuera de las tres zonas y sin marco.
- [ ] Cada zona usa marco outset y fondo propio; el conjunto del HUD usa marco
      outset y respeta la escala y la paleta de TASK-0104.
- [ ] La columna sigue al jugador activo y al estado fantasma sin inventar datos.

# Plan de test

- Unitario: modelo del HUD por estado (vivo, fantasma, con/sin maná, con/sin
  traits, con/sin arma).
- Integración: `pnpm run verify`; árbol DOM de las tres zonas y ausencia de los
  nodos retirados.
- E2E: cambio de turno, fantasma, maná condicional, traits condicionales y pie.
- Manual: captura de la columna a 900×700 y 1280×720.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0105/attempt-1/report.md`
- [ ] Salida de `pnpm run verify` y del test E2E
- [ ] Capturas de los estados con y sin maná/traits/arma
- [ ] Commit SHA

# Restricciones

- Sin cambios en reglas, costes, inventario ni navegación.
- No se implementa el HUD derecho ni el panel.
- Sin arte nuevo: se usan los sprites existentes.

# No objetivos

- Ficha derecha, panel, cursor o QA visual final.
- Rediseñar el mapa o el marco.
