---
type: Task
id: TASK-0095
title: "Host: panel modal de inventario y equipo con `I`"
description: "Añadir el panel DOM sobre el mapa con equipo, mochila y objetos del suelo, navegación completa por teclado, foco visible, comparación de stats y traits, cobro al confirmar, y retirar `G` y `1`-`3` del input."
status: stable
task_status: done
task_type: feature
requirement: REQ-018
requirement_ids: [R-015, R-016, R-017, T-008, T-009]
depends_on: [TASK-0094]
unlocks: [TASK-0096, TASK-0097, TASK-0098]
created_at: 2026-11-13T19:22:51Z
completed_at: 2026-11-13T20:45:52Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0095/
priority: P1
risk: high
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T19:22:51Z }
verified:
  - by: task-lead
    at: 2026-11-13T20:45:52Z
    note: >-
      Verificación independiente en `task/TASK-0095` sobre la implementación
      `c37f3d4` (evidencia `13a01c5`, informe `d7d44af`). Revisado el diff
      completo: `src/host/{inventory-panel,inventory-panel-view,input,hud,main}.ts`,
      `index.html`, tests de input/HUD/panel e integración; sin cambios en
      `src/game/`, reglas, costes, catálogo ni dependencias, y sin tocar
      requisitos ni criterios. Reejecutados los focalizados (73/73 en cuatro
      archivos) y `pnpm run verify` (1237/1237; docs, config, tsc, build y
      bundle), con salida en `artifacts/TASK-0095/attempt-1/logs/verify-lead.txt`.
      Pasada E2E focalizada `game-input-hud.spec.ts` (1/1) como no regresión;
      E2E del panel queda en TASK-0098 según el plan. Comprobado en navegador:
      `I` abre sin gastar MP ni acción, `Escape` cierra, foco atrapado y visible,
      orden de tabulación equipo → suelo → cerrar, equipar desde el suelo cobra
      1 MP sin gastar acción y actualiza stats, un rechazo sin MP no mueve nada
      y muestra «Sin MP para esta operación», y `I` no abre en fase enemiga.
      Criterios revisados uno a uno, incluida la zona de suelo omitida si está
      vacía, `G`/`1`-`3` fuera de input y ayuda, y refresco con estado de
      presentación. Se corrigieron el `unlocks` de TASK-0096 y la entrada larga
      de `docs/log.md` que bloqueaban `docs:check`; la fricción de validar
      metadatos antes de lanzar queda diferida a `harness-keeper`. Limitación
      conocida: con varios objetos en el mismo tile, `PickUp` toma el primero y
      el panel lo advierte; equipar sí elige la fila concreta.

---

# Objetivo

Que el jugador gestione equipo, mochila y objetos del suelo desde un único panel
modal abierto con `I`, solo con teclado, viendo el antes y el después de cada
cambio, y que recoger y equipar dejen de tener atajos fuera del panel.

# Contexto

- El modelo y las operaciones llegan en TASK-0094; el estado ya expone huecos,
  mochila, capacidad y objetos del suelo.
- `index.html` declara los nodos del HUD; `src/host/input.ts` mapea teclas y
  `src/host/main.ts` monta el bucle y las animaciones.
- [REQ-018](../requirements/REQ-018-inventario-equipo.md#requisitos-técnicos)
  T-008 y T-009, y
  [R-015 a R-017](../requirements/REQ-018-inventario-equipo.md#requisitos-creativos-decididos).
- El host presenta; no recalcula stats ni valida huecos.
- Nota: R-015 dice que la zona del suelo se omite si está vacía y la sección no
  funcional pide anunciarla vacía. Prevalece la regla específica R-015; el aviso
  accesible describe el contenido cuando existe.

# Criterios de aceptación

- [ ] `I` abre el panel en el turno del jugador activo y `Escape` lo cierra; abrir
      no cuesta MP ni acción y no hay otra tecla de recogida.
- [ ] El panel es DOM sobre el marco 16:9, nunca dibujado en Canvas, con tres
      zonas: equipo, mochila y objetos del suelo del tile del jugador.
- [ ] La zona del suelo se omite si está vacía y muestra los objetos del tile si
      los hay.
- [ ] Se puede equipar, desequipar, recoger y soltar solo con teclado, con foco
      visible y orden de tabulación comprensible; ratón opcional.
- [ ] Antes de equipar se comparan los valores relevantes y, al confirmar, se
      muestran el total y el desglose de stats efectivos; los traits se leen en el
      hueco aunque hoy estén vacíos.
- [ ] Los costes se cobran al confirmar cada operación; un rechazo no cambia nada
      y explica el motivo en texto.
- [ ] Con el panel abierto, el mapa no acepta comandos; los cues del mapa no se
      mezclan con el panel y el panel no muestra un objeto antes de su cue.
- [ ] El panel no se abre en fase enemiga ni durante una animación; queda preparado
      para no abrirse en el turno de un fantasma cuando llegue `REQ-021`.
- [ ] `G` desaparece del input y de la ayuda; `1`-`3` dejan de cambiar de arma.
- [ ] `pnpm run verify` pasa; los tests de input, HUD y E2E existentes se actualizan
      sin debilitarse; sin dependencias nuevas.

# Plan de test

- Unitario: apertura y cierre, bloqueo cuyo, mapeo de teclas, foco, comparación y
  desglose, estados vacíos, motivo de rechazo, ausencia de `G` y `1`-`3`.
- Integración: estado real → modelo del panel → comando; recoger y equipar desde el
  panel cambian el estado y el MP; cue pendiente no aparece antes de tiempo.
- E2E / visual: no aplica aquí; la cobertura de navegador llega en TASK-0098.
- Manual: gestionar un equipo completo solo con teclado, sin mirar el ratón.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0095/attempt-1/report.md`
- [ ] Salida de `pnpm run verify` y de los tests focalizados
- [ ] Commit SHA en la rama `task/TASK-0095`

# Restricciones

- No cambiar reglas, costes, catálogo ni operaciones del motor.
- No dibujar el panel en Canvas ni duplicar la validación en el host.
- No añadir cofres, traits ni piezas de `REQ-019`/`REQ-020`.
- Sin dependencias nuevas; `src/game/` no importa `src/host/`.

# No objetivos

- Sprites de objetos en el suelo, efectos y `F1` (TASK-0096).
- Documentación (TASK-0097) y E2E (TASK-0098).
