---
type: Requirement Sheet
id: REQ-019
title: Traits de objetos equipados
description: "Primer corte de traits: modificadores de los nueve atributos, stacking con suma, únicos y suelos, robo de vida y ataque circular de 3×3 sin daño amigo, con cuatro piezas de catálogo. Cuerpo etéreo queda como especial futuro."
status: stable
version: 3
decision_owner: human:simon
review_required: true
created_at: 2026-11-10T20:00:00Z
updated_at: 2026-11-13T21:29:30Z
related_tasks: []
generated: { by: deepseek/v4.1-flash, at: 2026-11-12T12:00:00Z }
verified:
---

# Contexto

El equipo de [REQ-010](REQ-010-combate-equipo-acierto-defensa.md) solo aporta
números: acierto, daño, escudo y armadura. [REQ-014](REQ-014-atributos-inherentes-personajes.md)
fijó nueve atributos, [REQ-018](REQ-018-inventario-equipo.md) reservó los huecos,
el campo de traits del objeto y los cinco huecos secundarios, y
[REQ-026](REQ-026-economia-acciones-rebalanceo.md) dejó `actionsBonus` listo para
exponerse como trait. Falta definir **qué hacen** esos traits.

El sistema tiene dos familias:

- **Modificadores de stats:** incremento o decremento de los nueve atributos,
  incluidas las acciones por turno (con el tope de `REQ-026`).
- **Efectos especiales:** robo de vida y ataque circular en este corte. Cuerpo
  etéreo queda documentado como especial futuro, sin semántica cerrada.

La **v2 cierra el primer corte** tras la sesión de decisiones: fuente de los
traits, relación con los números existentes, stacking, traits negativos, los dos
especiales, su semántica, el contenido inicial y el reparto. La hoja queda
**stable**; las tareas se generan en una sesión aparte.

# Objetivos de experiencia

- Que un objeto se sienta especial por lo que hace, no solo por sus números.
- Que los traits se entiendan y se lean antes de equipar, sin identificarlos.
- Que los especiales abran tácticas nuevas sin convertir el juego en excepciones.
- Que el jugador note la sinergia de combinar traits, por ejemplo robo de vida
  con ataque circular.
- Que el balance sea medible y reproducible por semilla.

# Requisitos creativos (decididos)

| ID | Requisito | Aceptación |
|---|---|---|
| R-001 | Un objeto equipado puede aportar uno o varios traits a su portador. | El objeto declara traits; al equiparlo, el portador los recibe; al desequiparlo, desaparecen. Un objeto en la mochila no aporta traits. |
| R-002 | Un trait puede incrementar o decrementar cualquiera de los nueve atributos del portador. Los números de arma y armadura siguen siendo campos del objeto: no se migran a traits. | Aplicar y quitar el objeto cambia los stats efectivos en la cantidad indicada; el +2 MP eleva el MP máximo de cada turno sin acumularse entre turnos. |
| R-003 | El primer corte implementa **dos** especiales: robo de vida y ataque circular. Cuerpo etéreo queda documentado como especial futuro. | Los dos especiales tienen definición, disparador y efecto; cuerpo etéreo no aparece en el catálogo ni genera tareas. |
| R-004 | Los traits se muestran siempre, con nombre, descripción y efecto, antes de equipar. No hay identificación ni traits ocultos. | El panel de inventario y la ficha de personaje permiten leer cada trait sin equipar; ningún trait se revela al equipar. |
| R-005 | Los traits especiales producen feedback visual y de texto, con un evento por objetivo afectado. | Cada impacto del ataque circular y cada curación del robo de vida generan un evento legible; no depende solo de color o animación. |
| R-006 | El jugador puede entender por qué un stat tiene el valor que tiene. | La ficha desglosa inherente, equipo y traits; no muestra solo el total. |
| R-007 | El catálogo de este corte añade cuatro piezas: anillo de robo de vida, collar de +2 MP, guantes de +1 acción y maza a dos manos con ataque circular. Casco y botas siguen vacíos. | Las cuatro existen como datos con su sprite; ningún arquetipo empieza con ellas. |
| R-008 | Stacking determinista: los modificadores numéricos **suman** por stat; los especiales son **únicos** y cuenta el mayor; el orden es inherente → equipo por hueco → traits; los suelos son PV máx ≥ 1, acciones ≥ 1 y MP ≥ 0; las acciones tienen tope 4. | Dos fuentes del mismo modificador suman; dos fuentes del mismo especial no se duplican; ningún recorte depende del orden de iteración. |
| R-009 | Los traits negativos o malditos están permitidos, se leen antes de equipar y respetan los suelos. | Un objeto con −1 defensa baja el stat pero no puede dejar acciones en 0 ni PV máx en 0. |
| R-010 | **Ataque circular:** el arma golpea las 8 casillas adyacentes al atacante (Chebyshev 1, diagonales incluidas), excluye su propia casilla y solo daña a hostiles. Cuesta 1 acción, resuelve una tirada de impacto y daño por objetivo y ocurre en cada ataque normal del arma. | Un ataque contra un enemigo adyacente golpea también a los demás hostiles del anillo; los aliados, el atacante y las casillas vacías no reciben daño; el coste es un parámetro, no una constante. |
| R-011 | La regla de área es dato reutilizable: radio 1 e `incluyeCentro: false` para el ataque circular. Bombas y hechizos explosivos futuros usarán el mismo trait con `incluyeCentro: true` y 9 casillas. | Cambiar el trait de área cambia el comportamiento sin tocar el motor; el centro de una bomba es la casilla de impacto, no la del lanzador. |
| R-012 | **Robo de vida:** cura el 50 % del daño efectivo de cada impacto, redondeado hacia abajo, con mínimo 1 si el golpe entra, sin sobrecurar. En ataque circular cura por cada objetivo golpeado. | Golpes de 1 curan 1; golpes de 3 curan 1; nunca se supera el PV máximo; un ataque circular a tres enemigos puede curar tres veces. |
| R-013 | La maza es a dos manos: bloquea el escudo según [REQ-018](REQ-018-inventario-equipo.md) y tiene daño base inferior al hacha. El valor exacto vive en el catálogo. | Con la maza no se puede llevar escudo; el daño base es inferior a 5; el valor se ajusta con `ADR-014` sin tocar el motor. |
| R-014 | Las cuatro piezas llegan por cofres y saqueo de [REQ-020](REQ-020-cofres-saqueo.md); el equipo inicial de `REQ-015` no cambia. | Ningún arquetipo empieza con anillo, collar, guantes ni maza; aparecen en el botín. |
| R-015 | Ningún enemigo lleva traits en este corte. | El bestiario no declara traits; el modelo los admite para un corte posterior. |

# Requisitos técnicos

| ID | Requisito | Aceptación |
|---|---|---|
| T-001 | El catálogo de traits es dato, no código: ID estable, nombre, descripción, tipo (modificador, disparado o continuo), parámetros, clave de stacking y fuente. Los parámetros del área (radio, `incluyeCentro`, coste de acción) y del robo (porcentaje, redondeo, mínimo) son explícitos. | Cambiar un trait del catálogo cambia el juego sin tocar el motor; los IDs son estables; no hay traits definidos en el host. |
| T-002 | El modelo admite traits de varias fuentes: inherente, equipo y temporal. El primer corte solo los usa en objetos equipados. | La fuente forma parte del dato; el contenido inicial no necesita traits inherentes ni temporales. |
| T-003 | El stacking es explícito y determinista: suma para modificadores, único para especiales, orden de aplicación estable y topes y suelos definidos. | Dos fuentes del mismo trait producen un resultado predecible y testeable; el orden no depende del orden de iteración del host. |
| T-004 | Hay un pipeline de disparadores: equipar/desequipar, impacto, daño infligido, muerte, movimiento e inicio/fin de turno. Cada trait declara los suyos y el motor los emite sin DOM. Este corte usa equipar/desequipar, impacto y daño infligido. | Los disparadores no usados no se emiten si ningún trait los declara; la secuencia es la misma con la misma semilla. |
| T-005 | Los stats efectivos incluyen los traits y se calculan en un único punto, junto al equipo de `REQ-018`: inherente + equipo + traits. El MP máximo se recalcula por turno y no se acumula entre turnos. | Combate, movimiento y UI leen el mismo valor; no hay sumas paralelas; quitar el collar devuelve el MP a su valor base. |
| T-006 | El ataque circular se integra como ataque con objetivos múltiples: selección por enemigo adyacente, resolución por objetivo en orden fijo de casilla, sin daño a no hostiles, con el coste de acción del trait y dentro del resultado de combate existente. | El resultado enumera los objetivos y sus tiradas; el orden es determinista; el feedback muestra cada impacto; el ataque normal del arma no tiene un camino alternativo. |
| T-007 | El robo de vida se integra en el resultado de combate: el daño efectivo de cada objetivo genera una curación acotada, con mínimo, sin sobrecurar y con evento de feedback. | La curación no supera los PV máximos, no es negativa y queda en el resultado del ataque por objetivo. |
| T-008 | Este corte no implementa cuerpo etéreo ni traits que alteren movimiento, colisión, ocupación, línea de visión o generación de mapa. | `src/game/` no contiene lógica de atravesar muros; ningún trait del catálogo modifica esas capas. |
| T-009 | Serialización y debug: el snapshot expone traits activos, fuente, stats efectivos y eventos de trait. | Se puede reproducir una partida y explicar cada modificación desde el snapshot. |
| T-010 | Tests nuevos: stacking, topes y suelos, orden de disparadores, ataque circular (8 casillas, diagonales, sin centro, sin aliados, orden determinista, una tirada por objetivo), robo de vida (porcentaje, mínimo, sin sobrecurar, por objetivo), sinergia área + robo, traits negativos, serialización y no regresión de `REQ-006`, `REQ-009`, `REQ-010` y `REQ-017`. | `pnpm run verify` pasa; los tests existentes conservan su intención. |
| T-011 | Se actualizan glosario, [economía de turno](../design/turn-economy.md) y arquitectura; se registra un ADR de traits y pipeline de efectos (ADR-024). | `pnpm run docs:check` pasa; el ADR existe y está enlazado; no queda "ataque de área" como nombre vigente. |
| T-012 | La UI del panel de `REQ-018` muestra los traits de cada objeto y los traits activos del portador, con descripción y desglose de stats. | El panel permite leer el trait antes de equipar y explicar el total; el HUD o `F1` expone los traits activos. |
| T-013 | La maza reutiliza las reglas de dos manos de `REQ-018`; no hay una validación paralela. La cobertura E2E de dos manos con escudo, diferida desde `REQ-018` v5, entra con esta tarea. | Arma a dos manos y escudo no coexisten; el rechazo no deja cambios parciales; hay E2E con la maza equipada y escudo puesto. |
| T-014 | Sin dependencias nuevas, sin red y sin arte final; el motor sigue sin DOM. | `package.json` y `pnpm-lock.yaml` no cambian; `src/game/` no importa `src/host/`. |

# Requisitos no funcionales

- **Rendimiento:** un ataque circular resuelve hasta 8 objetivos con una tirada
  cada uno; el coste debe medirse y mantenerse dentro del objetivo de 60 fps.
- **Ritmo:** cada impacto es un beat de `REQ-017`; si un turno con círculo
  completo supera el techo declarado, se propone experimento en vez de agrupar
  impactos por defecto.
- **Accesibilidad:** los traits se explican con texto; el feedback no depende
  solo de iconos, colores o animaciones; la previsualización del círculo se
  anuncia en texto.
- **Compatibilidad:** Chromium de escritorio como objetivo; Firefox y Safari
  recientes como deseables.
- **Seguridad:** sin datos personales, sin red y sin nuevas dependencias.
- **Mantenibilidad:** catálogo de traits, pipeline único de disparadores y un
  punto de agregación de stats; los especiales no se implementan como casos
  especiales dispersos por el motor.
- **Balance:** la maza, el +2 MP y el 50 % de robo son valores provisionales de
  `ADR-014`; se validan con el método de win % de `EXP-003`. El +1 acción es un
  salto de poder y cuenta con el tope de `REQ-026`.

# Enmiendas y notas de vigencia

- **REQ-019 v1:** su R-003 pedía tres especiales; esta v2 implementa dos y deja
  cuerpo etéreo documentado como futuro.
- **REQ-018 R-004:** decía que los cinco huecos secundarios llegan con `REQ-019`.
  Este corte entrega anillo, collar y guantes; casco y botas siguen vacíos.
- **REQ-018 T-001:** el campo de traits del objeto pasa a estar en uso; los
  modificadores numéricos de arma y armadura no se migran.
- **REQ-026 T-003:** `actionsBonus` se expone como trait de modificador; el tope
  de 4 acciones se mantiene.
- **REQ-020:** es la vía de entrada de las cuatro piezas.
- **REQ-017:** cada objetivo del ataque circular es un beat propio.
- **ADR-024:** se registra el catálogo de traits, el stacking y el pipeline de
  efectos.
- **Cita corregida (2026-11-13):** el ADR de traits es `ADR-024`; la v2 lo citaba
  como ADR-022, que es la réplica cuerpo a cuerpo. No cambia ninguna regla.

# Dependencias

- [REQ-018](REQ-018-inventario-equipo.md): huecos de equipo, campo de traits,
  agregación de stats y regla de dos manos; esta hoja las consume.
- [REQ-014](REQ-014-atributos-inherentes-personajes.md): nueve atributos y capa de
  absorción sobre la que actúan los modificadores.
- [REQ-010](REQ-010-combate-equipo-acierto-defensa.md): resolvedor de combate,
  armas y equipo; el ataque circular y el robo de vida lo extienden.
- [REQ-026](REQ-026-economia-acciones-rebalanceo.md): tope de 4 acciones y
  `actionsBonus`; el coste del ataque circular es 1 acción.
- [REQ-020](REQ-020-cofres-saqueo.md): entrada de las cuatro piezas al juego.
- [REQ-017](REQ-017-feedback-visual-eventos.md): feedback de eventos; el círculo
  y el robo necesitan beats.
- [REQ-009](REQ-009-percepcion-alarma-huida.md) y
  [REQ-006](REQ-006-movimiento-animado.md): no cambian en este corte porque
  cuerpo etéreo queda fuera; se conservan como no regresión.
- [ADR-012](../decisions/ADR-012-combate-equipo-rng.md): combate con equipo y RNG
  sembrado.
- [ADR-014](../decisions/ADR-014-balance-provisional-fuente-unica.md): valores
  provisionales en catálogos.
- [ADR-015](../decisions/ADR-015-atributos-inherentes-absorcion.md): esquema de
  atributos.
- [ADR-021](../decisions/ADR-021-inventario-equipo.md): inventario, huecos y panel.
- [ADR-024](../decisions/ADR-024-traits-objetos-pipeline.md): catálogo de traits,
  stacking y pipeline de efectos.
- **Secuencia:** definir después de `REQ-018` y antes de `REQ-020`; aplicar después
  de `REQ-020`.

# Fuera de alcance

- Cuerpo etéreo y cualquier trait que altere movimiento, colisión, ocupación,
  línea de visión o generación de mapa.
- Bombas, hechizos explosivos y magia: la regla de área se comparte, pero su
  contenido y su implementación no entran.
- El catálogo completo de traits y el contenido de cada objeto.
- Traits en enemigos o en personajes inherentes.
- Crafting, reroll de traits, mejora de objetos y desbloqueos.
- Identificación de objetos, traits ocultos y sorpresas al equipar.
- Hotseat, red, persistencia y guardado.
- Arte final.

# Preguntas abiertas

1. **Calendario.** Se propuso implementar después de cerrar hotseat, que aún no
   tiene hoja ni tareas. Confirmar el orden cuando exista.
2. **Valores provisionales.** La maza, el +2 MP y el 50 % de robo se ajustan en
   `EXP-003` y en playtest; no bloquean el corte.
3. **Cuerpo etéreo.** Semántica futura: dónde termina el turno, visión, ataque a
   través, desequipar dentro de un muro y coste en MP.
4. **Casco y botas.** Cuándo entran sus traits; hoy los huecos existen vacíos.

# Decisiones

| Fecha | Decisión | Quién | Estado |
|---|---|---|---|
| 2026-11-10 | Los traits los aportan los objetos equipados y pueden incrementar o decrementar stats. | human:simon | aceptada |
| 2026-11-10 | Hoja separada de inventario y de cofres; no define huecos ni contenedores. | human:simon | aceptada |
| 2026-11-10 | Definir después de `REQ-018` y antes de `REQ-020`; aplicar después de `REQ-020`. | human:simon | aceptada |
| 2026-11-12 | Primer corte: modificadores de stats, stacking y dos especiales. Cuerpo etéreo queda documentado como futuro, sin semántica ni tareas. | human:simon | aceptada |
| 2026-11-12 | Fuente de traits: piezas secundarias nuevas **y** un arma con trait; no se reutilizan armas existentes. | human:simon | aceptada |
| 2026-11-12 | Los números de arma y armadura siguen siendo campos del objeto; los traits añaden modificadores encima. | human:simon | aceptada |
| 2026-11-12 | Stacking: suma numérica, especiales únicos, orden fijo, PV ≥ 1, acciones ≥ 1, MP ≥ 0 y tope de 4 acciones. | human:simon | aceptada |
| 2026-11-12 | Traits negativos permitidos, visibles antes de equipar y sujetos a los suelos. | human:simon | aceptada |
| 2026-11-12 | Especiales del corte: robo de vida y ataque circular. | human:simon | aceptada |
| 2026-11-12 | Ataque circular: 8 casillas adyacentes sin centro, solo hostiles, sin daño amigo, 1 acción (parámetro), una tirada por objetivo y en cada ataque normal. | human:simon | aceptada |
| 2026-11-12 | La regla de área es dato reutilizable; bombas y hechizos futuros usarán 3×3 con centro incluido. | human:simon | aceptada |
| 2026-11-12 | Precio del arma circular: dos manos y daño base bajo. | human:simon | aceptada |
| 2026-11-12 | Robo de vida: 50 % del daño efectivo por impacto, redondeo a la baja, mínimo 1 si el golpe entra, sin sobrecurar y por cada objetivo del círculo. | human:simon | aceptada |
| 2026-11-12 | Set inicial de cuatro piezas: anillo de robo, collar +2 MP, guantes +1 acción y maza a dos manos circular. | human:simon | aceptada |
| 2026-11-12 | Sin enemigos con traits en este corte. | human:simon | aceptada |
| 2026-11-12 | Las piezas llegan solo por cofres y saqueo; el equipo inicial no cambia. | human:simon | aceptada |
| 2026-11-12 | Traits siempre visibles; sin identificación. | human:simon | aceptada |
| 2026-11-13 | v3: recibe el E2E de dos manos con escudo diferido desde `REQ-018` v5; sin cambios de reglas. | human:simon | aceptada |
| 2026-11-10 | Implementación después de cerrar hotseat. | human:simon | provisional; hotseat aún no tiene hoja ni tareas |

# Aceptación de la hoja

- [x] El usuario ha decidido qué especiales entran en el primer corte.
- [x] El usuario ha aprobado el stacking y los topes.
- [x] El usuario ha decidido si hay traits negativos o malditos.
- [x] El usuario ha decidido si los enemigos usan traits.
- [x] El usuario ha aprobado la semántica de robo de vida.
- [x] El usuario ha aprobado la semántica del ataque circular.
- [x] El usuario ha aprobado el set de contenido y su reparto.
- [x] Cuerpo etéreo queda aplazado y documentado.
- [x] Los requisitos son verificables.
- [x] Las dependencias están claras.
- [x] Se puede generar un grafo de tareas.
