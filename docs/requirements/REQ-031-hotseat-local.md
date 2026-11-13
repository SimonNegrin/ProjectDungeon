---
type: Requirement Sheet
id: REQ-031
title: Hotseat local en el mismo teclado
description: "Uno a seis jugadores por turnos en la misma pantalla y teclado: turno por jugador con N, relevo por cámara sin confirmación, aviso de ronda no bloqueante, fase enemiga con HUD del actor y su objetivo, aviso «El master mueve» y sin información privada."
status: stable
version: 1
decision_owner: human:simon
review_required: true
created_at: 2026-11-13T19:07:43Z
updated_at: 2026-11-13T19:07:43Z
related_tasks: []
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T19:07:43Z }
verified:
  - by: human:simon
    at: 2026-11-13T19:07:43Z
    note: >-
      Aprueba el modo: 1-6 jugadores, turno por jugador con `N`, relevo por
      cámara sin aviso ni Enter, aviso de ronda no bloqueante, fase enemiga con
      HUD del actor y su objetivo, «El master mueve» solo si hay acciones,
      reinicio desde la pausa con misma party y semilla, y REQ-016 en v2.
---

# Contexto

La visión fija el hotseat como modo obligatorio: varios jugadores se turnan en el
mismo teclado y la misma pantalla, en sesiones de 20-40 minutos para grupos
pequeños. Hoy el juego es de un solo jugador: el estado ya representa listas de
jugadores y enemigos, pero `E` cierra la fase completa, `R` reinicia al instante y
no hay pantalla de inicio.

Esta hoja define el **modo hotseat local**: cuántos jugadores, cómo se ordena el
turno, cómo se releva el control, cómo se presenta la fase enemiga y cómo
conviven la pausa, el guardado y el reinicio. No define el remoto por QR, que
sigue en fase 3, ni la configuración de la partida, que vive en
[REQ-016](REQ-016-pantalla-inicio-configuracion.md).

La sesión del 2026-11-13 cierra las decisiones: `N` como tecla de fin de turno,
relevo directo por cámara, aviso de ronda no bloqueante, HUD contextual en la
fase enemiga, «El master mueve» y reinicio con la misma party y semilla.

# Objetivos de experiencia

- Que la mesa sepa siempre a quién le toca y qué está pasando.
- Que el relevo no cueste pulsaciones extra ni explicaciones.
- Que la fase enemiga se siga sin perderse: quién actúa y a quién apunta.
- Que el cooperativo sea de mesa: todos ven todo, sin pantallas privadas.
- Que morir no saque a nadie y que el fantasma no frene la partida.
- Que 1-6 jugadores usen el mismo flujo, sin caminos paralelos.
- Que reiniciar sea una decisión explícita, no una tecla accidental.

# Requisitos creativos (decididos)

| ID | Requisito | Aceptación |
|---|---|---|
| R-001 | El hotseat admite de **1 a 6 jugadores**, cada uno con un personaje, en el mismo teclado y la misma pantalla. El roster y el orden se fijan al empezar; no hay entrada ni salida a mitad de partida. | La partida arranca con N jugadores entre 1 y 6; el orden es el de configuración; no existe comando para unir o salir. |
| R-002 | Cada jugador tiene su propio turno con su MP, acciones y maná. El turno **no termina solo** al agotarlos: `N` (Next) lo cierra en cualquier momento. | `N` cierra el turno con recursos gastados o intactos; no hay auto-fin. |
| R-003 | Todos los jugadores actúan en **orden fijo** dentro de la fase de personajes; después hay **una única fase enemiga** por ronda. | El orden no cambia durante la partida; la fase enemiga ocurre una vez por ronda. |
| R-004 | Cuando el último jugador cierra su turno, se pasa **automáticamente** a la fase enemiga. | El último `N` inicia la fase enemiga sin aviso de relevo ni confirmación. |
| R-005 | **Sin aviso ni confirmación entre jugadores:** el control pasa al siguiente, la cámara hace paneo hasta él y el HUD izquierdo muestra su ficha. Los comandos se bloquean durante el paneo y se liberan al terminar. | `N` pasa al siguiente sin Enter; durante el paneo se ignoran los comandos; al terminar, el activo puede actuar. |
| R-006 | Al empezar cada ronda de personajes aparece **«Ronda N»** en la parte superior durante unos segundos (2 s por defecto, configurable). **No bloquea:** se puede mover el cursor, actuar o abrir el panel mientras se desvanece. En la ronda 1 la cámara aparece directamente en el primer personaje; en las siguientes hace paneo. | El aviso no impide comandos; la ronda 1 no hace paneo; las siguientes sí. |
| R-007 | Si al menos un enemigo va a moverse o atacar, al entrar en la fase enemiga aparece **«El master mueve»** con animación durante un instante (~800 ms, configurable) y desaparece antes de que actúen. Si ningún enemigo actúa, se omite. | Con acciones enemigas se ve el aviso; sin acciones no aparece; los jugadores no intervienen. |
| R-008 | Los enemigos actúan en orden de índice. **Solo los que mueven o atacan** reciben cámara y HUD; los dormidos o en espera se resuelven sin presentación. | La cámara no se detiene en enemigos que esperan; cada acción enemiga tiene su presentación. |
| R-009 | Durante la fase enemiga, el **HUD derecho** muestra al enemigo que actúa y el **izquierdo** una ficha compacta del personaje objetivo (miniatura, nombre, PV y stats; sin inventario ni equipo). Si no persigue a nadie, muestra **«Sin objetivo»**. | El actor aparece a la derecha; el objetivo a la izquierda; sin objetivo no se inventa un personaje. |
| R-010 | Al terminar el último enemigo, la cámara se centra en el primer personaje, el HUD izquierdo muestra su ficha y aparece **«Ronda N»**. No hay aviso de relevo. | La vuelta a la fase de personajes no pide pulsación; el aviso de ronda es el único. |
| R-011 | El panel de inventario y equipo solo se abre en el turno del jugador activo, es **público** para la mesa y se cierra al terminar el turno; el fantasma no lo abre. | No se abre en turno ajeno ni en fase enemiga; su contenido es visible para todos. |
| R-012 | Solo se aceptan comandos del jugador activo; no hay teclas por jugador. La mesa se autorregula y la pausa es global. | Los comandos de otras unidades se rechazan; no existe mapeo por jugador; cualquier jugador puede pausar. |
| R-013 | El fantasma conserva su turno en el orden, mueve con su MP intrínseco y **una acción por ronda**, y puede cerrar el turno con `N` sin gastar nada; no abre el panel. | El fantasma respeta su índice; `N` lo pasa; el panel sigue bloqueado. |
| R-014 | Un jugador resucitado actúa en la **misma ronda** si su índice aún no ha pasado; si ya pasó, en la siguiente. Sus recursos se restauran al empezar su turno. | Resucitar antes del índice devuelve el turno esa ronda; después, a la siguiente; sin dobles turnos. |
| R-015 | Si el jugador activo muere durante su turno, se resuelve la acción en curso, el turno termina y pasa al siguiente. Si era el último vivo, la partida termina en derrota. | La acción que causó la muerte se resuelve; no queda un turno muerto; el wipe termina la partida. |
| R-016 | No hay temporizador de turno ni de fantasma en este corte. | Ningún turno se cierra por tiempo; no hay cuenta atrás. |
| R-017 | Los objetos se pasan entre jugadores **soltando (1 MP) y recogiendo (1 MP)**; no hay entrega directa. | No existe comando de entrega; el objeto pasa por el suelo. |
| R-018 | La pausa es **global** y la abre cualquier jugador con `Esc`. Guardar solo está disponible en la fase de personajes y sin animaciones; cargar reanuda en el turno del jugador activo. | Cualquiera pausa; guardar se desactiva en fase enemiga o animación; cargar devuelve el control al activo. |
| R-019 | El menú de pausa ofrece **«Reiniciar partida»**, que abre un diálogo con **«Nueva»** y **«Reiniciar»**: «Reiniciar» repite la misma party y semilla; «Nueva» lleva a la pantalla de inicio; `Esc` cancela. | Reiniciar reconstruye la misma mazmorra; Nueva abre la configuración; cancelar no cambia nada. |
| R-020 | Al ganar o perder se muestra una pantalla de resultado con **«Reiniciar»** y **«Nueva»**; no hay reinicio automático. | El resultado no avanza solo; las dos acciones son explícitas. |
| R-021 | Con un solo jugador se usa la misma ruta: no hay paneo de relevo, pero sí aviso de ronda y «El master mueve» cuando corresponda. | El solitario comparte estado y flujo; solo desaparece el relevo. |
| R-022 | La cámara sigue al jugador activo y, en la fase enemiga, al enemigo que actúa; los paneos respetan `prefers-reduced-motion`. | La cámara cambia con el actor; con movimiento reducido salta sin animación. |
| R-023 | **`N` sustituye a `E`** como tecla de terminar turno en todo el juego; **`R` desaparece**; `Esc` abre la pausa. | La ayuda de controles y los tests usan `N`; no queda `E` de fin de turno ni `R` de reinicio. |
| R-024 | No hay información privada: mapa, HUD y paneles son públicos. Cada cambio de turno, ronda o fase tiene feedback visual y de texto accesible. | No hay pantallas privadas; los avisos se anuncian sin depender solo del color o la animación. |

# Requisitos técnicos

| ID | Requisito | Aceptación |
|---|---|---|
| T-001 | El estado guarda **jugador activo**, **índice de ronda** y la configuración de la partida (semilla, party y orden), además de las listas actuales. Todo es serializable. | El snapshot expone activo, ronda y orden; el guardado los reconstruye. |
| T-002 | `EndTurn` (`N`) valida que la unidad sea la activa, cierra su turno y avanza el índice; tras el último lanza la fase enemiga. Los comandos de otras unidades se rechazan. | Tests de comando con unidad no activa, avance de índice y transición a la fase enemiga. |
| T-003 | MP, acciones, maná y cupo de hechizos se restauran al **empezar el turno de cada jugador**, no todos al inicio de la fase. | Cada activo empieza con sus recursos; el resucitado los recibe en su turno. |
| T-004 | La fase enemiga expone por enemigo el actor, su objetivo y si espera o actúa, en orden determinista. El motor no decide cámara ni HUD; el host presenta. | El host puede saltar a los que esperan y mostrar actor/objetivo sin leer estado interno. |
| T-005 | El snapshot de debug y `F1` exponen activo, ronda, orden, fase, actor enemigo y objetivo actual. | La UI y `F1` leen del mismo estado; no hay listas duplicadas. |
| T-006 | Cámara, avisos «Ronda N» y «El master mueve» y HUD contextual viven en el host; el motor sigue puro. | `src/game/` no importa `src/host/`; los tests del motor corren sin DOM. |
| T-007 | El input mapea `N` a fin de turno y `Esc` a pausa; elimina `E` y `R`. Bloquea comandos solo durante el paneo y las animaciones; el aviso de ronda no bloquea. | Tests de teclas, bloqueo durante paneo, libertad durante el aviso y ausencia de `E`/`R`. |
| T-008 | El HUD izquierdo muestra la ficha completa del activo en fase de personajes y la ficha compacta del objetivo en la enemiga; el derecho muestra el detalle del cursor en personajes y al actor en la enemiga. | Cambio de HUD por fase; `aria-live` anuncia activo, ronda y actor. |
| T-009 | El guardado solo se permite en fase de personajes y sin animación; incluye semilla, party, orden, activo y ronda. Cargar devuelve el control al activo. | Guardar en enemiga o animación se rechaza; ida y vuelta conserva activo y ronda. |
| T-010 | Reiniciar reconstruye el estado inicial desde la configuración guardada (misma party y semilla); Nueva abre la pantalla de inicio. No queda atajo `R`. | Mismo reinicio produce la misma mazmorra y party; Nueva no reutiliza la partida. |
| T-011 | La pantalla de inicio construye N jugadores y una semilla visible y editable (REQ-016 v2); el hotseat consume ese estado sin lógica paralela. | N jugadores y semilla llegan al motor; el modo no reconfigura la party. |
| T-012 | Tests nuevos: 2 y 6 jugadores, validación de activo, `N`, relevo, aviso de ronda, recursos por turno, muerte en turno, resurrección por índice, fantasma, eventos de actor/objetivo, salto de dormidos, «El master mueve», restricción de guardado, reinicio con misma semilla y E2E de dos jugadores. No se debilitan tests existentes. | `pnpm run verify` pasa; los tests de `REQ-005`, `REQ-009`, `REQ-010`, `REQ-017`, `REQ-021` y `REQ-026` conservan su intención. |
| T-013 | Se registra **ADR-025** del modelo de turnos hotseat y se actualizan glosario, [economía de turno](../design/turn-economy.md) y arquitectura, con notas en REQ-005/017/018/021/022/023/024/026. | `pnpm run docs:check` pasa; no queda `E` de fin de turno ni `R` de reinicio como controles vigentes. |
| T-014 | Sin dependencias nuevas, sin red y sin persistencia entre sesiones; el motor sigue sin DOM. | `package.json` y `pnpm-lock.yaml` no cambian; no hay llamadas de red. |

# Requisitos no funcionales

- **Rendimiento:** hasta 6 jugadores y el bestiario actual; el modo no añade
  simulación, solo presentación y HUD. La fase enemiga mantiene el coste actual.
- **Accesibilidad:** navegación completa por teclado, avisos con texto y
  `aria-live`, información que no depende solo del color o la animación y
  `prefers-reduced-motion` para paneos.
- **Compatibilidad:** Chromium de escritorio como objetivo; Firefox y Safari
  recientes como deseables.
- **Seguridad:** sin datos personales, sin red, sin nuevas dependencias.
- **Mantenibilidad:** un único estado de turno activo, presentación separada en el
  host y reutilización de los eventos de `REQ-017`; sin caminos paralelos para
  solitario y hotseat.
- **Ritmo:** avisos acotados y configurables; sin temporizadores. Si la mesa se
  resiente, se propone experimento en vez de alargar los avisos.

# Dependencias

- [REQ-016](REQ-016-pantalla-inicio-configuracion.md) v2: número de jugadores,
  roster, orden y semilla; el hotseat consume su estado.
- [REQ-015](REQ-015-roster-arquetipos.md): arquetipos y personajes.
- [REQ-012](REQ-012-spawn-sala-protegida.md): spawn de grupo y escalado de enemigos
  por jugadores.
- [REQ-018](REQ-018-inventario-equipo.md): inventario, equipo, panel y traspaso
  por suelo.
- [REQ-021](REQ-021-muerte-fantasma-resurreccion.md): fantasma, cadáver y
  resurrección.
- [REQ-022](REQ-022-hud-izquierdo-jugador.md): columna izquierda del activo y
  ficha compacta del objetivo.
- [REQ-023](REQ-023-hud-derecho-detalle-cursor.md): columna derecha y detalle del
  actor en fase enemiga.
- [REQ-024](REQ-024-menu-pausa-guardado.md): pausa global, guardado, carga y
  reinicio.
- [REQ-026](REQ-026-economia-acciones-rebalanceo.md): MP, acciones, fin de turno
  manual y orden de turnos.
- [REQ-017](REQ-017-feedback-visual-eventos.md): beats y feedback; el relevo y los
  avisos se suman a su catálogo.
- [REQ-005](REQ-005-viewport-impar-13.md): viewport y cámara que sigue al activo.
- [ADR-006](../decisions/ADR-006-arte-placeholder-32rogues.md): sprites de la
  pantalla de inicio.
- [ADR-014](../decisions/ADR-014-balance-provisional-fuente-unica.md): balance
  provisional; 3-6 jugadores se valida en playtest.
- [ADR-021](../decisions/ADR-021-inventario-equipo.md): inventario y panel.
- [ADR-024](../decisions/ADR-024-traits-objetos-pipeline.md): traits y stats
  efectivos.
- **Sucesoras:** fase 3 (remoto por QR) y, si se aprueba, entrega directa de
  objetos.

# Enmiendas a documentos vigentes

- [REQ-016](REQ-016-pantalla-inicio-configuracion.md): pasa a v2; esta hoja cierra
  sus preguntas de hotseat, flujo, nombres, semilla y reinicio.
- [REQ-005](REQ-005-viewport-impar-13.md): la cámara sigue al activo con paneo y
  al enemigo que actúa en la fase enemiga.
- [REQ-017](REQ-017-feedback-visual-eventos.md): se añaden los beats de relevo,
  ronda y «El master mueve»; el aviso de ronda no bloquea.
- [REQ-018](REQ-018-inventario-equipo.md): el panel solo se abre en el turno
  activo y es público; el traspaso directo queda fuera también en hotseat.
- [REQ-021](REQ-021-muerte-fantasma-resurreccion.md): el fantasma cierra turno con
  `N` y la resurrección respeta el índice de la ronda.
- [REQ-022](REQ-022-hud-izquierdo-jugador.md): ficha completa del activo y ficha
  compacta del objetivo en fase enemiga.
- [REQ-023](REQ-023-hud-derecho-detalle-cursor.md): en fase enemiga la columna
  derecha muestra al enemigo que actúa.
- [REQ-024](REQ-024-menu-pausa-guardado.md): pausa global, reinicio en el menú,
  guardado solo en fase de personajes y carga en el turno activo.
- [REQ-026](REQ-026-economia-acciones-rebalanceo.md): `N` sustituye a `E`, el
  turno es por jugador y la ronda cierra con una fase enemiga.
- [Economía de turno](../design/turn-economy.md): tabla de controles, orden de
  turnos, recursos por jugador y avisos.
- **ADR-025:** registra el modelo de jugador activo, relevo, ronda y cámara.

# Fuera de alcance

- Remoto por QR, servidor, salas, reconexión y móviles (fase 3).
- Entrada y salida de jugadores a mitad de partida.
- Entrega directa de objetos entre jugadores.
- Temporizadores de turno, de ronda o de fantasma.
- Información privada, pantallas por jugador o niebla de guerra.
- Remapeo de controles, mandos, perfiles y teclas por jugador.
- Pantalla partida, cámara libre o minimapa.
- Guardado entre runs, progresión, desbloqueos y metaprogresión.
- Audio, música y arte final del relevo, avisos o resultado.
- Anti-cheat, espectadores, repeticiones y deshacer.

# Preguntas abiertas

1. **Balance con 3-6 jugadores.** El escalado de enemigos de `REQ-012` y la
   duración de sesión se validan en playtest; si falla, se ajusta el bestiario o
   el spawn, no el modo.
2. **Fricción del ritmo.** Medir los avisos y el turno del fantasma en mesa; si
   pesan, proponer experimento con duraciones o salto del fantasma.
3. **Sprites de la pantalla de inicio.** Qué sprite de `rogues.png` corresponde a
   cada arquetipo y variante; es dato de implementación con `ADR-006`.
4. **Duraciones.** 2 s de «Ronda N», 800 ms de «El master mueve» y ~300 ms de
   paneo son valores iniciales configurables; se ajustan en playtest.
5. **Semilla.** Rango y normalización del campo de `REQ-016`; se reutiliza la
   lógica del host y se documenta al implementar.
6. **Pantalla de resultado.** Texto y presentación exactos; las dos acciones ya
   están decididas.
7. **Calendario.** El orden de implementación con `REQ-018`/`REQ-019`/`REQ-020` y
   `REQ-021` se decide al abrir tareas.

# Decisiones

| Fecha | Decisión | Quién | Estado |
|---|---|---|---|
| 2026-11-13 | Hotseat local de 1-6 jugadores, mismo teclado y pantalla; roster y orden fijos, sin entradas ni salidas. | human:simon | aceptada |
| 2026-11-13 | Turno por jugador en orden de índice y una fase enemiga por ronda. | human:simon | aceptada |
| 2026-11-13 | `N` (Next) cierra el turno en cualquier momento; sin auto-fin. | human:simon | aceptada |
| 2026-11-13 | Sin aviso ni Enter entre jugadores: la cámara hace paneo al siguiente. | human:simon | aceptada |
| 2026-11-13 | El paneo bloquea comandos hasta que la cámara llega; después se liberan. | human:simon | aceptada |
| 2026-11-13 | «Ronda N» superior, transitorio y no bloqueante; 2 s configurables. | human:simon | aceptada |
| 2026-11-13 | «El master mueve» animado y breve solo si al menos un enemigo actúa; si no, se omite. | human:simon | aceptada |
| 2026-11-13 | Solo los enemigos que mueven o atacan reciben cámara y HUD; los dormidos esperan sin presentación. | human:simon | aceptada |
| 2026-11-13 | HUD derecho con el enemigo activo; izquierdo con ficha compacta del objetivo o «Sin objetivo». | human:simon | aceptada |
| 2026-11-13 | Panel de inventario solo en el turno activo y público; el fantasma no lo abre. | human:simon | aceptada |
| 2026-11-13 | Sin entrega directa: soltar y recoger. | human:simon | aceptada |
| 2026-11-13 | Fantasma con turno normal y opción de pasar con `N`; sin temporizador. | human:simon | aceptada |
| 2026-11-13 | Resurrección: misma ronda si el índice no ha pasado; si no, siguiente. | human:simon | aceptada |
| 2026-11-13 | Muerte en el propio turno: se resuelve la acción y se pasa; wipe termina la partida. | human:simon | aceptada |
| 2026-11-13 | Pausa global para cualquier jugador con `Esc`; guardar solo en fase de personajes; cargar en el activo. | human:simon | aceptada |
| 2026-11-13 | Reiniciar en el menú de pausa con «Nueva» y «Reiniciar»; Reiniciar conserva party y semilla. | human:simon | aceptada |
| 2026-11-13 | Resultado con «Reiniciar» y «Nueva», sin reinicio automático. | human:simon | aceptada |
| 2026-11-13 | Un jugador usa la misma ruta, sin paneo de relevo. | human:simon | aceptada |
| 2026-11-13 | `N` sustituye a `E`; `R` desaparece. | human:simon | aceptada |
| 2026-11-13 | REQ-016 se cierra en v2 en el mismo milestone. | human:simon | aceptada |

# Aceptación de la hoja

- [x] El usuario ha aprobado el flujo de turnos y relevo.
- [x] El usuario ha aprobado la cámara, el aviso de ronda y su no bloqueo.
- [x] El usuario ha aprobado la fase enemiga, «El master mueve» y el HUD contextual.
- [x] El usuario ha aprobado el panel público, el traspaso por suelo y el fantasma.
- [x] El usuario ha aprobado la pausa global, el guardado y el reinicio.
- [x] El usuario ha aprobado `N` como fin de turno y la retirada de `E` y `R`.
- [x] Los requisitos son verificables.
- [x] Las dependencias están claras.
- [x] Se puede generar un grafo de tareas.
- [x] El usuario ha revisado el texto de la v1 y la hoja queda `stable`.
