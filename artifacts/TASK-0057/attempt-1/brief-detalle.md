---
type: Task Brief Detail
title: "TASK-0057: detalle del brief del intento 1"
description: "Diseño esperado para cues, estado intermedio, eventos de presentación y debug."
task: TASK-0057
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-10T03:00:00Z }
---

# Contrato de la timeline

Extiende `buildMotionTimeline` o compón un `buildFeedbackTimeline` que comparta
el mismo `elapsed`; no crees un segundo reloj. La estructura debe exponer:

- `cues: readonly FeedbackCue[]` con `kind`, `atMs`, `durationMs`, `anchor`
  (tile/unidad) y `data` de presentación.
- `beatEndMs` por evento, o un `blockingUntilMs`, para saber cuándo vuelve el
  input. El beat puede ser mayor que la duración visual.
- `totalMs` final = fin del último beat. El movimiento conserva exactamente sus
  fases 125/70 y `n + 1` pausas.

Los eventos que no son `UnitMoved` se secuencian: cada uno empieza al acabar el
beat del anterior. `CommandRejected` tiene beat 0 y no alarga la timeline.
`TurnEnded` tiene 0 si el siguiente evento es `EnemyPhaseStarted` y 250 ms si va
solo. Una cadena ataque (320) + muerte (900) + fin (800) da ~2 s.

La construcción es pura y determinista: dos construcciones iguales devuelven lo
mismo; no muta eventos ni estado.

# Eventos de presentación del host

`PickUp` y `SelectWeapon` no son `GameEvent` del motor. Define un tipo de evento
de presentación del host (por ejemplo `PresentationEvent = GameEvent |
{type:'PickUp',...} | {type:'SelectWeapon',...}`) con los datos que necesite el
cue (unidad, arma, slot). En `applyCommand`, tras despachar el comando, crea el
evento de presentación solo si el estado cambió; no lo añadas a
`DispatchResult.events`, a `lastEvents` ni al motor. La timeline y
`presentationState` lo consumen igual que un evento.

# Estado intermedio

`presentationState(state, timeline, elapsed, initialState)` debe seguir siendo
puro y devolver una proyección (no serializable ni estado vivo):

- Ataque/MP/acción: conserva la reversión actual.
- Muerte: antes del cue de `UnitDied` la unidad se dibuja como viva; el HUD
  puede mostrar PV 0 tras el impacto. Expón un helper/opción de render
  (`dyingUnitIds` o similar) en vez de inventar PV o escribir en la rejilla. El
  cadáver real es TASK-0058.
- Recogida: antes del cue, el arma sigue en `map.weapons` y el jugador conserva
  inventario, arma equipada y MP iniciales; después coincide con el motor.
- Cambio de arma: el arma equipada es la inicial hasta el cue.
- Fase/turno/fin de partida: usa el `atMs` del cue, ya secuenciado.
- Avisos: `AlarmRaised` se muestra en su cue, no al aplicar el comando;
  `CommandRejected` sigue siendo inmediato y sin beat.

# Host y debug

- `applyCommand` inicia animación si hay beat > 0; `fireFeedbacks` dispara los
  efectos/avisos en su ventana. Sin `setTimeout` nuevos para duraciones de
  juego; los existentes de daño/destello pueden quedarse hasta TASK-0058 pero
  leyendo `FEEDBACK_CONFIG`.
- `AnimationSnapshot` añade `cues` activos (tipo, unidad, inicio, duración) y
  `advance(ms)` los actualiza de forma determinista. No expongas mutadores del
  estado vivo; el snapshot final sigue siendo serializable.
- `translateKey` ya descarta con `animating`; úsalo con el beat real. No cambies
  el mapeo de teclas.

# Tests mínimos

- Configuración: beats de REQ-017, `MOTION_CONFIG` intacta, sin duraciones
  dispersas.
- Timeline: cue por cada evento, orden, `atMs`, duración, ancla, pureza,
  `TurnEnded` silencioso, cadena terminal.
- Estado intermedio: antes/después de `UnitDied`, recogida, cambio de arma,
  `EnemyPhaseStarted`, `GameEnded` y `AlarmRaised`.
- Input/beat: un ataque sin movimiento crea beat > 0 y descarta intenciones;
  `F1`/`R` activos; `dispatch` completa.
- Debug: cues activos y `advance(ms)`.
