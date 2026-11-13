---
type: Requirement Sheet
id: REQ-025
title: Magia, hechizos y maná
description: "Nivel de magia único 0–4, maná derivado (nivel × 4) que se recarga cada turno, fórmula mágica con las capas del combate físico y catálogo mínimo de seis hechizos con resurrección de nivel 4."
status: stable
version: 3
decision_owner: human:simon
review_required: true
created_at: 2026-11-11T15:00:00Z
updated_at: 2026-11-13T16:37:46Z
related_tasks: [TASK-0081, TASK-0082, TASK-0083]
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T15:00:00Z }
verified:
  - by: human:simon
    at: 2026-11-11T15:40:00Z
    note: >-
      Revisa y aprueba la hoja: nivel 0–4, maná nivel × 4, catálogo mínimo de seis
      hechizos, fórmula mágica con las capas del físico, curación a 2–3 casillas y
      resurrección de nivel 4 con 60 % del PV máximo.
---

> **Estado de implementación (2026-11-13).** Nivel de magia, maná, catálogo,
> resolvedor, HUD y feedback implementados y verificados en TASK-0081 a
> TASK-0083. La **resurrección jugable** sigue pendiente del flujo de fantasma,
> derrota y cadáver de [REQ-021](REQ-021-muerte-fantasma-resurreccion.md); el
> hechizo ya existe y se prueba con estados sintéticos.

> **Nota de vigencia (2026-11-13).** La fórmula mágica y el catálogo se enmendan
> por [REQ-029](REQ-029-tipos-dano-resistencias.md) y
> [ADR-023](../decisions/ADR-023-tipos-dano-paquetes-bandas.md): el daño se
> resuelve por paquetes con tipo en `src/game/damage.ts`, la armadura no protege
> de mágico/eléctrico y el nivel de magia solo afecta a acceso, maná e impacto.
> Los hechizos de fuego causan daño mágico hasta que exista el trait de quemadura;
> los eléctricos causan eléctrico. Lo implementan TASK-0085 a TASK-0090 y lo
> documenta TASK-0091.

# Contexto

La visión pedía familias mágicas con niveles separados. El usuario prefiere un
sistema más simple: **un solo nivel de magia** por personaje y un **maná** que se
recarga cada turno. Las familias (fuego, eléctrico, veneno, vida…) siguen
existiendo como categorías de hechizo, pero no como niveles independientes:
cualquier lanzador con nivel suficiente puede usar cualquier hechizo.

Esta hoja define el recurso, el acceso, la fórmula de ataque y un catálogo mínimo
de seis hechizos. No define la lista completa ni la progresión por puntos de
habilidad.

# Enmienda a documentos vigentes

- [REQ-014](REQ-014-atributos-inherentes-personajes.md): magia deja de ser una
  lista `{familia, nivel}` 1–4 y pasa a ser un nivel único 0–4. El atributo de
  acciones se añade en `REQ-026`.
- [REQ-015](REQ-015-roster-arquetipos.md): la identidad mágica se expresa como un
  nivel único por arquetipo: Mago 4, Clérigo 3, Guerrero mágico 2, Cocinero 1; el
  resto 0.
- [REQ-021](REQ-021-muerte-fantasma-resurreccion.md): la resurrección pasa a ser
  un hechizo de nivel 4 con coste 8 de maná; «mago» pasa a «lanzador con nivel
  suficiente».
- [Visión](../vision.md), [alcance](../scope.md), [glosario](../glossary.md) y
  [arquitectura](../design/architecture.md) recogen el cambio.
- Se registra [ADR-019](../decisions/ADR-019-magia-mana-hechizos.md).

# Objetivos de experiencia

- Que la magia se explique en una línea: nivel de magia, maná y hechizos.
- Que el maná se sienta como presupuesto táctico por turno, no como una barra que
  hay que administrar durante toda la partida.
- Que elegir un hechizo sea una decisión de acción y de coste, no de grimorio.
- Que el nivel alto se note en el daño: cada nivel tiene un ataque propio.
- Que el ataque mágico se lea con las mismas capas que el físico.
- Que la resurrección sea cara y requiera un lanzador preparado.
- Que el jugador entienda por qué un hechizo está disponible o no.

# Requisitos creativos (decididos)

| ID | Requisito | Aceptación |
|---|---|---|
| R-001 | Cada personaje tiene **un nivel de magia entero de 0 a 4**; 0 significa sin magia. No hay niveles por familia. | El estado guarda un único nivel; no existen mapas familia→nivel; el nivel 0 no puede lanzar. |
| R-002 | Las familias (fuego, eléctrico, veneno, vida…) son categorías de hechizo; no limitan el acceso por sí mismas. | Dos hechizos de familias distintas con el mismo nivel y coste están disponibles para el mismo lanzador. |
| R-003 | El maná es un recurso separado del MP de movimiento, con un máximo de **nivel × 4**. | El estado expone maná actual y máximo; el máximo es 0/4/8/12/16 y no coincide con MP. |
| R-004 | El maná se recarga **completo** al inicio de cada turno de la unidad. | Al empezar su turno, una unidad vuelve a maná máximo; el gasto no se acumula entre turnos. |
| R-005 | Cada hechizo declara nivel mínimo y **coste final de maná**; el 2 × nivel es una guía de diseño (±1 por hechizo); lanzarlo consume **una acción** y el coste. | El coste final vive en el catálogo; un hechizo sin maná o sin acción se rechaza sin consumir nada. |
| R-006 | Un lanzador puede lanzar hasta **2 hechizos por turno**, limitado también por maná y acciones. El tope es provisional hasta los objetos de +1 acción. | Con 2 acciones y maná suficiente se pueden lanzar 2 hechizos; con 3 acciones se mantiene el tope de 2. |
| R-007 | El acceso a hechizos es **por nivel**: cualquier personaje con nivel suficiente puede lanzar cualquier hechizo de ese nivel o inferior. No hay aprendizaje ni grimorio. | No existe lista de hechizos conocidos; el catálogo y el nivel determinan la disponibilidad. |
| R-008 | Los proyectiles físicos no gastan maná; los mágicos sí y siguen las reglas de hechizo. | Un arquero dispara sin maná; un proyectil mágico descuenta coste y acción. |
| R-009 | La **resurrección** es un hechizo de **nivel 4 y coste 8** con las condiciones de `REQ-021`: adyacencia al cadáver y casilla sin vivos. Hoy solo el Mago tiene nivel 4. | Sin nivel 4, sin 8 de maná o sin adyacencia, la resurrección se rechaza; cumple todo, se aplica. |
| R-010 | La resurrección no tiene un tope propio por turno: solo la limitan acciones, maná, nivel y adyacencia. | Un lanzador de nivel 4 con 16 de maná y 2 acciones puede resucitar dos veces en el mismo turno. |
| R-011 | El HUD muestra nivel de magia y maná actual/máximo del jugador activo y del enemigo inspeccionado. | `REQ-022` y `REQ-023` reciben los campos; la QA visual los comprueba. |
| R-012 | El **ataque mágico usa las mismas capas que el físico**: impacto con `nivel de magia + acierto del hechizo + 1d6 > defensa + escudo + 1d6`; daño con `max(1, poder del hechizo + 1d6 − (resistencia + armadura + 1d6))`. El empate falla. El nivel de magia suma al acierto; el daño sale del poder del hechizo. | No hay resistencia mágica separada; un lanzador de nivel alto acierta más con el mismo hechizo, pero el daño depende del poder del hechizo. |
| R-013 | El primer corte incluye un **catálogo mínimo de seis hechizos**: Eléctrico I (nivel 1), Fuego II (2), Eléctrico III (3), Fuego IV (4), Curación III (3) y Resurrección IV (4). | Cada nivel 1–4 tiene un ataque propio; la curación es a 2–3 casillas y solo a aliados; la resurrección exige nivel 4. |

# Requisitos técnicos

| ID | Requisito | Aceptación |
|---|---|---|
| T-001 | El estado de unidad guarda `magicLevel` entero (0–4) y `mana { current, max }`; `max = magicLevel × 4` con una fórmula única. | Serialización y snapshot exponen ambos; cambiar el nivel recalcula el máximo. |
| T-002 | El catálogo de hechizos es dato serializable: id, familia, nivel mínimo, **coste final**, alcance, acierto, poder, objetivo, **efecto con parámetros** y presentación. El 2 × nivel es una guía, no una fórmula de runtime. | Añadir o ajustar un hechizo no requiere código nuevo; el efecto se parametriza (cantidad de curación, PV al resucitar) y no se codifica por id. |
| T-003 | La resolución de hechizos es determinista con el RNG sembrado; no usa `Math.random`. | Misma semilla y comandos producen el mismo resultado. |
| T-004 | La validación comprueba acción, maná, nivel, alcance, línea de visión y objetivo antes de aplicar; si falla, no consume nada. | Tests de cada rechazo; estado y RNG intactos. |
| T-005 | La recarga de maná ocurre al inicio del turno de cada unidad, junto a la restauración de MP y acciones. | Tests de recarga por turno y de que el gasto no persiste. |
| T-006 | El comando de resurrección de `REQ-021` se implementa como hechizo de nivel 4 y coste 8, conservando adyacencia, ocupación, consumo y reaparición en el cadáver. | Los tests de `REQ-021` siguen pasando con el nuevo coste. |
| T-007 | El límite de 2 hechizos por turno se cuenta por unidad y turno, independiente de las acciones disponibles; es provisional hasta los objetos de +1 acción. | Con 3 acciones, el tercer hechizo se rechaza por tope, no por acción. |
| T-008 | Tests nuevos: nivel insuficiente, maná insuficiente, sin acción, tope de 2, recarga, proyectil mágico, acierto/poder de fuego y eléctrico, curación con alcance y objetivo, resurrección y determinismo. | `pnpm run verify` pasa; los tests derivan los valores esperados del catálogo y no fijan números duplicados; los de `REQ-014`, `REQ-015` y `REQ-021` conservan su intención. |
| T-009 | Se actualizan glosario, arquitectura, `REQ-014`/`REQ-015`/`REQ-021`, visión y alcance; se registra `ADR-019`. | `docs:check` pasa; no quedan referencias a familias con nivel 1–4. |
| T-010 | Sin dependencias nuevas, sin red y sin arte final. | `package.json` y `pnpm-lock.yaml` no cambian. |
| T-011 | El resolvedor mágico reutiliza las capas de combate de `REQ-014` y no crea una resistencia mágica paralela. | Fuego y eléctrico se diferencian por acierto y poder; el mismo objetivo recibe el mismo tratamiento de defensa/escudo/resistencia/armadura. |

# Catálogo mínimo (provisional v1)

El catálogo es la fuente única de los hechizos. Todos los números de la tabla son
datos: cambiarlos no requiere tocar el resolvedor. Los valores son provisionales y
se ajustan tras playtest; los tests leen del catálogo y no duplican números. El PV
al volver de la resurrección (60 % del máximo, redondeado hacia arriba) es un
parámetro del efecto.

| Hechizo | Familia | Nivel | Coste | Alcance | Acierto | Poder / efecto | Objetivo |
|---|---|---:|---:|---:|---:|---|---|
| Eléctrico I | eléctrico | 1 | 2 | 3 | +2 | 2 | enemigo |
| Fuego II | fuego | 2 | 4 | 3 | +0 | 5 | enemigo |
| Eléctrico III | eléctrico | 3 | 6 | 4 | +3 | 4 | enemigo |
| Fuego IV | fuego | 4 | 8 | 4 | +1 | 8 | enemigo |
| Curación III | vida | 3 | 6 | 2–3 | — | cura 4 PV | aliado, no a sí mismo |
| Resurrección IV | vida | 4 | 8 | 1 | — | resucita al 60 % del PV máximo | cadáver de jugador |

- **Ataque:** impacto con `nivel de magia + acierto + 1d6` contra
  `defensa + escudo + 1d6`; daño con `poder + 1d6` menos
  `resistencia + armadura + 1d6`, mínimo 1.
- **Curación:** no tira impacto; requiere línea de visión y un aliado a 2–3
  casillas. No puede curarse a sí mismo ni a enemigos.
- **Resurrección:** no tira impacto; requiere nivel 4, 8 de maná, adyacencia a la
  casilla del cadáver y ausencia de vivos en ella (`REQ-021`). El resucitado
  vuelve con el 60 % de su PV máximo, redondeado hacia arriba (mínimo 1).
- **Proyectiles mágicos:** usan el alcance del hechizo y la línea de visión de
  Bresenham; los muros bloquean y las unidades no.

# Requisitos no funcionales

- **Rendimiento:** resolver un hechizo cuesta lo mismo que un ataque; el catálogo
  se consulta por id.
- **Accesibilidad:** coste, nivel y motivo de rechazo se explican con texto.
- **Legibilidad:** el maná y el nivel caben en el HUD lateral; no se muestran como
  barras ilegibles.
- **Mantenibilidad:** hechizos como datos (coste final y efecto parametrizado);
  una sola fórmula de maná máximo.
- **Balance:** los seis hechizos son provisionales v1 y se ajustan tras playtest;
  los tests leen del catálogo.

# Dependencias

- [REQ-014](REQ-014-atributos-inherentes-personajes.md): nivel de magia como
  atributo.
- [REQ-015](REQ-015-roster-arquetipos.md): niveles de magia por arquetipo.
- [REQ-021](REQ-021-muerte-fantasma-resurreccion.md): resurrección y condiciones.
- [REQ-026](REQ-026-economia-acciones-rebalanceo.md): acciones y rebalanceo.
- [REQ-022](REQ-022-hud-izquierdo-jugador.md) y
  [REQ-023](REQ-023-hud-derecho-detalle-cursor.md): presentación.

# Fuera de alcance

- La lista completa de hechizos, familias y efectos; el primer corte es el
  catálogo mínimo de esta hoja.
- Estados alterados, congelación, veneno, miedo, teletransporte, robo de vida y
  muros mágicos; quedan como ideas futuras no normativas.
- Resistencias por familia y objetos que las aporten.
- Curación a sí mismo, a enemigos o a más de 3 casillas.
- Resurrección de enemigos.
- Aprendizaje, grimorios y pergaminos.
- Progresión por puntos de habilidad y subida de nivel de magia.
- Mantenimiento de hechizos permanentes.
- IA que lanza hechizos más allá de la resurrección y buffs simples.
- Arte y audio de hechizos.

# Ideas futuras (no normativas)

El usuario las propone como dirección, no como compromiso. Cada una necesita su
propia hoja y, si hay dudas, un experimento.

| Idea | Efecto | Dependencia |
|---|---|---|
| Congelar | Daño y el objetivo queda congelado un turno | Estados alterados y resistencia al frío |
| Envenenar | Daño durante 2 turnos | Estados alterados y resistencia al veneno |
| Teletransporte | Mueve a un aliado o enemigo dentro del alcance | Reglas de ocupación y destino válido |
| Asustar | Área; los cobardes huyen | Perfil de huida de `REQ-009` y objetivos de área |
| Robo de vida | La mitad del daño cura al lanzador | Fórmula de daño y curación |
| Bloqueo | Muro mágico con duración y coste de maná | Mutación del mapa, ocupación y mantenimiento |

# Preguntas abiertas

Ninguna bloquea la implementación del primer corte. Quedan como provisionales:

- **Objeto de resurrección:** nivel y consumo se deciden en `REQ-021`; el hechizo
  ya tiene nivel 4 y coste 8.
- **Ajuste de los seis hechizos:** valores provisionales v1; se revisan tras
  playtest.
- **Tope de 2 hechizos:** se revisa cuando existan objetos de +1 acción
  (`REQ-026`/`REQ-019`).
- **Presentación de magia 0 en el HUD:** `REQ-022`/`REQ-023` deciden si se muestra
  «sin magia» o se omite el bloque.

# Decisiones

| Fecha | Decisión | Quién | Estado |
|---|---|---|---|
| 2026-11-11 | Un solo nivel de magia por personaje; las familias son categorías, no niveles. | human:simon | aceptada |
| 2026-11-11 | El maná se recarga completo al inicio de cada turno y su máximo deriva del nivel. | human:simon | aceptada |
| 2026-11-11 | Acceso a hechizos por nivel, sin aprendizaje ni grimorio. | human:simon | aceptada |
| 2026-11-11 | Cada hechizo consume una acción y su coste de maná; máximo 2 hechizos por turno. | human:simon | aceptada; tope provisional |
| 2026-11-11 | La resurrección es un hechizo de nivel alto, sin tope propio por turno. | human:simon | aceptada |
| 2026-11-11 | Nivel de magia 0–4; maná máximo = nivel × 4; coste base 2 × nivel (±1 por hechizo). | human:simon | aceptada; provisional v1 |
| 2026-11-11 | El ataque mágico usa las mismas capas que el físico: defensa + escudo para impactar, resistencia + armadura para dañar. | human:simon | aceptada |
| 2026-11-11 | Catálogo mínimo de seis hechizos, un ataque por nivel (Eléctrico I, Fuego II, Eléctrico III, Fuego IV) más Curación III y Resurrección IV. | human:simon | aceptada |
| 2026-11-11 | La resurrección exige nivel 4 y 8 de maná; hoy solo el Mago. | human:simon | aceptada |
| 2026-11-11 | La curación es a 2–3 casillas, solo a aliados, y no puede curarse a sí mismo. | human:simon | aceptada |
| 2026-11-11 | La resurrección devuelve el 60 % del PV máximo, redondeado hacia arriba (mínimo 1). | human:simon | aceptada |
| 2026-11-11 | El tope de 2 hechizos se mantiene provisional hasta los objetos de +1 acción. | human:simon | aceptada; provisional |

# Aceptación de la hoja

- [x] El usuario ha aprobado las decisiones creativas.
- [x] El usuario ha revisado el texto de la hoja.
- [x] El usuario ha revisado el catálogo mínimo y acepta los valores provisionales v1.
- [x] Los requisitos son verificables.
- [x] Las dependencias están claras.
- [x] El grafo de tareas es posible; el orden depende de `REQ-026`.
