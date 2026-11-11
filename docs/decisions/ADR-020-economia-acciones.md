---
type: ADR
title: "ADR-020: economía de acciones por turno"
description: 2 acciones por defecto (Pícaro 3), enemigos 2/1/2, tope 4 provisional, atacar/interactuar/hechizo cuestan acción, moverse/recoger/soltar no, fin de turno manual y AI encadenada.
status: stable
decision_status: accepted
decided_by: [human:simon]
decided_at: 2026-11-11T16:00:00Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T16:00:00Z }
---

# Contexto

El prototipo tiene **una acción por turno** además de los MP de movimiento. La
visión pide que las acciones sean un atributo y [REQ-026](../requirements/REQ-026-economia-acciones-rebalanceo.md)
decide varias acciones por turno, ataques repetibles, interacción con coste de
acción y rebalanceo inmediato. Este ADR registra la economía completa; los
valores concretos viven en los catálogos y son provisionales.

# Decisión

- **2 acciones por defecto**; el **Pícaro empieza con 3**. Los enemigos tienen
  **Centinela 2, Bruto 1 y Cobarde 2**. Los valores son provisionales v1.
- **Tope de 4 acciones** por turno, provisional hasta el rebalanceo. El `+1` de
  los objetos vive en `actionsBonus` del equipo; `REQ-019` puede exponerlo como
  trait después.
- **Atacar, interactuar y lanzar hechizos cuestan 1 acción**; atacar se puede
  repetir. **Moverse, recoger o soltar del suelo, esperar y cerrar el turno no
  cuestan acción**.
- **Recoger o soltar del suelo cuesta 1 MP**; soltar un objeto equipado lo
  desequipa en la misma operación.
- **Abrir o registrar un contenedor cuesta 1 acción** y exige adyacencia; con el
  contenedor abierto, transferir objetos es gratis y se permite «coger todo».
- **`Moverse` sobre un enemigo ejecuta un ataque por pulsación**: se acerca con MP
  y ataca una vez con 1 acción; no encadena todos los ataques. `F` sigue siendo
  ataque directo.
- **El turno no auto-termina**: se cierra con `E`. El HUD sugiere terminar cuando
  no quedan acciones ni MP útil; el jugador conserva el control para moverse
  después de la última acción.
- **La IA encadena acciones**: en alerta se mueve con MP y ataca hasta agotar
  acciones o matar; dormido/regresando no ataca; huyendo usa MP y solo ataca si
  está acorralado. Huir y perseguir no consumen acción.
- **Presentación secuencial**: un beat por acción, sin agrupar por defecto; el
  turno completo se mide con `REQ-017`.
- **Rebalanceo**: Pícaro 3 y la tabla enemiga 2/1/2 son valores iniciales; el
  método de win % de `EXP-003`/`REQ-015` los ajusta con acciones, magia y réplica.

# Consecuencias

- Las acciones pasan a ser el principal eje de poder; `+1` acción es un salto
  grande y el tope de 4 evita acumulaciones.
- El Pícaro gana identidad de rápido; tres ataques de daga son el primer candidato
  a ajuste del rebalanceo.
- La fase enemiga puede alargarse, sobre todo con Centinela y Cobarde a 2
  acciones; el ritmo se mide y, si supera el umbral, se propone experimento.
- Recoger y soltar del suelo son baratos para no romper el bucle de arma en el
  suelo; abrir contenedores compite con atacar.
- El contador de acciones debe verse en el HUD, el snapshot y el guardado.
- La réplica de `REQ-027` es gratuita e independiente del contador; con varias
  acciones puede dispararse varias veces por turno y entra en el balance.
- El tope de 2 hechizos de `REQ-025` solo muerde con 3-4 acciones; sigue
  provisional.

# Alternativas descartadas

- **Una acción por turno**: no permite repetir ataques ni usar un objeto después
  de atacar; era el punto de partida, no la decisión.
- **Todos los arquetipos y enemigos con 2**: no expresa los roles de rápido,
  estándar y lento; el Pícaro y el Bruto pierden identidad.
- **Auto-terminar al gastar la última acción**: corta el movimiento posterior y
  contradice que moverse no cuesta acción.
- **Modelar el +1 solo como trait de `REQ-019`**: bloquea `REQ-026` en una hoja
  abierta; el campo de equipo permite cerrar y los traits lo reutilizan después.
- **Cobrar acción por recoger o soltar**: encarece el bucle de arma en el suelo y
  obliga a elegir entre coger y atacar; 1 MP mantiene el flujo.
- **Agrupar todas las acciones en un solo beat**: acorta el turno, pero pierde la
  lectura de cada ataque o hechizo.

Ver [REQ-026](../requirements/REQ-026-economia-acciones-rebalanceo.md),
[REQ-009](../requirements/REQ-009-percepcion-alarma-huida.md),
[REQ-015](../requirements/REQ-015-roster-arquetipos.md),
[REQ-004](../requirements/REQ-004-cursor-seleccion.md),
[REQ-017](../requirements/REQ-017-feedback-visual-eventos.md),
[REQ-025](../requirements/REQ-025-magia-hechizos-mana.md) y
[REQ-027](../requirements/REQ-027-replica-combate-cuerpo-a-cuerpo.md).
