---
type: Requirement Sheet
id: REQ-025
title: Magia, hechizos y maná
description: "Nivel único de magia, maná derivado que se recarga cada turno, hechizos por familia accesibles por nivel y resurrección como hechizo de nivel alto."
status: draft
version: 1
decision_owner: human:simon
review_required: true
created_at: 2026-11-11T15:00:00Z
updated_at: 2026-11-11T15:00:00Z
related_tasks: []
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T15:00:00Z }
verified:
---

# Contexto

La visión pedía familias mágicas con niveles separados. El usuario prefiere un
sistema más simple: **un solo nivel de magia** por personaje y un **maná** que se
recarga cada turno. Las familias (fuego, hielo, veneno, vida…) siguen existiendo
como categorías de hechizo, pero no como niveles independientes: cualquier
lanzador con nivel suficiente puede usar cualquier hechizo.

Esta hoja define el recurso, el acceso y el coste. No define la lista completa de
hechizos ni la progresión por puntos de habilidad.

# Enmienda a documentos vigentes

- [REQ-014](REQ-014-atributos-inherentes-personajes.md): magia deja de ser una
  lista `{familia, nivel}` 1–4 y pasa a ser un nivel único. El atributo de
  acciones se añade en `REQ-026`.
- [REQ-015](REQ-015-roster-arquetipos.md): la identidad mágica se expresa como un
  nivel único por arquetipo, no como familias.
- [REQ-021](REQ-021-muerte-fantasma-resurreccion.md): la resurrección pasa a ser
  un hechizo de nivel alto con coste de maná; "mago" pasa a "lanzador con nivel
  suficiente".
- [Visión](../vision.md) y [alcance](../scope.md) recogen el cambio.

# Objetivos de experiencia

- Que la magia se explique en una línea: nivel de magia, maná y hechizos.
- Que el maná se sienta como presupuesto táctico por turno, no como una barra que
  hay que administrar durante toda la partida.
- Que elegir un hechizo sea una decisión de acción y de coste, no de grimorio.
- Que la resurrección sea cara y requiera un lanzador preparado.
- Que el jugador entienda por qué un hechizo está disponible o no.

# Requisitos creativos (decididos)

| ID | Requisito | Aceptación |
|---|---|---|
| R-001 | Cada personaje tiene **un nivel de magia entero**; no hay niveles por familia. | El estado guarda un único nivel; no existen mapas familia→nivel. |
| R-002 | Las familias (fuego, hielo, veneno, vida…) son categorías de hechizo; no limitan el acceso por sí mismas. | Dos hechizos de familias distintas con el mismo nivel y coste están disponibles para el mismo lanzador. |
| R-003 | El maná es un recurso separado del MP de movimiento, con un máximo derivado del nivel de magia. | El estado expone maná actual y máximo; el máximo no coincide con MP. |
| R-004 | El maná se recarga **completo** al inicio de cada turno de la unidad. | Al empezar su turno, una unidad vuelve a maná máximo; el gasto no se acumula entre turnos. |
| R-005 | Cada hechizo declara nivel mínimo y coste de maná; lanzarlo consume **una acción** y el coste. | Un hechizo sin maná o sin acción se rechaza sin consumir nada. |
| R-006 | Un lanzador puede lanzar hasta **2 hechizos por turno**, limitado también por maná y acciones. | Con 2 acciones y maná suficiente se pueden lanzar 2 hechizos; con 3 acciones se mantiene el tope de 2. |
| R-007 | El acceso a hechizos es **por nivel**: cualquier personaje con nivel suficiente puede lanzar cualquier hechizo de ese nivel. No hay aprendizaje ni grimorio. | No existe lista de hechizos conocidos; el catálogo y el nivel determinan la disponibilidad. |
| R-008 | Los proyectiles físicos no gastan maná; los mágicos sí y siguen las reglas de hechizo. | Un arquero dispara sin maná; un proyectil mágico descuenta coste y acción. |
| R-009 | La **resurrección** es un hechizo de nivel alto con coste de maná y las condiciones de `REQ-021`: adyacencia al cadáver y casilla sin vivos. | Sin nivel, sin maná o sin adyacencia, la resurrección se rechaza; cumple todo, se aplica. |
| R-010 | La resurrección no tiene un tope propio por turno: solo la limitan acciones, maná, nivel y adyacencia. | Un lanzador con maná y 2 acciones puede resucitar dos veces en el mismo turno. |
| R-011 | El HUD muestra nivel de magia y maná actual/máximo del jugador activo y del enemigo inspeccionado. | `REQ-022` y `REQ-023` reciben los campos; la QA visual los comprueba. |

# Requisitos técnicos

| ID | Requisito | Aceptación |
|---|---|---|
| T-001 | El estado de unidad guarda `magicLevel` entero y `mana { current, max }`; el máximo se calcula desde el nivel con una fórmula única. | Serialización y snapshot exponen ambos; cambiar el nivel recalcula el máximo. |
| T-002 | El catálogo de hechizos es dato serializable: id, familia, nivel mínimo, coste, alcance, objetivos, efecto y presentación. | Añadir un hechizo no requiere código nuevo de resolución. |
| T-003 | La resolución de hechizos es determinista con el RNG sembrado; no usa `Math.random`. | Misma semilla y comandos producen el mismo resultado. |
| T-004 | La validación comprueba acción, maná, nivel, alcance, línea de visión y objetivo antes de aplicar; si falla, no consume nada. | Tests de cada rechazo; estado y RNG intactos. |
| T-005 | La recarga de maná ocurre al inicio del turno de cada unidad, junto a la restauración de MP y acciones. | Tests de recarga por turno y de que el gasto no persiste. |
| T-006 | El comando de resurrección de `REQ-021` se implementa como hechizo, conservando adyacencia, ocupación, consumo y reaparición en el cadáver. | Los tests de `REQ-021` siguen pasando con el nuevo coste. |
| T-007 | El límite de 2 hechizos por turno se cuenta por unidad y turno, independiente de las acciones disponibles. | Con 3 acciones, el tercer hechizo se rechaza por tope, no por acción. |
| T-008 | Tests nuevos: nivel insuficiente, maná insuficiente, sin acción, tope de 2, recarga, proyectil mágico, resurrección y determinismo. | `pnpm run verify` pasa; los tests de `REQ-014`, `REQ-015` y `REQ-021` conservan su intención. |
| T-009 | Se actualizan glosario, arquitectura, `REQ-014`/`REQ-015`/`REQ-021`; se registra un ADR del sistema de magia y maná. | `docs:check` pasa; no quedan referencias a familias con nivel 1–4. |
| T-010 | Sin dependencias nuevas, sin red y sin arte final. | `package.json` y `pnpm-lock.yaml` no cambian. |

# Requisitos no funcionales

- **Rendimiento:** resolver un hechizo cuesta lo mismo que un ataque; el catálogo
  se consulta por id.
- **Accesibilidad:** coste, nivel y motivo de rechazo se explican con texto.
- **Legibilidad:** el maná y el nivel caben en el HUD lateral; no se muestran como
  barras ilegibles.
- **Mantenibilidad:** hechizos como datos; una sola fórmula de maná máximo.
- **Balance:** los costes se ajustan con el método de `REQ-026`.

# Dependencias

- [REQ-014](REQ-014-atributos-inherentes-personajes.md): nivel de magia como
  atributo.
- [REQ-015](REQ-015-roster-arquetipos.md): niveles de magia por arquetipo.
- [REQ-021](REQ-021-muerte-fantasma-resurreccion.md): resurrección y condiciones.
- [REQ-026](REQ-026-economia-acciones-rebalanceo.md): acciones y rebalanceo.
- [REQ-022](REQ-022-hud-izquierdo-jugador.md) y
  [REQ-023](REQ-023-hud-derecho-detalle-cursor.md): presentación.

# Fuera de alcance

- La lista completa de hechizos, familias y efectos.
- Progresión por puntos de habilidad y subida de nivel de magia.
- Aprendizaje, grimorios y pergaminos.
- Mantenimiento de hechizos permanentes.
- Resistencias por familia y estados alterados.
- IA que lanza hechizos más allá de la resurrección y buffs simples.
- Arte y audio de hechizos.

# Preguntas abiertas

1. **Rango del nivel de magia.** ¿1–4, 0–10 u otro? Provisional: 1–4.
2. **Fórmula de maná máximo.** ¿Nivel × 4, nivel × 3 + base, tabla por arquetipo?
   Provisional: nivel × 4.
3. **Coste por hechizo.** ¿Coste fijo por nivel, tabla por hechizo o ambos?
4. **Lista de familias y hechizos.** Fuego, hielo, veneno y vida son las
   candidatas; faltan efectos y alcances.
5. **Tope de 2 hechizos.** ¿Se mantiene con 3 acciones o escala con las acciones?
   Provisional: tope duro de 2.
6. **Resurrección.** Nivel mínimo, coste y si puede lanzarse sobre un cadáver de
   enemigo.
7. **Curación.** ¿Entra en el primer corte de magia o se pospone?
8. **Proyectiles mágicos.** ¿Comparten alcance y línea de visión con los físicos?

# Decisiones

| Fecha | Decisión | Quién | Estado |
|---|---|---|---|
| 2026-11-11 | Un solo nivel de magia por personaje; las familias son categorías, no niveles. | human:simon | aceptada |
| 2026-11-11 | El maná se recarga completo al inicio de cada turno y su máximo deriva del nivel. | human:simon | aceptada |
| 2026-11-11 | Acceso a hechizos por nivel, sin aprendizaje ni grimorio. | human:simon | aceptada |
| 2026-11-11 | Cada hechizo consume una acción y su coste de maná; máximo 2 hechizos por turno. | human:simon | aceptada |
| 2026-11-11 | La resurrección es un hechizo de nivel alto, sin tope propio por turno. | human:simon | aceptada |

# Aceptación de la hoja

- [x] El usuario ha aprobado las decisiones creativas.
- [ ] El usuario ha revisado el texto de la hoja.
- [x] Los requisitos son verificables.
- [x] Las dependencias están claras.
- [ ] El grafo de tareas es posible; el orden depende de `REQ-026` y de las
  fórmulas pendientes.
