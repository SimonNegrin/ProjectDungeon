---
type: Requirement Sheet
id: REQ-026
title: Economía de acciones y rebalanceo
description: "Varias acciones por turno como noveno atributo (2 por defecto, Pícaro 3), ataques repetibles, recoger/soltar a 1 MP, contenedores con apertura por acción, bonus de objetos con tope provisional y rebalanceo del combate con el método de win %."
status: stable
version: 5
decision_owner: human:simon
review_required: true
created_at: 2026-11-11T15:05:00Z
updated_at: 2026-11-13T16:37:46Z
related_tasks: [TASK-0076, TASK-0077, TASK-0078, TASK-0084]
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T15:05:00Z }
verified:
  - by: human:simon
    at: 2026-11-11T16:05:00Z
    note: >-
      Revisa y aprueba la hoja: 2 acciones por defecto (Pícaro 3), enemigos
      2/1/2, tope 4 provisional, fin de turno manual, un ataque por pulsación y
      rebalanceo con EXP-003.
---

> **Estado de implementación (2026-11-13).** Contador de acciones, costes por
> comando, ataque repetible, fin de turno manual, IA encadenada y HUD
> implementados en TASK-0076 a TASK-0078. **Soltar objetos (R-010) queda
> implementado en TASK-0094** dentro del modelo de inventario de
> [REQ-018](REQ-018-inventario-equipo.md): cuesta 1 MP y no gasta acción. Queda
> pendiente **R-011 (contenedores)**, que depende de
> [REQ-020](REQ-020-cofres-saqueo.md), y el **rebalanceo** de TASK-0084,
> aplazado hasta roster y bestiario completos por
> [REQ-029](REQ-029-tipos-dano-resistencias.md). El inventario de tres armas, la
> recogida con `G` y las ranuras `1`-`3` de
> [REQ-010](REQ-010-combate-equipo-acierto-defensa.md) quedan sustituidos por el
> panel con `I` de REQ-018.

# Contexto

Hoy cada unidad tiene **una acción por turno**, además de sus MP de movimiento.
La visión pide que el número de acciones sea un atributo del personaje. El usuario
fija: **2 acciones por defecto**, variable por arquetipo y por objetos, ataques
repetibles y rebalanceo inmediato.

Esto cambia el combate más que cualquier otra regla reciente: duplica el output
por turno, obliga a revisar el bestiario y convierte las acciones en el principal
eje de poder.

# Enmienda a documentos vigentes

- [REQ-014](REQ-014-atributos-inherentes-personajes.md): los ocho atributos pasan
  a nueve con **acciones por turno**.
- [REQ-015](REQ-015-roster-arquetipos.md): cada arquetipo declara sus acciones; el
  método de balance las incluye.
- [REQ-009](REQ-009-percepcion-alarma-huida.md): el bestiario declara acciones por
  tipo y la IA las encadena.
- [REQ-010](REQ-010-combate-equipo-acierto-defensa.md): el balance v1 queda
  obsoleto; PV, armas y armaduras se reajustan.
- [REQ-017](REQ-017-feedback-visual-eventos.md): cada acción tiene su beat; el
  turno puede duplicar su duración.
- [REQ-004](REQ-004-cursor-seleccion.md): "acercarse y atacar" debe respetar el
  número de acciones y el ataque repetible.

# Objetivos de experiencia

- Que hacer varias cosas por turno se sienta natural: atacar, abrir, usar, mover.
- Que el jugador vea cuántas acciones le quedan sin contar.
- Que las acciones extra de un arquetipo o un objeto se noten y se paguen.
- Que el turno no se alargue hasta aburrir, sobre todo en la fase enemiga.
- Que el balance se mida, no se improvise.

# Requisitos creativos (decididos)

| ID | Requisito | Aceptación |
|---|---|---|
| R-001 | Las acciones por turno son el **noveno atributo inherente**, con 2 por defecto. En el primer corte el **Pícaro tiene 3**; el rebalanceo ajusta el resto. | Una unidad sin modificadores tiene 2 acciones; el Pícaro 3; el atributo es serializable y visible en el HUD. |
| R-002 | Atacar consume una acción y se puede repetir en el mismo turno, contra el mismo objetivo u otro. | Dos ataques con 2 acciones; el segundo usa la misma fórmula. |
| R-003 | Interactuar consume una acción: abrir puertas, abrir cofres y acciones equivalentes. | Abrir puerta y cofre en el mismo turno es posible con 2 acciones. |
| R-004 | Moverse gasta MP, no acciones. **Recoger y soltar objetos del suelo cuestan 1 MP** y tampoco gastan acción. Esperar y terminar el turno no gastan acción. | Mover, recoger, soltar y pulsar fin de turno no reducen el contador de acciones. |
| R-005 | Lanzar un hechizo consume una acción, además del maná y del tope de `REQ-025`. | Sin acción no hay hechizo; sin maná tampoco. |
| R-006 | Los enemigos tienen acciones **por tipo** en el bestiario: **Centinela 2, Bruto 1, Cobarde 2**. No hay un valor único global. | Cada tipo declara su número; el snapshot lo expone; cambiar un tipo no cambia los demás. |
| R-007 | Los objetos pueden aportar acciones extra (+1 y similares); los bonus acumulan con un **tope de 4 acciones** por turno, provisional hasta el rebalanceo. | Dos objetos +1 dan +2 hasta el tope; por encima de 4 se recorta; el tope se revisa en EXP-003. |
| R-008 | El turno **no termina automáticamente** al agotar las acciones: el jugador lo cierra con `E`. El HUD sugiere terminar cuando no quedan acciones y tampoco MP útil. | Gastar la última acción no cambia de turno; el jugador puede seguir moviéndose con MP y cerrar con `E`; no hay auto-terminación. |
| R-009 | El rebalanceo es parte de esta hoja: se rehacen roster y bestiario con el método de win % incluyendo acciones, magia y réplica (`REQ-027`). | Los duelos de 1.000 simulaciones con tolerancia ±2 % se recalculan; el Pícaro 3 y la tabla enemiga 2/1/2 son valores iniciales, no definitivos. |
| R-010 | **Soltar un objeto al suelo** cuesta **1 MP y no gasta acción**; el objeto queda en la casilla del personaje. Si estaba equipado, se desequipa en la misma operación. El fantasma mantiene su excepción de `REQ-021`: un objeto por acción. | Soltar con MP deja el objeto en el suelo y no cambia el contador de acciones; sin MP se rechaza. Recogerlo después cuesta 1 MP. |
| R-011 | Abrir o registrar un **cofre o cadáver** cuesta **1 acción** y requiere **adyacencia**; con el contenedor abierto, transferir objetos es **gratis** (sin acción ni MP), limitado por capacidad, y se permite «coger todo». El fantasma no abre cofres y mueve un objeto por acción (`REQ-021`). | Abrir y coger todo consume 1 acción; las transferencias no consumen más; el fantasma inspecciona sin abrir. |
| R-012 | Huir y perseguir usan **MP, no acciones**. El cobarde no ataca mientras huye; acorralado, ataca con las acciones que le queden. | Perseguir o huir no reduce el contador de acciones; el cobarde acorralado puede atacar. |
| R-013 | **`Moverse` sobre un enemigo ejecuta un ataque por pulsación**: se acerca con MP y ataca una vez con 1 acción; si quedan acciones, repetir la pulsación ataca de nuevo. No encadena todos los ataques. `F` sigue siendo ataque directo. | Pícaro con 3 acciones ataca una vez por pulsación; el movimiento no gasta acción; sin acción solo se mueve. |

# Requisitos técnicos

| ID | Requisito | Aceptación |
|---|---|---|
| T-001 | El estado de unidad guarda `actions { max, remaining }`; se restaura al inicio del turno junto a MP y maná. | Tests de restauración y de gasto por acción. |
| T-002 | Cada comando declara cuántas acciones consume (0 o 1); la validación es atómica y rechaza sin cambios si no quedan. | Tests por comando: ataque, interacción, hechizo, movimiento, recoger, soltar y fin de turno. |
| T-003 | Los modificadores de equipo se aplican a `max` con el tope de 4; el +1 vive en `actionsBonus` del equipo y `REQ-019` puede exponerlo como trait después; el recorte es determinista. | Tests de acumulación, tope, retirada de objeto y compatibilidad con traits futuros. |
| T-004 | La IA enemiga encadena sus acciones en orden determinista y no usa `Math.random`: en alerta se mueve con MP y ataca hasta agotar acciones o matar; dormido/regresando no ataca; huyendo usa MP y solo ataca si está acorralado. | Misma semilla y comandos producen la misma secuencia; tests por estado y de parada al morir el objetivo. |
| T-005 | El método de balance de `EXP-003`/`REQ-015` se amplía para incluir acciones, hechizos y réplica; el escenario 1v1 sigue siendo la línea base. | El experimento documenta la nueva simulación y sus resultados. |
| T-006 | La presentación encadena **un beat por acción en secuencia**; el techo por acción de `REQ-017` se mantiene y se mide el turno completo. No se agrupan acciones por defecto; si el turno supera el umbral, se propone experimento. | Tests de timeline; el turno no adelanta beats ni pierde acciones; la secuencia respeta el orden. |
| T-007 | HUD, snapshot de debug y guardado exponen acciones máximas y restantes. | `REQ-022`, `REQ-024` y debug las muestran y las reconstruyen al cargar. |
| T-008 | Tests nuevos: dos ataques, Pícaro con 3 acciones, ataque + interacción, MP sin acción, hechizo sin acción, recoger/soltar sin acción, tope de 4, restauración, IA con varias acciones y E2E del HUD. | `pnpm run verify` pasa; los tests de `REQ-009`, `REQ-010` y `REQ-017` conservan su intención. |
| T-009 | Se actualizan economía de turno, arquitectura y glosario; se registra un ADR de economía de acciones. | `docs:check` pasa; no queda "una acción por turno" como regla vigente. |
| T-010 | Sin dependencias nuevas, sin red y sin arte final. | `package.json` y `pnpm-lock.yaml` no cambian. |
| T-011 | El comando de soltar valida MP y localización, desequipa si hace falta y crea una instancia de suelo en la casilla; snapshot y guardado exponen los objetos del suelo y el host permite elegir cuál recoger si hay varios. | Tests de soltar equipo y objeto de inventario, sin MP, tile con varios objetos, persistencia y selección en la UI; el estado y el RNG no cambian. |
| T-012 | Abrir/registrar un contenedor valida adyacencia y acción; una vez abierto, las transferencias y «coger todo» son gratuitas y atómicas, limitadas por capacidad; el fantasma no abre cofres. | Tests de apertura, transferencia gratuita, coger todo, capacidad, fantasma y contenedor vacío; solo la apertura consume acción. |
| T-013 | El comando Moverse sobre un enemigo se resuelve como movimiento (MP) + un ataque (1 acción); no encadena ataques. Si ya es adyacente, solo ataca. | Tests: Pícaro 3 acciones ataca una vez por comando; el movimiento no consume acción; sin acción solo se mueve. |

# Requisitos no funcionales

- **Ritmo:** el turno con 2 acciones no debe duplicar la espera percibida; si la
  fase enemiga supera un umbral, se propone experimento de presentación.
- **Legibilidad:** el contador de acciones se lee de un vistazo.
- **Accesibilidad:** el estado de acciones se explica con texto y no solo con
  iconos.
- **Mantenibilidad:** un contador por unidad; ninguna regla de acción en el host.
- **Balance:** las acciones extra son caras; +1 acción es un salto de poder.

# Dependencias

- [REQ-014](REQ-014-atributos-inherentes-personajes.md): esquema de atributos.
- [REQ-015](REQ-015-roster-arquetipos.md): acciones por arquetipo.
- [REQ-009](REQ-009-percepcion-alarma-huida.md): bestiario e IA.
- [REQ-010](REQ-010-combate-equipo-acierto-defensa.md): combate y balance.
- [REQ-017](REQ-017-feedback-visual-eventos.md): beats por acción.
- [REQ-025](REQ-025-magia-hechizos-mana.md): hechizos y su coste de acción.
- [REQ-027](REQ-027-replica-combate-cuerpo-a-cuerpo.md): réplica y su impacto en
  el balance.
- [REQ-004](REQ-004-cursor-seleccion.md): acciones por destino.

# Fuera de alcance

- Acciones extra por nivel o puntos de habilidad; solo arquetipo y objetos.
- Reacciones distintas de la réplica de `REQ-027`.
- Colas de acciones, planificación o turnos simultáneos.
- Cambios de hotseat o red.
- Rebalanceo de magia más allá de lo necesario para el método.

# Preguntas abiertas

Ninguna bloquea las reglas. TASK-0084 queda bloqueada: [REQ-029](REQ-029-tipos-dano-resistencias.md)
sustituyó el modelo de daño y aplazó el ajuste fino hasta roster y bestiario
completos. R-010/R-011 (soltar y contenedores) dependen de
[REQ-018](REQ-018-inventario-equipo.md) y
[REQ-020](REQ-020-cofres-saqueo.md).

# Decisiones

| Fecha | Decisión | Quién | Estado |
|---|---|---|---|
| 2026-11-11 | Las acciones por turno son el noveno atributo, con 2 por defecto. | human:simon | aceptada |
| 2026-11-11 | Se puede atacar dos veces por turno; atacar, interactuar y lanzar hechizos cuestan acción. | human:simon | aceptada |
| 2026-11-11 | Moverse y esperar no cuestan acción. | human:simon | aceptada |
| 2026-11-11 | Los enemigos tienen acciones por tipo. | human:simon | aceptada |
| 2026-11-11 | Los bonus de acción acumulan con tope de 4. | human:simon | aceptada |
| 2026-11-11 | Se rebalancea ahora con el método de win %, incluyendo acciones, magia y réplica. | human:simon | aceptada |
| 2026-11-11 | Recoger y soltar objetos del suelo cuestan 1 MP y no gastan acción; soltar un objeto equipado lo desequipa. | human:simon | aceptada |
| 2026-11-11 | Abrir/registrar un cofre o cadáver cuesta 1 acción y requiere adyacencia; transferir es gratis y se permite «coger todo». | human:simon | aceptada |
| 2026-11-11 | El Pícaro empieza con 3 acciones; el resto 2 en el primer corte y el rebalanceo ajusta. | human:simon | aceptada; provisional v1 |
| 2026-11-11 | Acciones enemigas: Centinela 2, Bruto 1, Cobarde 2; la IA ataca hasta agotar acciones o matar. | human:simon | aceptada; provisional v1 |
| 2026-11-11 | El tope de 4 acciones es provisional hasta el rebalanceo. | human:simon | aceptada; provisional |
| 2026-11-11 | El +1 acción vive en `actionsBonus` del equipo; `REQ-019` puede exponerlo como trait después. | human:simon | aceptada |
| 2026-11-11 | Presentación secuencial: un beat por acción, sin agrupar por defecto. | human:simon | aceptada |
| 2026-11-11 | Huir y perseguir usan MP, no acción; el cobarde no ataca huyendo salvo acorralado. | human:simon | aceptada |
| 2026-11-11 | El turno siempre se cierra manualmente con `E`; no hay auto-terminación. | human:simon | aceptada |
| 2026-11-11 | `Moverse` sobre un enemigo ejecuta un ataque por pulsación; no encadena. | human:simon | aceptada |

# Aceptación de la hoja

- [x] El usuario ha aprobado las decisiones creativas.
- [x] El usuario ha revisado el texto de la hoja.
- [x] Los requisitos son verificables.
- [x] Las dependencias están claras.
- [x] El grafo de tareas es posible; el rebalanceo es una tarea del milestone.
