---
type: ADR
title: "ADR-017: feedback visual dirigido por eventos y reloj de presentación"
description: Todo evento se presenta con cues deterministas sobre el mismo reloj que el movimiento; el motor sigue siendo la única verdad y el estado visible se retrasa hasta su evento.
status: stable
decision_status: accepted
decided_by: [human:simon, deepseek/v4.1-flash]
decided_at: 2026-11-10T00:45:43Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-10T00:45:43Z }
---

# Contexto

`ADR-008` resolvió el movimiento con una timeline de presentación construida a
partir de los eventos del motor. El resto del feedback creció de forma
desigual: el daño y el destello usan temporizadores del navegador y un único
elemento DOM, el `!` se recrea en cada render, el aviso de alarma se muestra al
inicio de la acción y la muerte o la recogida se aplican en el estado final
antes de que el jugador vea el evento.

Eso produce tres problemas:

1. **Información perdida**: hay eventos sin presentación y otros que se
   solapan o se sustituyen.
2. **Desincronización**: el estado visible puede ir por delante del evento que lo
   provoca; el aviso de alarma puede aparecer antes de la onda.
3. **Ritmo**: un ataque sin desplazamiento no tiene beat y aparece de golpe; una
   muerte se lee como una desaparición instantánea.

`REQ-017` fija las reglas creativas: cobertura exhaustiva, ritmo pausado, lenguaje
vintage contenido, input bloqueado y descartado, fase enemiga secuencial con
atajo fuera de pantalla y cadáver persistente. Este ADR decide cómo
implementarlo sin cambiar las reglas del juego.

La decisión creativa es del usuario; la forma de implementarla es técnica.

# Decisión

## Fuente de verdad y alcance

- **El motor no cambia**: no se añaden comandos ni eventos; `src/game/` no se
  toca. El feedback se deriva de los eventos ordenados y del estado inicial y
  final.
- **Presentación, no simulación**: el host no recalcula impacto, daño, muerte,
  percepción ni botín. Solo decide cuándo y cómo se muestra lo que el motor ya
  resolvió.
- **Cobertura exhaustiva**: cada `GameEvent` tiene un cue o una excepción
  declarada. La excepción inicial es `TurnEnded` cuando le sigue
  `EnemyPhaseStarted`; no se añaden otras sin una decisión registrada.

## Una sola timeline de presentación

- **Timeline única**: movimiento y feedback comparten un solo reloj y una sola
  estructura de presentación. `buildMotionTimeline` se amplía para producir
  también los cues de feedback, o se compone con un `buildFeedbackTimeline` que
  comparte el mismo `elapsed`. No hay dos relojes compitiendo.
- **Timeline pura**: el constructor no conoce DOM, Canvas, `performance.now` ni
  `requestAnimationFrame`. Recibe eventos, estado inicial, estado final y la
  política de visibilidad; devuelve cues con `kind`, `atMs`, `durationMs`,
  ancla y datos de presentación.
- **Cue**: unidad mínima de feedback. Un ataque puede generar varios cues
  (embestida, destello, retroceso, texto, tick de PV) con el mismo `atMs` y
  distinta duración. El beat se declara por evento en `FEEDBACK_CONFIG` y puede
  ser mayor que sus cues visuales; los textos no bloqueantes pueden persistir más
  allá del beat.
- **Beat**: tiempo mínimo en que el input sigue bloqueado. Los textos, banners y
  marcas pueden persistir más allá del beat; el beat solo gobierna cuándo se
  presenta el siguiente evento y cuándo vuelve el input.

## Configuración

- **`FEEDBACK_CONFIG`**: una única configuración con las duraciones de `REQ-017`.
  Incluye beats, duraciones de destello, parpadeo, disolución, textos, banners,
  atajo fuera de pantalla y límites de textos simultáneos.
- **`MOTION_CONFIG` se conserva** con 125/70 y diagonal a duración constante. El
  feedback no redefine el movimiento.
- **Sin números mágicos** repartidos por el host. Cambiar un beat debe tocar solo
  la configuración y la decisión registrada.

## Estado visible retrasado

El estado del motor es el final de la acción, pero el render y el HUD deben
mostrar el estado intermedio correspondiente al reloj. La presentación conserva
el estado inicial y el final y deriva una vista intermedia:

- **Ataque**: la vida del objetivo baja en el cue de impacto, no al inicio. Ya
  existe una reversión parcial; se conserva y se generaliza.
- **Muerte**: la unidad sigue dibujándose como viva hasta `UnitDied`; después se
  dibuja el cadáver. La desaparición no ocurre en el impacto.
- **Recogida**: el arma permanece en el suelo y el inventario no cambia hasta
  `PickUp`. El estado final ya no se muestra al inicio.
- **Cambio de arma**: el arma equipada y el sprite cambian en `SelectWeapon`.
- **Fase y turno**: se mantienen las reversiones actuales de fase, turno y
  estado de partida.
- **Avisos**: la alarma y el rechazo se muestran en el instante de su evento, no
  al aplicar el comando. Esto corrige el aviso de alarma que hoy sale antes de
  la onda.

La vista intermedia no se serializa ni se envía: es una proyección de
presentación.

## Capas y dibujo

- **Canvas** para lo que vive en el mundo: destellos de sprite, embestidas,
  retrocesos, parpadeos, sacudidas de sprite, onda de alarma, fundidos de muerte
  y cadáveres.
- **DOM** para lo que debe leerse con nitidez y no depende del escalado del
  Canvas: textos de daño, `!`, `zzz`, `...`, banners de fase, avisos y overlay.
- **Orden**: suelo → decals → cadáveres → camino/cursor → unidades → efectos de
  mundo → texto/banners → HUD. El feedback nunca tapa la rejilla, el cursor ni el
  camino.
- **Texto anclado al mundo**: cada texto guarda su ancla en tiles y se recoloca
  con la cámara en cada frame. Pueden coexistir hasta tres textos; el cuarto
  sustituye al más antiguo. No se reutiliza un único elemento que borre el
  anterior.
- **Nodos DOM estables**: `!`, textos y banners se reutilizan por unidad o por
  cue. Las animaciones de entrada se disparan al empezar el cue, no en cada
  render.
- **Sacudida**: se aplica como offset de sprite o de cámara en Canvas, nunca como
  transformación CSS del marco completo. Máximo 2 px; `prefers-reduced-motion`
  la desactiva.
- **Pixel art**: sin `imageSmoothing`, sin blur, sin degradados y sin partículas.
  Los efectos usan la paleta y los sprites existentes.

## Fase enemiga y fuera de pantalla

- **Secuencial**: las acciones enemigas se presentan en el orden del motor, sin
  relojes paralelos por unidad en este corte.
- **Visible**: si el recorrido del enemigo empieza o termina dentro del viewport,
  se presenta completo y la cámara lo sigue.
- **Fuera de pantalla**: si empieza y termina fuera del viewport, se aplica un
  beat de 150 ms, sin seguimiento de cámara y sin tween por tile; el cambio de
  posición se ve al inicio del beat. El orden de eventos se mantiene.
- **Cruce del borde**: si el enemigo entra o sale del viewport, se presenta el
  recorrido completo; la cámara no se mueve si el foco no es el jugador.
- **Visibilidad**: la decide el host con la cámara y el viewport. El constructor
  de la timeline recibe la política; no la deduce de un reloj.

## Input

- **Bloqueo y descarte**: mientras hay un beat activo, las intenciones de juego
  se descartan; no se encolan. Es consistente con `REQ-006`.
- **Excepciones**: `F1` sigue alternando el debug y `R` sigue reiniciando y
  cancela la presentación.
- **API de test**: `window.__game.dispatch` completa la presentación pendiente
  antes de aplicar el comando, para conservar el determinismo de los E2E.

## Movimiento reducido

- Con `prefers-reduced-motion: reduce` no hay tween, sacudida ni parpadeo. Cada
  cue aplica su estado final en el instante del evento y conserva texto, banner
  o marca estática. El orden de eventos y el estado final son los mismos.
- El modo instantáneo no elimina información: un impacto sigue mostrando `-N` o
  `Fallo`; una muerte sigue dejando cadáver; una alarma sigue mostrando banner.

## Cadáver persistente

- **Solo presentación**: el motor ya conserva la unidad muerta con su posición y
  su equipo. El host dibuja un decal de cadáver en ese tile. No hay colisión, no
  hay interacción y no se escribe en `state.grid.tiles`.
- **Persistencia**: hasta reiniciar la sala, regenerar la semilla o cambiar de
  nivel.
- **Sprite reservado**: `corpse-22a/b` deja de usarse como decoración ambiental.
  Huesos, sangre y manchas siguen como decoración. Así un cadáver dibujado en el
  suelo siempre significa que allí murió una unidad.
- **Saqueo futuro**: cuando llegue, tendrá su propia hoja y podrá leer el botín de
  la unidad muerta. Este ADR no crea una entidad de motor ni una regla de
  interacción.

## Debug y tests

- `window.__game.animation` incluye los cues activos (tipo, unidad, inicio y
  duración) y `advance(ms)` avanza el reloj de presentación de forma
  determinista.
- Los unitarios cubren la timeline, el estado intermedio, la configuración y las
  transiciones de cada cue. Los E2E muestrean frames con `advance` y la QA visual
  captura el pico de cada efecto.
- No se exponen mutadores del estado vivo; `snapshot()` sigue siendo el estado
  final serializable.

## Sin dependencias nuevas

No se añaden librerías. El feedback se implementa con Canvas 2D, DOM/CSS y el
reloj existente. No se importa código de `experiments/` desde producción.

# Consecuencias

- `src/game/` queda intacto; el determinismo y los tests de motor no cambian.
- `presentationState` y el renderer se amplían para proyectar muertes, recogidas,
  cambios de arma y avisos en su cue. Es el cambio técnico principal.
- Los temporizadores de feedback (`setTimeout`) desaparecen del camino de juego;
  todo se apaga con el reloj de presentación.
- El input queda bloqueado también en ataques, recogidas y cambios de arma. La
  fase enemiga fuera de pantalla y los silencios redundantes evitan que el ritmo
  pausado se convierta en espera.
- El aviso de alarma deja de salir al inicio de la acción; sale con la onda.
- La recogida y el cambio de arma se ven antes de aplicarse en el HUD; el
  jugador entiende qué ha cambiado.
- El cadáver persistente no altera el pathfinding ni el estado. Cuando llegue el
  saqueo, hará falta una hoja nueva y, probablemente, estado de motor.
- `REQ-006` conserva su ritmo; su fuera de alcance sobre animar ataques queda
  superado por `REQ-017`. `REQ-008` reduce su catálogo ambiental al retirar
  `corpse-22a/b`; los huesos y la sangre siguen disponibles.
- El coste por frame depende de los cues visibles, no del tamaño del mapa. La
  onda de alarma y los textos son acotados.
- Los valores exactos son revisables en playtest sin tocar reglas ni tests de
  motor; cambiarlos exige tocar `FEEDBACK_CONFIG` y la decisión registrada.

# Alternativas descartadas

- **Un `setTimeout` por evento**: no es determinista, se desincroniza con el
  reloj de movimiento y no se puede avanzar en tests.
- **Animar dentro del motor**: cambiaría reglas, determinismo y tests; el motor
  seguiría conociendo tiempo real.
- **Relojes paralelos por unidad**: permite solapar la fase enemiga, pero
  complica el orden, la cámara y la reproducibilidad. Se pospone.
- **Sacudida de cámara a pantalla completa**: produce mareo y rompe la lectura de
  la rejilla; se limita a sprite o 1-2 px de cámara.
- **Partículas, blur o degradados**: rompen el aspecto vintage y ensucian la
  lectura de tiles.
- **Cadáver como entidad de motor ahora**: añade estado, colisión o interacción y
  amplía el alcance; el saqueo tendrá su propia hoja.
- **Seguir la cámara a los enemigos fuera de pantalla**: aleja al jugador de su
  posición y alarga la fase enemiga.
- **Recrear los nodos DOM en cada render**: reinicia las animaciones y produce
  parpadeo; se reutilizan nodos.
- **Audio en este ADR**: el usuario lo dejó fuera de alcance.

# Enlaces

- [REQ-017](../requirements/REQ-017-feedback-visual-eventos.md)
- [REQ-006](../requirements/REQ-006-movimiento-animado.md)
- [REQ-008](../requirements/REQ-008-suelo-programatico-decoracion-ambiental.md)
- [REQ-009](../requirements/REQ-009-percepcion-alarma-huida.md)
- [ADR-006](ADR-006-arte-placeholder-32rogues.md)
- [ADR-008](ADR-008-presentacion-animada.md)
- [ADR-011](ADR-011-suelo-programatico-ambientes.md)
- [Arquitectura](../design/architecture.md)
- [Economía de turno](../design/turn-economy.md)
