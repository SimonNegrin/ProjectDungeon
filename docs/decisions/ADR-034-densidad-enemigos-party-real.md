---
type: ADR
title: "ADR-034: densidad de enemigos por tamaño real de la party"
description: El generador denso recibe el tamaño de la party inicial como P, con suelo de una ficha por sala no-spawn; el 6 queda como valor de librería y del experimento.
status: stable
decision_status: accepted
decided_by: [human:simon, deepseek/v4.1-flash]
decided_at: 2026-11-16T19:50:04Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T19:50:04Z }
---

# Contexto

`REQ-012` v4 fijó `T = ceil(0,02 × N) + ceil(1,2 × P)` para el generador
denso, con `P` de 1 a 6 y 6 como valor por defecto. El contrato existía, pero
ningún camino de producción pasaba el tamaño de la party al generador: el host
creaba la sesión con semilla y party, y `createInitialState` generaba el mapa sin
opciones. El generador caía en `DEFAULT_PLAYERS = 6`, así que una partida de 1
jugador recibía 10-12 enemigos y el experimento no reflejaba lo que jugaba el
usuario.

# Decisión

- `createInitialState` deriva `numPlayers` de `players.length` y lo pasa a la
  generación. Es el único punto de cableado; el host no envía opciones de mapa.
- `6` deja de ser el valor de producción: queda como valor por defecto de la
  librería y de `EXP-004`, para llamadas que no declaran party.
- `T` tiene suelo en el número de salas no-spawn: `T = max(T, R)`. Si el suelo
  eleva el total se emite un aviso con el `T` de la fórmula, `R` y el total
  aplicado. Regla aprobada en `REQ-012` v5.
- El reparto y la composición 60/20/20 no cambian; el suelo actúa antes de
  repartir, no cambia el mínimo por sala.
- Una partida cargada conserva su mapa y su reparto: no se regenera nada.
- BSP sigue con 4 enemigos y fuera de la fórmula.

# Consecuencias

- La densidad responde al grupo real: 1 jugador en 22×18 pasa de 10-12 a 4-6
  enemigos; 6 jugadores mantiene 10-12.
- Las expectativas que fijaban `P = 6` en producción y los casos de factor 0 de
  `EXP-004` se adaptan a la hoja; el resto de tests de `REQ-012` no se debilita.
- El snapshot deja de declarar 6 jugadores cuando la party es de otro tamaño.
- Menos enemigos con party pequeña reduce las tiradas de botín de `REQ-034`;
  queda como pregunta de playtest, sin tocar `REQ-020`.
- Partidas guardadas antes del cambio no se recalculan.

# Alternativas descartadas

- **Pasar `numPlayers` desde el host**: dos fuentes de verdad y riesgo de que el
  arranque vuelva a divergir del tamaño de la party.
- **Exponer el tamaño de party como opción de dificultad**: fuera de alcance;
  el usuario configuró el grupo, no la densidad.
- **Mantener 6 fijo**: la fórmula quedaría como código muerto parcial y el
  jugador en solitario seguiría recibiendo población para seis.
