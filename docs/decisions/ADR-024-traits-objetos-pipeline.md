---
type: ADR
title: "ADR-024: traits de objetos y pipeline de efectos"
description: Catálogo de traits como dato, stacking determinista, agregación única de stats, pipeline de disparadores, ataque circular y robo de vida.
status: stable
decision_status: accepted
decided_by: [human:simon]
decided_at: 2026-11-12T12:00:00Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T17:00:00Z }
---

# Contexto

El equipo de [REQ-010](../requirements/REQ-010-combate-equipo-acierto-defensa.md)
solo aporta números. [REQ-014](../requirements/REQ-014-atributos-inherentes-personajes.md)
fijó nueve atributos, [REQ-018](../requirements/REQ-018-inventario-equipo.md)
reservó los huecos, el campo de traits del objeto y la agregación de stats, y
[REQ-026](../requirements/REQ-026-economia-acciones-rebalanceo.md) dejó
`actionsBonus` listo para exponerse. Faltaba definir **qué hacen** los traits.

[REQ-019](../requirements/REQ-019-traits-objetos.md) v2, aprobada y estable, fija
el primer corte: modificadores de los nueve atributos y dos especiales —robo de
vida y ataque circular— con cuerpo etéreo aplazado. Este ADR registra esas
decisiones técnicas sin añadir reglas ni ampliar alcance.

> **Nota de cita.** `REQ-019` T-011 y su sección de enmiendas citan «ADR-022»
> como el ADR de traits; [ADR-022](ADR-022-replica-cuerpo-a-cuerpo.md) es la
> réplica cuerpo a cuerpo y ese ADR de traits nunca se registró. Este documento
> lo cubre y la cita pasa a ADR-024.

# Decisión

- **Catálogo como dato.** Cada trait declara ID estable, nombre, descripción,
  tipo —modificador, disparado o continuo—, parámetros, clave de stacking y
  fuente. Los parámetros son explícitos: en el área, radio, `incluyeCentro` y
  coste de acción; en el robo, porcentaje, redondeo y mínimo. Cambiar el catálogo
  cambia el juego sin tocar el motor; no hay traits definidos en el host.
- **Fuentes.** El modelo admite traits inherentes, de equipo y temporales. Este
  corte solo usa objetos equipados: el trait está activo mientras el objeto ocupa
  su hueco y desaparece al desequiparlo; un objeto en la mochila no aporta nada.
- **Stacking determinista.** Los modificadores numéricos suman por stat. Los
  especiales son únicos: si llegan por varias fuentes, cuenta el mayor. El orden
  es inherente → equipo por hueco → traits. Suelos: PV máx ≥ 1, acciones ≥ 1 y
  MP ≥ 0; tope de 4 acciones. Dos fuentes del mismo trait dan siempre el mismo
  resultado, sin depender del orden de iteración del host.
- **Agregación única.** Los stats efectivos se calculan en un único punto:
  inherente + equipo + traits. Combate, movimiento y UI leen el mismo valor. El
  MP máximo se recalcula por turno y no se acumula entre turnos; quitar el collar
  devuelve el MP a su valor base.
- **Pipeline de disparadores.** El motor emite equipar/desequipar, impacto, daño
  infligido, muerte, movimiento e inicio/fin de turno sin DOM. Cada trait declara
  los suyos y los no usados no se emiten si nadie los declara. Este corte usa
  equipar/desequipar, impacto y daño infligido.
- **Ataque circular como dato.** El arma golpea las 8 casillas adyacentes
  —Chebyshev 1, diagonales incluidas—, excluye su propia casilla y solo daña a
  hostiles. El área es un parámetro (radio 1, `incluyeCentro: false`), igual que
  el coste (1 acción). Resuelve una tirada de impacto y daño por objetivo en
  orden fijo de casilla, dentro del resultado de combate, y ocurre en cada ataque
  normal del arma. Bombas y hechizos futuros reutilizan la misma regla con
  `incluyeCentro: true` y 9 casillas; su centro es la casilla de impacto, no la
  del lanzador.
- **Robo de vida.** Cura el 50 % del daño efectivo de cada impacto, redondeado
  hacia abajo, con mínimo 1 si el golpe entra y sin sobrecurar. En ataque circular
  cura por cada objetivo golpeado, con evento de feedback propio.
- **Visibilidad y alcance del corte.** Los traits se leen siempre antes de
  equipar, con nombre, descripción y efecto; no hay identificación ni traits
  ocultos. Ningún enemigo lleva traits. Cuerpo etéreo queda fuera: no hay
  semántica ni traits que alteren movimiento, colisión, ocupación, línea de
  visión o generación de mapa. El contenido del corte son anillo de robo de vida,
  collar de +2 MP, guantes de +1 acción y maza a dos manos circular; llegan por
  los cofres y el saqueo de
  [REQ-020](../requirements/REQ-020-cofres-saqueo.md) y ningún arquetipo empieza
  con ellos.

# Consecuencias

- [REQ-018](../requirements/REQ-018-inventario-equipo.md) sigue siendo la base:
  huecos, localización única, panel y regla de dos manos; los traits se muestran
  en el panel de [ADR-021](ADR-021-inventario-equipo.md) con desglose de stats.
- [REQ-026](../requirements/REQ-026-economia-acciones-rebalanceo.md) mantiene el
  tope de 4 acciones; `actionsBonus` se expone como modificador sin un camino
  paralelo.
- [REQ-017](../requirements/REQ-017-feedback-visual-eventos.md): cada objetivo
  del círculo y cada curación son un beat propio.
- [REQ-020](../requirements/REQ-020-cofres-saqueo.md) es la única vía de entrada
  de las cuatro piezas; el equipo inicial de `REQ-015` no cambia.
- El balance de la maza, el +2 MP y el 50 % de robo es provisional
  ([ADR-014](ADR-014-balance-provisional-fuente-unica.md)): se ajusta en el
  catálogo y se valida con `EXP-003`.
- Un trait nuevo o un ajuste de parámetros es un cambio de datos; el motor no
  gana excepciones por arma. El snapshot expone traits activos, fuente, stats
  efectivos y eventos para reproducir y explicar cada modificación.

# Alternativas descartadas

- **Traits como código**: cada trait sería una rama del motor; impide ajustar
  contenido desde el catálogo y multiplica los casos especiales.
- **Stacking por máximo para modificadores**: dos piezas del mismo modificador
  no sumarían y la sinergia que buscan las cuatro piezas desaparece.
- **Casos especiales por arma**: el ataque circular y el robo quedarían ligados a
  la maza y al anillo; los especiales futuros repetirían la lógica.
- **Traits ocultos**: contradicen el objetivo de leer el objeto antes de equipar
  y convierten el equipo en una sorpresa.
- **Migrar números de arma y armadura a traits**: mezcla dos capas y obliga a
  recalcular el balance existente de
  [ADR-012](ADR-012-combate-equipo-rng.md) sin necesidad.
