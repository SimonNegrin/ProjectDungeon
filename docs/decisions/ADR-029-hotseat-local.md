---
type: ADR
title: "ADR-029: hotseat local por turnos"
description: Modelo de turno por jugador con N, orden fijo, una fase enemiga por ronda, relevo por cámara, recursos por turno, muerte en turno, resurrección por índice y resultado con Nueva y Cargar.
status: stable
decision_status: accepted
decided_by: [human:simon]
decided_at: 2026-11-14T22:25:22Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T10:20:00Z }
---

# Contexto

El juego nació de un solo jugador: `E` cerraba la fase completa de personajes y
`R` reiniciaba con la misma party y semilla. [REQ-031](../requirements/REQ-031-hotseat-local.md)
v2 convierte la partida en un hotseat local de 1 a 6 jugadores en el mismo teclado
y la misma pantalla, y TASK-0146 a TASK-0153 lo implementan; TASK-0154 lo verifica
con E2E. Este ADR fija el modelo de turnos que el código ya aplica, sin cambiar
ninguna regla aprobada.

# Decisión

## Estado y orden

- `GameState` guarda `activePlayerId`, `round` y `phase`; el orden es el índice de
  `state.players`, fijado al empezar la partida y sin comando para unir o salir.
  Todo es serializable y viaja en el guardado y en el snapshot de debug.
- Los comandos de una unidad distinta del activo se rechazan con
  `not-active-player`. No hay teclas por jugador: la mesa se autorregula.

## Cierre de turno y relevo

- `EndTurn` (`N`) valida que la unidad sea la activa, cierra su turno y elige al
  siguiente jugador **vivo o fantasma** con índice mayor. `N` funciona con
  recursos gastados o intactos: el turno no auto-termina.
- Si no queda nadie con índice mayor, se entra en la **fase enemiga**; el último
  `N` de la ronda la inicia sin aviso de relevo ni confirmación.
- Al cerrar el turno, el host programa el **paneo de relevo** de
  `src/host/camera-pan.ts`: 300 ms lineales, sin existencia del paneo con un solo
  jugador y salto instantáneo en la ronda 1 o con `prefers-reduced-motion`. El
  input se bloquea con `panning` hasta llegar.

## Recursos y muerte

- MP, acciones, maná y cupo de hechizos se restauran al **empezar el turno de cada
  jugador** (`restorePlayerTurn`), no todos al inicio de la fase; el activo empieza
  lleno y los que no han actuado conservan lo que tuvieran. La fase enemiga
  restaura a los enemigos con la misma función.
- Si el activo muere durante su turno, la acción en curso se resuelve, su turno se
  cierra y pasa al siguiente. Si no queda ningún vivo, la partida termina en
  derrota por wipe.
- La resurrección **no crea estado nuevo**: el resucitado vuelve a `players` en su
  índice. Si su índice no ha pasado, el siguiente `EndTurn` lo alcanza en la misma
  ronda; si ya pasó, espera a la siguiente. Sin dobles turnos.
- El fantasma conserva su turno, cierra con `N` sin gastar nada y no abre el
  panel; su acción por ronda y su MP intrínseco son los de REQ-021.

## Fase enemiga

- Hay **una única fase enemiga por ronda**. Los enemigos actúan en orden de índice
  y el motor publica por enemigo el actor, su objetivo y si actúa o espera
  (`enemyPhase` en `TurnResult`). Los dormidos esperan sin presentación.
- El motor no decide cámara, HUD ni avisos: el host presenta. Con al menos una
  acción enemiga, el host muestra «El master mueve» (~800 ms) antes del primer
  actor y el HUD derecho al enemigo que actúa; el izquierdo pasa a la ficha
  compacta del objetivo o a «Sin objetivo» si no persigue a nadie.
- Al terminar el último enemigo, la cámara vuelve al primer personaje y el host
  anuncia «Ronda N» sin bloquear.

## Avisos, HUD y resultado

- «Ronda N» aparece 2 s al empezar cada ronda de personajes y no bloquea input ni
  presentación; en la ronda 1 la cámara aparece directamente en el primer
  personaje.
- El HUD izquierdo muestra «Jugador N de M» junto al nombre del activo, con N su
  posición en el orden fijo.
- El panel de inventario solo se abre en el turno del activo, es público y queda
  fuera en fase enemiga; el fantasma no lo abre.
- El resultado vive en el host y lee el estado final: Victoria o Derrota, ronda,
  party y semilla, con «Nueva partida» (paso 1 de REQ-016) y «Cargar partida». No
  hay reinicio automático ni atajo `R`.
- La pausa es la global de [REQ-024](../requirements/REQ-024-menu-pausa-guardado.md):
  cualquier jugador la abre con `Esc`; guardar solo en fase de personajes y sin
  animación, y cargar devuelve el control al activo.

## Controles

- `N` es la tecla de fin de turno en todo el juego; **`E` deja de existir** y `R`
  no vuelve. `Esc` abre y cierra la pausa, y sigue cerrando antes el panel o la
  lista de hechizos.
- Esta sustitución supera la tecla `E` de [ADR-020](ADR-020-economia-acciones.md);
  la economía de acciones de ese ADR sigue vigente.

# Consecuencias

- Un solo teclado y una sola pantalla: no hay información privada ni pantallas por
  jugador; todo lo que se ve es público.
- El motor gana un estado de turno explícito y determinista; el guardado lo
  conserva y la carga reanuda en el activo, no al principio de la ronda.
- El relevo y los avisos son presentación: si fallan, el estado sigue siendo
  correcto y los tests del motor no dependen del DOM.
- Sin temporizadores de turno ni de fantasma; el ritmo lo marca la mesa.
- Los turnos muertos desaparecen: morir en el propio turno lo cierra y un wipe
  termina la partida sin pedir una pulsación extra.

# Alternativas descartadas

- **Auto-fin al agotar recursos**: impide moverse después de la última acción y
  rompe el control de la mesa.
- **Aviso con `Enter` entre jugadores**: añade una pulsación por relevo y una
  pantalla que puede revelar información de un jugador a los demás.
- **Reinicio rápido con `R`**: conserva party y semilla y salta la confirmación de
  REQ-024; el resultado y el menú ya ofrecen Nueva y Cargar.
- **Dos fases enemigas por ronda**: alarga la espera de los jugadores y complica
  la resurrección por índice.
- **Teclas por jugador**: obliga a recordar un mapa por asiento y contradice la
  mesa compartida.

# Enlaces

- [REQ-031](../requirements/REQ-031-hotseat-local.md)
- [REQ-024](../requirements/REQ-024-menu-pausa-guardado.md)
- [REQ-021](../requirements/REQ-021-muerte-fantasma-resurreccion.md)
- [Economía de turno](../design/turn-economy.md)
- [Arquitectura](../design/architecture.md#hotseat)
- [ADR-020](ADR-020-economia-acciones.md)
- [ADR-028](ADR-028-formato-guardado-v1.md)
