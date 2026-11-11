---
type: Requirement Sheet
id: REQ-026
title: Economía de acciones y rebalanceo
description: "Varias acciones por turno como noveno atributo (2 por defecto), ataques repetibles, bonus de objetos con tope y rebalanceo del combate con el método de win %."
status: draft
version: 1
decision_owner: human:simon
review_required: true
created_at: 2026-11-11T15:05:00Z
updated_at: 2026-11-11T15:05:00Z
related_tasks: []
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T15:05:00Z }
verified:
---

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
| R-001 | Las acciones por turno son el **noveno atributo inherente**, con 2 por defecto. | Una unidad sin modificadores tiene 2 acciones; el atributo es serializable y visible en el HUD. |
| R-002 | Atacar consume una acción y se puede repetir en el mismo turno, contra el mismo objetivo u otro. | Dos ataques con 2 acciones; el segundo usa la misma fórmula. |
| R-003 | Interactuar consume una acción: abrir puertas, abrir cofres y acciones equivalentes. | Abrir puerta y cofre en el mismo turno es posible con 2 acciones. |
| R-004 | Moverse gasta MP, no acciones. Esperar y terminar el turno no gastan acción. | Mover y pulsar fin de turno no reducen el contador de acciones. |
| R-005 | Lanzar un hechizo consume una acción, además del maná y del tope de `REQ-025`. | Sin acción no hay hechizo; sin maná tampoco. |
| R-006 | Los enemigos tienen acciones **por tipo** en el bestiario, no un valor único global. | Cada tipo declara su número; el snapshot lo expone. |
| R-007 | Los objetos pueden aportar acciones extra (+1 y similares); los bonus acumulan con un **tope duro de 4 acciones** por turno. | Dos objetos +1 dan +2 hasta el tope; por encima de 4 se recorta. |
| R-008 | El turno termina al agotar las acciones o al pulsar fin de turno; el HUD sugiere terminar cuando no quedan acciones. | No hay auto-terminación silenciosa; el jugador conserva el control. |
| R-009 | El rebalanceo es parte de esta hoja: se rehacen roster y bestiario con el método de win % incluyendo acciones, magia y réplica (`REQ-027`). | Los duelos de 1.000 simulaciones con tolerancia ±2 % se recalculan; los valores v1 no se conservan por inercia. |

# Requisitos técnicos

| ID | Requisito | Aceptación |
|---|---|---|
| T-001 | El estado de unidad guarda `actions { max, remaining }`; se restaura al inicio del turno junto a MP y maná. | Tests de restauración y de gasto por acción. |
| T-002 | Cada comando declara cuántas acciones consume (0 o 1); la validación es atómica y rechaza sin cambios si no quedan. | Tests por comando: ataque, interacción, hechizo, movimiento, fin de turno. |
| T-003 | Los modificadores de equipo se aplican a `max` con el tope de 4; el recorte es determinista. | Tests de acumulación, tope y retirada de objeto. |
| T-004 | La IA enemiga encadena sus acciones en orden determinista y no usa `Math.random`. | Misma semilla y comandos producen la misma secuencia de acciones. |
| T-005 | El método de balance de `EXP-003`/`REQ-015` se amplía para incluir acciones, hechizos y réplica; el escenario 1v1 sigue siendo la línea base. | El experimento documenta la nueva simulación y sus resultados. |
| T-006 | La presentación encadena un beat por acción; el techo por acción de `REQ-017` se mantiene y se mide el turno completo. | Tests de timeline; el turno no adelanta beats ni pierde acciones. |
| T-007 | HUD, snapshot de debug y guardado exponen acciones máximas y restantes. | `REQ-022`, `REQ-024` y debug las muestran y las reconstruyen al cargar. |
| T-008 | Tests nuevos: dos ataques, ataque + interacción, MP sin acción, hechizo sin acción, tope de 4, restauración, IA con varias acciones y E2E del HUD. | `pnpm run verify` pasa; los tests de `REQ-009`, `REQ-010` y `REQ-017` conservan su intención. |
| T-009 | Se actualizan economía de turno, arquitectura y glosario; se registra un ADR de economía de acciones. | `docs:check` pasa; no queda "una acción por turno" como regla vigente. |
| T-010 | Sin dependencias nuevas, sin red y sin arte final. | `package.json` y `pnpm-lock.yaml` no cambian. |

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

1. **Recoger objeto.** Hoy cuesta 1 MP sin acción; ¿se mantiene o pasa a costar
   acción?
2. **Valores por arquetipo.** ¿Quién tiene 3 acciones y qué paga a cambio?
3. **Valores por enemigo.** ¿Bruto 1, Centinela 2, Cobarde 2, o otra tabla?
4. **Tope de 4.** ¿Es definitivo o se ajusta con el balance?
5. **Objetos.** ¿+1 acción es un trait de `REQ-019` o un campo propio de equipo?
6. **Ritmo.** ¿Se presenta cada acción en secuencia o se agrupan las de un mismo
   turno?
7. **Acciones y huida.** ¿Huir o perseguir consume acción? Provisional: la huida
   se resuelve en el turno enemigo con su MP.

# Decisiones

| Fecha | Decisión | Quién | Estado |
|---|---|---|---|
| 2026-11-11 | Las acciones por turno son el noveno atributo, con 2 por defecto. | human:simon | aceptada |
| 2026-11-11 | Se puede atacar dos veces por turno; atacar, interactuar y lanzar hechizos cuestan acción. | human:simon | aceptada |
| 2026-11-11 | Moverse y esperar no cuestan acción. | human:simon | aceptada |
| 2026-11-11 | Los enemigos tienen acciones por tipo. | human:simon | aceptada |
| 2026-11-11 | Los bonus de acción acumulan con tope de 4. | human:simon | aceptada |
| 2026-11-11 | Se rebalancea ahora con el método de win %, incluyendo acciones, magia y réplica. | human:simon | aceptada |

# Aceptación de la hoja

- [x] El usuario ha aprobado las decisiones creativas.
- [ ] El usuario ha revisado el texto de la hoja.
- [x] Los requisitos son verificables.
- [x] Las dependencias están claras.
- [ ] El grafo de tareas es posible; depende de los valores por arquetipo y tipo.
