---
type: Task Note
title: "TASK-0080: detalle del informe"
description: Bloqueo de docs, corrección de PV previos, escenarios E2E acotados y fricción.
task: TASK-0080
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-12T21:50:00Z }
---

# Bloqueo de docs

El brief y la ficha piden actualizar `docs/glossary.md`,
`docs/design/turn-economy.md`, `docs/design/architecture.md`, un ADR y
`docs/decisions/index.md`. El runner tiene instrucciones explícitas de no editar
`docs/` y el entorno lo refuerza: `edit` devolvió `Permission denied: edit` en el
glosario y en economía de turno, y `write` lo devolvió al crear el ADR. No se ha
modificado ningún archivo de `docs/` ni de `docs/requirements/`.

La propuesta exacta está en `docs-proposal.txt`: fila de glosario, sección de
réplica en economía de turno, sección de arquitectura, ADR-022 completo y entrada
de índice. El lead o requirements-writer puede aplicarla; `docs:check` ya pasa
con el árbol actual, pero los criterios documentales de la ficha no se cumplen.

# Corrección de PV previos en golpes letales

`presentationState` deshacía un ataque futuro con `targetHp + damage`. Con daño
sobrante (3 PV, golpe de 4) pintaba 4 PV antes del cue. La réplica de REQ-027 dejó
al descubierto el caso en `motion-qa`: el enemigo quedaba en 3 PV y el siguiente
golpe era letal. Se añadió una reconstrucción hacia delante desde
`initialState` (`hpBeforeEvents`) y se conserva el cálculo inverso cuando no hay
estado inicial. Es presentación, no regla, y tiene test unitario.

# Escenarios E2E acotados

- Derrotas a 80 turnos (`combat-equipment-qa` y `game-input-hud`): el jugador
  armado replicaba a los enemigos que fallaban y los mataba, así que la derrota
  ya no llegaba. Se carga con el hook de setup un jugador desarmado
  (`playerEquipment.weaponId = null`, `playerWeapons = []`) y un centinela
  alerta adyacente. No se toca el motor ni las reglas y se conservan
  `TurnEnded`, `EnemyPhaseStarted`, turno, PV, overlay y reinicio.
- `motion-qa`: el bruto objetivo usa `hp/maxHp = bestiario + 4` para que el
  tercer golpe (ataque + réplica + ataque) no sea letal y el texto `-N` conserve
  su persistencia tras la animación. Se mantiene el resto del recorrido, la
  cámara, el daño y el overlay.
- `combat-equipment-qa` «fallo con texto»: el fallo inicial no dispara réplica
  porque el enemigo está dormido; la réplica del jugador ocurre en la fase
  enemiga. Se comprueba en su cue con `dispatchFrozen` y `advanceToCue`, y se
  afirma que no hay texto nuevo. El último ataque se muestrea en su cue porque
  el rAF real consumía la persistencia de 1000 ms antes del `settle`.

# Nota de QA visual

El texto `Fallo` se superpone parcialmente al sprite del defensor, como en todo
fallo de REQ-017. La lectura del giro es el desplazamiento de la animación de
ataque (2-4 px; 3 px configurados), no un cambio de sprite ni de orientación: el
renderer no tiene sistema de orientación y no se añadió arte.

# Fricción

1. **Permisos de docs contra el brief.** El reparto de propiedad de AGENTS y el
   permiso del entorno impiden al runner editar `docs/`; la ficha asigna esos
   cambios al runner. Se repite en cualquier tarea mixta host+docs y deja el
   intento a medias. Propuesta: permitir al runner solo glosario, diseño y
   decisiones, o trasladar esos cambios al lead en la ficha. Coste bajo.
   Disposición `pending`.
2. **REQ-017 sin nota de enmienda.** `REQ-027` declara la enmienda a `REQ-017`
   (fila, beat y excepción) y `REQ-017` no tiene nota de verificación, mientras
   `REQ-009` y `REQ-010` sí. Afecta a la trazabilidad de la matriz. Propuesta:
   añadir la nota y la fila `ReplicaPerformed` desde requirements-writer con
   aprobación humana. Coste bajo. Disposición `pending`.
