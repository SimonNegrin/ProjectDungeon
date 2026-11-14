---
type: Requirement Sheet
id: REQ-034
title: Objetos saqueables y botín de enemigos
description: "Un enemigo solo deja cadáver si al menos uno de sus objetos es saqueable; la saqueabilidad se decide por objeto al crear al enemigo (25 % común, 100 % progresión) y el cadáver se saquea desde el mismo tile sin coste de acción."
status: stable
version: 1
decision_owner: human:simon
review_required: true
created_at: 2026-11-14T23:21:31Z
updated_at: 2026-11-14T23:35:43Z
related_tasks: [TASK-0130, TASK-0133, TASK-0135, TASK-0136, TASK-0142, TASK-0143, TASK-0157]
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T23:21:31Z }
verified:
  - by: human:simon
    at: 2026-11-14T23:23:59Z
    note: >-
      Revisa y aprueba la v1: saqueabilidad por objeto al crear al enemigo
      (25 % común, 100 % progresión), cadáver solo con botín, saqueo desde el
      mismo tile sin coste, cadáver de jugador intacto y enmiendas a
      REQ-017/018/020/021/024/026.
---

# Contexto

Hoy cualquier enemigo muerto deja un cadáver de presentación y el panel lo
lista en la columna Suelo. El usuario quiere que el cadáver sea una señal: **solo
existe si hay algo que saquear**. La regla evita cadáveres decorativos, prepara
las llaves y objetos especiales que aparecerán en manos de enemigos cuando
lleguen las puertas y cofres cerrados, y mantiene el saqueo rápido.

Esta hoja define **qué hace saqueable a un objeto**, **cuándo se decide**, **qué
pasa al morir un enemigo** y **cómo se saquea el cadáver**. Los cofres, la
transferencia, la capacidad y el apilado siguen en
[REQ-020](REQ-020-cofres-saqueo.md). La muerte del jugador, el fantasma y la
resurrección siguen en [REQ-021](REQ-021-muerte-fantasma-resurreccion.md).

La regla es de **enemigos**. Todo objeto en manos de un jugador es saqueable; el
cadáver de jugador conserva todo su equipo y su mochila. En esta hoja,
**saqueable** es el término del glosario para lo que el usuario llama
«looteable».

# Objetivos de experiencia

- Que un cadáver visible signifique siempre que hay algo que coger.
- Que el jugador no pierda tiempo examinando cadáveres vacíos ni decorativos.
- Que saquear sea rápido: llegar al tile y coger, sin gastar la acción del turno.
- Que el botín sea determinista y no se pueda repetir recargando la partida.
- Que las llaves y objetos de progresión nunca bloqueen una partida.
- Que el equipo del jugador muerto no se pierda por una probabilidad.
- Que el mundo quede limpio: el cadáver de enemigo vacío desaparece.
- Que la regla sea datos y no excepciones repartidas por el motor.

# Requisitos creativos (decididos)

| ID | Requisito | Aceptación |
|---|---|---|
| R-001 | Un enemigo solo deja cadáver si al menos uno de sus objetos es saqueable. Sin objetos saqueables no hay cadáver, decal, contenedor ni entrada en el panel. | Al morir un enemigo sin objetos saqueables no aparece nada en el tile; con al menos uno, aparece un cadáver con ese objeto. |
| R-002 | La saqueabilidad se decide **por instancia de objeto** al crear al enemigo. Los objetos en manos de un jugador son siempre saqueables. Los que empiezan en manos de un enemigo se tiran: **25 %** para botín común y **100 %** para objetos de progresión. | Cada objeto tiene su propio resultado; dos objetos del mismo enemigo pueden caer de forma distinta; un objeto de jugador nunca se filtra. |
| R-003 | «Empieza en manos de un enemigo» significa equipo y mochila en el momento de su creación. Los objetos que el enemigo adquiere después conservan su origen: si vienen de un jugador, del suelo o de un cofre, son saqueables. | Un enemigo que recoge un objeto del suelo lo suelta siempre; uno que empieza con una espada la tira al 25 %. |
| R-004 | Al morir, los objetos saqueables pasan al cadáver y el resto desaparece con el enemigo. El cadáver contiene solo objetos saqueables. | El cadáver no muestra objetos no saqueables; el equipo no saqueable no queda visible ni recuperable. |
| R-005 | El cadáver de enemigo es un contenedor de [REQ-020](REQ-020-cofres-saqueo.md) en el tile del enemigo. No bloquea el paso, puede compartir tile con otros cadáveres o con un vivo y se lista en la columna Suelo cuando el jugador está en ese tile. | Un vivo puede ocupar el tile del cadáver; varios cadáveres comparten tile; el panel los muestra al estar encima. |
| R-006 | Saquear un cadáver exige estar **en el mismo tile**, no adyacencia. Abrir/registrar y transferir son **gratis, sin acción ni MP**; el vivo puede «coger todo». El fantasma accede desde el mismo tile y mueve **un objeto por acción**. Los cofres conservan adyacencia y **1 acción** de apertura. | Desde un tile adyacente no se abre el cadáver; desde el mismo tile se coge todo sin gastar acción ni MP; el fantasma gasta una acción por objeto; el cofre sigue igual. |
| R-007 | Cuando se coge el último objeto, el cadáver de enemigo desaparece. El cadáver de jugador **no** desaparece al vaciarse: persiste como objetivo de resurrección de [REQ-021](REQ-021-muerte-fantasma-resurreccion.md). | El cadáver de enemigo vacío se retira del tile y del panel; el de jugador sigue disponible para resucitar. |
| R-008 | Las llaves y objetos especiales necesarios para avanzar son siempre saqueables (100 %). No se admite probabilidad pura sin una fuente alternativa garantizada. | Una llave en manos de un enemigo cae siempre; si en el futuro se diseña una probabilidad, existe otra vía garantizada para conseguirla. |
| R-009 | El cadáver de jugador conserva **todo** su equipo y su mochila, sin tirada ni filtro. La regla de saqueabilidad es solo para enemigos. | Al morir un jugador, todos sus objetos están en el cadáver; ninguno desaparece por probabilidad. |
| R-010 | Todo cadáver de enemigo visible tiene al menos un objeto saqueable. No se muestra la probabilidad ni el contenido antes de morir. El cadáver aparece al terminar el feedback de muerte, no antes. | No hay cadáveres decorativos; la probabilidad no se anuncia; el cadáver no se dibuja durante la animación de muerte. |
| R-011 | El pool de este corte es solo el equipo actual de los tres enemigos: espada + escudo, hacha + placa y daga + escudo. No se añaden objetos, llaves ni piezas de [REQ-019](REQ-019-traits-objetos.md). | Los tres enemigos usan sus objetos actuales; el catálogo no crece en este corte; las llaves llegan con su propia hoja. |
| R-012 | El resultado de la tirada es determinista por semilla y orden estable de creación, y se guarda. Guardar y cargar no vuelve a tirar. | Misma semilla y mismas acciones producen el mismo botín; cargar un guardado no cambia qué objetos son saqueables. |

# Requisitos técnicos

| ID | Requisito | Aceptación |
|---|---|---|
| T-001 | `ItemInstance` gana una marca booleana `lootable` fijada al crear la instancia. Por defecto es `true` para jugador, suelo y cofres; para un enemigo es el resultado de la tirada. `ItemDefinition` declara `lootPolicy: 'common' \| 'progression'`; los porcentajes viven en datos, no en el host. | El snapshot expone la marca; cambiar la política de un objeto no requiere tocar el host; el catálogo no duplica la lógica. |
| T-002 | La tirada usa un RNG de botín derivado de la semilla del juego y de una identidad estable del enemigo. No consume el RNG principal, para no alterar mapas, combate ni tests existentes. No se usa `Math.random`. | La misma semilla y el mismo orden de creación dan el mismo resultado; los tests seeded actuales conservan su secuencia. |
| T-003 | Al crear un enemigo se aplica la tirada a **cada** instancia de su equipo y mochila. Las instancias creadas para jugadores, suelo o cofres nacen con `lootable: true`. Las instancias adquiridas después conservan su marca. | Un enemigo con espada y escudo produce dos resultados independientes; un objeto recogido del suelo sigue siendo saqueable. |
| T-004 | Al morir un enemigo, el motor crea un `Container` de tipo cadáver con las instancias `lootable`, las retira de la unidad muerta y descarta las no saqueables. Si el conjunto está vacío, no crea contenedor. La unidad muerta permanece en `enemies` con 0 PV y sin objetos, para victoria/derrota y estado. | El contenedor contiene exactamente las instancias saqueables; la unidad muerta no conserva objetos; sin saqueables no hay contenedor. |
| T-005 | El render y el panel leen **contenedores de cadáver**, no unidades muertas. Un enemigo muerto sin contenedor no se dibuja ni se lista. El contenedor se dibuja al terminar el beat de muerte. | No aparece un cadáver antes de la animación; un enemigo sin botín no se ve como cadáver; el panel lista solo contenedores con contenido. |
| T-006 | El saqueo de cadáver vive en el host y reutiliza la transferencia de contenedores de [REQ-020](REQ-020-cofres-saqueo.md). La fuente «cadáver» exige mismo tile y coste 0 de acción y MP; el fantasma mantiene una acción por objeto. La UI muestra «sin coste» para cadáver y «1 acción» para cofre. | No hay una segunda ruta de transferencia; el panel anuncia el coste correcto; el cadáver no se abre desde adyacente. |
| T-007 | Al retirar el último objeto de un contenedor de cadáver de enemigo, el motor elimina el contenedor. Los cadáveres de jugador no se eliminan al vaciarse. | El contenedor de enemigo vacío desaparece del estado y del tile; el de jugador sigue existiendo. |
| T-008 | Los objetos con `lootPolicy: 'progression'` no se tiran: nacen con `lootable: true`. La política es dato del objeto y se aplica antes que la tirada. | Una llave o especial siempre cae; el test distingue common y progression sin cambiar el host. |
| T-009 | El snapshot de debug expone `lootable`, los contenedores de cadáver y el resultado de la tirada. La contención sigue siendo la única fuente de verdad; no hay listas paralelas de objetos. | `F1`/snapshot permiten explicar por qué un objeto cayó; no se duplica el inventario en otra estructura. |
| T-010 | El guardado serializa `lootable` y los contenedores de cadáver; al cargar no se recalcula la tirada. Si el esquema v1 de [REQ-024](REQ-024-menu-pausa-guardado.md) aún no se ha publicado, incorpora estos campos; si ya se publicó, sube `format_version` antes de publicar. | Ida y vuelta conserva qué objetos son saqueables; no hay tirada al cargar; el esquema documenta los campos. |
| T-011 | Tests nuevos: tirada por objeto y determinista, 25 %/100 %, enemigo sin saqueables sin cadáver, cadáver con solo los saqueables, no saqueables desaparecen, cadáver vacío desaparece, cadáver de jugador intacto, saqueo desde el mismo tile y no desde adyacente, coste 0 para vivo, una acción por objeto para fantasma, cofre sin cambios, render/panel solo con contenedores, guardado sin retirada y no perturbación del RNG principal. | `pnpm run verify` pasa; los tests actuales de cadáveres se actualizan sin debilitar su intención. |
| T-012 | Se actualizan [REQ-017](REQ-017-feedback-visual-eventos.md), [REQ-018](REQ-018-inventario-equipo.md), [REQ-020](REQ-020-cofres-saqueo.md), [REQ-021](REQ-021-muerte-fantasma-resurreccion.md), [REQ-024](REQ-024-menu-pausa-guardado.md), [REQ-026](REQ-026-economia-acciones-rebalanceo.md), el [glosario](../glossary.md) y el alcance; se registra **ADR-030** del modelo de botín, la probabilidad y el RNG derivado. | `pnpm run docs:check` pasa; no queda el cadáver de enemigo como presentación universal ni el contenedor con apertura de 1 acción para cadáveres. |
| T-013 | Sin dependencias nuevas, sin red y sin DOM en el motor; TypeScript estricto; la tirada y el descarte son puros y serializables. | `package.json` y `pnpm-lock.yaml` no cambian; `src/game/` no importa `src/host/`; no hay llamadas de red. |

# Requisitos no funcionales

- **Rendimiento:** una tirada por objeto al crear cada enemigo; sin coste por
  frame. Los cadáveres y sus contenedores son pocos y se eliminan al vaciarse.
- **Accesibilidad:** el cadáver y su contenido se anuncian con texto; el coste
  «sin coste» o «1 acción» se lee en el panel; no se depende solo del color o del
  sprite.
- **Compatibilidad:** Chromium de escritorio como objetivo; Firefox y Safari
  recientes como deseables.
- **Seguridad:** sin datos personales, sin red y sin nuevas dependencias.
- **Mantenibilidad:** una única función de saqueabilidad, política en datos y un
  solo RNG de botín; la contención de instancias sigue siendo la fuente de
  verdad.
- **Balance:** 25 % es un valor provisional de
  [ADR-014](../decisions/ADR-014-balance-provisional-fuente-unica.md). Con dos
  objetos por enemigo actual, la probabilidad de que al menos uno caiga es
  ≈43,75 % y el botín esperado es 0,5 objetos por enemigo. El saqueo no cuesta
  acción: el coste real es el movimiento hasta el tile. Se mide en playtest y se
  ajusta por datos, no por reglas.

# Dependencias

- [REQ-018](REQ-018-inventario-equipo.md): instancias, equipo, mochila y panel
  con la columna Suelo.
- [REQ-020](REQ-020-cofres-saqueo.md): modelo de contenedor, transferencia,
  selección de cadáveres y límites del fantasma. Esta hoja enmienda su R-002 y
  R-008.
- [REQ-021](REQ-021-muerte-fantasma-resurreccion.md): cadáver de jugador,
  fantasma, resurrección y posición de la resurrección. Esta hoja enmienda su
  R-007.
- [REQ-024](REQ-024-menu-pausa-guardado.md): esquema de guardado; `lootable` y
  los contenedores de cadáver deben entrar antes de publicar la v1.
- [REQ-026](REQ-026-economia-acciones-rebalanceo.md): coste de apertura de
  contenedores; esta hoja separa cofre (1 acción) y cadáver (0).
- [REQ-017](REQ-017-feedback-visual-eventos.md): beat de muerte y presentación
  del cadáver; el cadáver de enemigo deja de ser universal.
- [REQ-019](REQ-019-traits-objetos.md): piezas futuras; no entran en el pool de
  este corte.
- [ADR-014](../decisions/ADR-014-balance-provisional-fuente-unica.md): valores
  provisionales de probabilidad y balance.
- **ADR-030** (se registra con la primera tarea de botín): modelo de
  saqueabilidad, probabilidad y RNG derivado.

# Enmiendas a documentos vigentes

- [REQ-017](REQ-017-feedback-visual-eventos.md): el cadáver persistente deja de
  ser universal; el de enemigo solo existe si tiene al menos un objeto saqueable.
- [REQ-020](REQ-020-cofres-saqueo.md): R-002 se limita a cadáveres de enemigo con
  objetos saqueables; R-008 separa cofre (adyacente, 1 acción) y cadáver (mismo
  tile, 0 acciones); el contenedor de cadáver se elimina al vaciarse.
- [REQ-021](REQ-021-muerte-fantasma-resurreccion.md): R-007 se concreta en mismo
  tile para saquear el cadáver de jugador, con coste 0 para el vivo y una acción
  por objeto para el fantasma; la resurrección sigue exigiendo adyacencia.
- [REQ-024](REQ-024-menu-pausa-guardado.md): el esquema v1 incluye `lootable` por
  instancia y contenedores de cadáver condicionados; cargar no vuelve a tirar.
- [REQ-026](REQ-026-economia-acciones-rebalanceo.md): la apertura de contenedores
  distingue cofre (1 acción) y cadáver (0); las transferencias siguen gratis.
- [REQ-018](REQ-018-inventario-equipo.md): el panel muestra coste 0 para cadáver
  y 1 acción para cofre; «coger todo» de cadáver no gasta acción ni MP.
- [Glosario](../glossary.md): «objeto saqueable» y «cadáver» actualizados.
- [Alcance](../scope.md): el saqueo de cadáveres de enemigo queda condicionado al
  botín; las llaves y objetos de progresión se reservan para su hoja.

# Fuera de alcance

- Tablas de botín ponderadas, rareza, tiradas múltiples y botín por nivel.
- Oro, consumibles, munición, monedas y objetos de misión jugables.
- Llaves, puertas cerradas y cofres cerrados: solo se reserva su regla de
  progresión al 100 %.
- Objetos nuevos de catálogo y las cuatro piezas de [REQ-019](REQ-019-traits-objetos.md).
- Animación de caída de objetos, identificación, rareza visible y anuncio de la
  probabilidad.
- Disarmar enemigos, hacer que suelten objetos antes de morir o transferir
  objetos entre enemigos.
- Cambiar el cadáver de jugador más allá de mismo tile y coste 0; su
  resurrección sigue en [REQ-021](REQ-021-muerte-fantasma-resurreccion.md).
- Cambiar los cofres, su adyacencia o su coste de apertura.
- Migración de formatos de guardado ya publicados; si la v1 no está publicada,
  los campos entran en ella.

# Preguntas abiertas

Ninguna. La regla queda cerrada en: probabilidad por objeto al crear al enemigo,
25 % común / 100 % progresión, pool del equipo actual, cadáver solo con botín,
saqueo desde el mismo tile sin coste y cadáver de jugador intacto. El valor 25 %
es provisional y se ajusta por datos con `ADR-014`, no es una decisión abierta.

# Decisiones

| Fecha | Decisión | Quién | Estado |
|---|---|---|---|
| 2026-11-14 | Hoja nueva para objetos saqueables y botín de enemigos; REQ-020 conserva cofres, contenedores y transferencia. | human:simon | aceptada |
| 2026-11-14 | La saqueabilidad se decide por objeto al crear al enemigo; los objetos en manos de jugador son siempre saqueables. | human:simon | aceptada |
| 2026-11-14 | 25 % para botín común y 100 % para objetos de progresión; la tirada es por objeto, no por enemigo. | human:simon | aceptada |
| 2026-11-14 | El equipo puesto del enemigo entra en la tirada; la probabilidad sustituye la regla anterior de «no se suelta». | human:simon | aceptada |
| 2026-11-14 | Pool inicial: solo el equipo actual de los tres enemigos; sin objetos nuevos, llaves ni piezas de REQ-019. | human:simon | aceptada |
| 2026-11-14 | Los objetos no saqueables desaparecen con el enemigo; el cadáver solo contiene saqueables. | human:simon | aceptada |
| 2026-11-14 | El cadáver de enemigo solo existe con botín y desaparece al vaciarse; el de jugador persiste y conserva todo. | human:simon | aceptada |
| 2026-11-14 | Saquear cadáver exige mismo tile y es gratis (0 acción, 0 MP); el fantasma mueve un objeto por acción; el cofre sigue adyacente y con 1 acción. | human:simon | aceptada |
| 2026-11-14 | Llaves y objetos de progresión siempre saqueables; no se admite probabilidad pura sin fuente alternativa. | human:simon | aceptada |
| 2026-11-14 | RNG de botín derivado y resultado guardado; cargar no vuelve a tirar. | human:simon | aceptada |

# Aceptación de la hoja

- [x] El usuario ha aprobado las decisiones creativas.
- [x] Los requisitos son verificables.
- [x] Las dependencias están claras.
- [x] El fuera de alcance está definido.
- [x] No hay contradicciones abiertas.
- [x] Se puede generar un grafo de tareas.
- [x] El usuario ha revisado el texto y la hoja queda `stable`.

# Notas de vigencia

- **v1 (2026-11-14):** primera versión. Define la saqueabilidad por instancia, la
  tirada al crear al enemigo (25 % común / 100 % progresión), el cadáver
  condicionado al botín, el saqueo desde el mismo tile sin coste y las enmiendas
  a REQ-017, REQ-018, REQ-020, REQ-021, REQ-024 y REQ-026. Revisada por el
  usuario; queda `stable`.
