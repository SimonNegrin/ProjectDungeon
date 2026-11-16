---
type: Requirement Sheet
id: REQ-020
title: Cofres, cadáveres saqueables y transferencia de objetos
description: "Cofres como contenedores del mundo con botín determinista y creciente, apertura con una acción, depósito y transferencia desde el panel. El cadáver saqueable ya vive en REQ-034."
status: stable
version: 5
decision_owner: human:simon
review_required: true
created_at: 2026-11-10T20:00:00Z
updated_at: 2026-11-16T16:20:04Z
related_tasks: [TASK-0167, TASK-0168, TASK-0169, TASK-0170, TASK-0171, TASK-0172]
related_requirements: [REQ-017, REQ-018, REQ-019, REQ-021, REQ-023, REQ-031, REQ-034]
related_decisions: [ADR-024, ADR-030, ADR-033]
generated: { by: deepseek/v4.1-flash, at: 2026-11-10T20:00:00Z }
verified:
---

# Contexto

El juego ya tiene objetos en el suelo, equipo con traits ([REQ-019](REQ-019-traits-objetos.md))
y cadáveres saqueables de enemigo ([REQ-034](REQ-034-objetos-saqueables-botin-enemigos.md)).
Falta lo que convierte el bucle en una decisión de equipo: **cofres** con botín
propio, depósito y una curva de mejora ligada a lo que el grupo lleva encima.

Dos hechos del estado actual condicionan la hoja:

- El motor ya tiene `Container` genérico (capacidad, instancias, `kind` y
  `corpseOf`), tomas atómicas desde contenedor e inspección del fantasma. No hay
  cofres generados, ni depósito, ni «coger todo».
- Las cuatro piezas de traits de REQ-019 existen en el catálogo pero **no tienen
  fuente jugable**, así que el ataque circular no se puede playtestear.

El corte está pensado para mazmorras encadenadas: el botín mejora a medida que la
partida avanza, con la profundidad como parámetro reservado.

# Enmienda a documentos vigentes

- [REQ-017](REQ-017-feedback-visual-eventos.md): el cadáver ya no es solo
  presentación; `REQ-034` lo convirtió en contenedor. Esta hoja añade eventos de
  apertura y transferencia a la matriz de feedback.
- [Alcance vigente](../scope.md): los cofres pasan de «fuera de alcance» a
  implementación de este corte.
- [REQ-034](REQ-034-objetos-saqueables-botin-enemigos.md) v1: el cadáver de
  enemigo solo existe con botín, se saquea en el mismo tile sin coste y se retira
  al vaciarse. Esta hoja **no cambia** esas reglas.
- [REQ-021](REQ-021-muerte-fantasma-resurreccion.md): el fantasma inspecciona
  cofres sin abrirlos y mueve un objeto por acción; el cadáver de jugador se
  consume al resucitar y no se rige por esta hoja.
- [REQ-019](REQ-019-traits-objetos.md): sus cuatro piezas pasan a entrar por
  cofres como botín especial, sin cambiar sus traits.

# Objetivos de experiencia

- Que explorar tenga recompensa creciente: llevar mejor equipo al avanzar.
- Que abrir un cofre sea una decisión de coste (una acción y una posición).
- Que saquear sea rápido: ver, coger, depositar, sin pelear con la interfaz.
- Que el jugador pueda distinguir cuándo un objeto mejora lo que lleva.
- Que el botín sea reproducible por semilla y medible.

# Requisitos creativos (decididos)

| ID | Requisito | Aceptación |
|---|---|---|
| R-001 | Cada **sala no-spawn** tira 50 % de tener cofre; si acierta, un segundo 20 % de un cofre extra en la misma sala. Nunca en el acceso de spawn ni en la salida. | Un nivel de 5 salas produce 0-2 cofres por sala elegible; dos cofres nunca comparten tile; con la misma semilla se repite. |
| R-002 | Si el nivel no genera ningún cofre, se **fuerza uno** por semilla en una sala no-spawn, para que siempre haya fuente de botín especial. | Un nivel con tiradas fallidas tiene al menos un cofre y al menos una pieza de traits. |
| R-003 | Abrir un cofre exige estar **adyacente**, cuesta **1 acción** y es **silencioso**: sin llave, trampa, tirada ni alarma. Un cofre abierto permanece abierto y, vacío, sigue en el mundo como mueble. | Abrir gasta exactamente 1 acción; no se puede abrir a distancia; ningún enemigo se alerta; reabrirlo no cuesta. |
| R-004 | El botín es **determinista por semilla** y se genera con un RNG derivado propio; no consume el RNG de combate y cargar no vuelve a tirar. | Misma semilla y mismas acciones dan el mismo contenido; el combate con la misma semilla no cambia. |
| R-005 | El contenido se orienta a **mejorar el equipo del grupo**: cada cofre lleva 2 objetos, uno que busca mejora real y otro de relleno común. | Con equipo inicial, el cofre ofrece al menos un objeto con puntuación superior en su hueco mientras exista en el catálogo. |
| R-006 | La mejora se mide con una **puntuación determinista** por objeto: acierto + daño total + absorción + evasión + suma del poder declarado de sus traits, con signo. La comparación es por hueco contra el mejor objeto equipado del grupo; un hueco vacío admite mejora. | La misma pareja objeto-equipo da siempre la misma decisión; el anillo y el collar no compiten con un arma. |
| R-007 | El botín es **del grupo y sin garantía por jugador**: no se asegura que cada personaje mejore en cada nivel. | Con 6 jugadores no se generan 6 mejoras; el reparto no depende del número de cofres por jugador. |
| R-008 | **Una pieza de traits por nivel** llega garantizada y fuera de la curva, con cantidad configurable para el futuro. | Cada nivel entrega una de las cuatro piezas; el parámetro puede subir sin tocar código. |
| R-009 | Los objetos con **traits negativos** pueden salir si su puntuación neta supera el umbral; el trait se ve antes de equipar ([REQ-019](REQ-019-traits-objetos.md)). | Un maldito con potencia real aparece; uno con puntuación hundida no se ofrece como mejora. |
| R-010 | Transferir es **gratis** una vez abierto el cofre: coger, depositar y «coger todo», este último **atómico** (si no cabe todo, no se mueve nada). El cofre tiene **4 huecos** fijos. | Coger y depositar no gastan acción ni MP; con 3 objetos y 2 huecos libres, «coger todo» se rechaza entero. |
| R-011 | La interfaz del contenedor usa la **columna derecha del panel**: `I` la abre en «Suelo» (suelo y cadáveres del tile) y abrir un cofre la abre en «Cofre». Es **una sola fuente por panel**: con «Cofre» abierto no se ven los cadáveres del tile. | Las dos vistas no se mezclan; cerrar y pulsar `I` devuelve a «Suelo»; con el panel cerrado el HUD derecho sigue al cursor y un cofre cerrado no revela contenido. |
| R-012 | Abrir y transferir no alertan enemigos. Cada apertura y cada transferencia produce feedback; no hay sonido ni animación nueva. | Ningún evento de alarma se dispara por saquear; cada transferencia se confirma en pantalla. |

# Requisitos técnicos

| ID | Requisito | Aceptación |
|---|---|---|
| T-001 | `Container` se amplía con estado de apertura y capacidad 4 para cofres; el tipo `chest` deja de ser un fixture de prueba. El modelo sigue siendo serializable y único. | El snapshot expone cofres, estado y contenido; no hay una segunda estructura de contenedores. |
| T-002 | El **poder de cada trait** es dato en el catálogo de traits, con signo; la validación rechaza un trait sin poder y un objeto con un trait desconocido. | El catálogo cambia la puntuación sin tocar código; `docs:check` y los tests del catálogo lo comprueban. |
| T-003 | `powerScore(item)` es una función pura, determinista y sin estado: acierto + daño total + absorción + evasión + Σ poder de traits. | Tests de tabla: los 13 objetos tienen puntuación estable; dos llamadas dan el mismo número. |
| T-004 | La generación de cofres es determinista desde semilla, profundidad y equipo del grupo: elige salas, posición en tile libre no bloqueante, contenido y pieza especial con un RNG derivado. | Misma semilla produce los mismos cofres, posiciones y contenido; ninguna casilla de muro, spawn, salida u ocupada. |
| T-005 | La apertura es un comando del motor con coste 1 acción, adyacencia (Chebyshev 1) y rechazo atómico si no se cumple; reabrir un cofre abierto es gratis. El fantasma no abre (REQ-021) pero inspecciona. | Tests de costo, adyacencia, reapertura y rechazo sin cambios parciales. |
| T-006 | Coger, depositar y «coger todo» son operaciones atómicas que validan capacidad, localización y tipo de contenedor antes de mover. El depósito solo se acepta en cofres. | Invariantes: no se duplica, no se pierde, no se supera la capacidad; un cadáver no acepta depósitos. |
| T-007 | El host abre el cofre con `Espacio`/`Enter` sobre el cursor cuando es adyacente y hay acciones; el panel muestra «Cofre», conserva la navegación por zonas y el HUD derecho sigue al cursor. | E2E: abrir con teclado, ver contenido, coger, depositar, coger todo y volver a «Suelo». |
| T-008 | Cofres, estado de apertura y contenido entran en el guardado v1 sin repetir tiradas. | Guardar y cargar conserva cofres abiertos, contenido y posiciones; no se regenera nada. |
| T-009 | Se añaden eventos de apertura y transferencia a la matriz de [REQ-017](REQ-017-feedback-visual-eventos.md) con su beat y sin bloquear el input más allá del beat. | La matriz tiene filas nuevas; E2E comprueba el feedback sin retrasos acumulados. |
| T-010 | Tests nuevos: puntuación, umbral por hueco, pieza garantizada, 50/20, forzado, apertura, depósito, coger todo atómico, capacidad, guardado y E2E de las dos vistas del panel. | `pnpm run verify` pasa; los tests de REQ-018, REQ-034 y REQ-021 conservan su intención. |

# Requisitos no funcionales

- **Rendimiento:** la generación ocurre al crear la partida; abrir y transferir no
  deben costar más que un repintado.
- **Accesibilidad:** contenido, coste y origen se explican con texto; nada depende
  solo de iconos o color.
- **Compatibilidad:** Chromium de escritorio; Firefox y Safari recientes deseables.
- **Seguridad:** sin red, sin datos personales y sin dependencias nuevas.
- **Mantenibilidad:** catálogo y poderes como datos; una sola función de
  puntuación y una sola de generación; ninguna regla de botín en el host.

# Dependencias

- [REQ-018](REQ-018-inventario-equipo.md): instancias, mochila, huecos y
  operaciones atómicas; el cofre reutiliza el modelo.
- [REQ-019](REQ-019-traits-objetos.md): traits, sus efectos y las cuatro piezas
  que esta hoja pone en circulación.
- [REQ-034](REQ-034-objetos-saqueables-botin-enemigos.md): cadáver como
  contenedor y política de botín de enemigos.
- [REQ-021](REQ-021-muerte-fantasma-resurreccion.md): inspección del fantasma y
  coste por objeto.
- [REQ-023](REQ-023-hud-derecho-detalle-cursor.md): detalle bajo el cursor para
  un cofre cerrado.
- [REQ-031](REQ-031-hotseat-local.md): panel solo en el turno activo y botín
  público.
- [ADR-014](../decisions/ADR-014-balance-provisional-fuente-unica.md): valores en
  catálogos.
- [ADR-030](../decisions/ADR-030-saqueabilidad-botin-enemigos.md): RNG derivado y
  botín guardado.
- [ADR-033](../decisions/ADR-033-cofres-poder-botin-progresivo.md): puntuación,
  curva y generación de cofres.

# Fuera de alcance

- Cofres cerrados con llave, trampas, puzzles y objetos de progresión.
- Comercio, trueque, crafting y moneda.
- Depósito en cadáveres y objetos que se pierden al vaciar un cadáver.
- IA enemiga que abra o saquea contenedores.
- Traits de estado (envenenado, congelado y similares) y objetos que los apliquen.
- Ampliación del catálogo de objetos; el ajuste de la curva espera a contenido.
- Encadenado funcional de mazmorras: la profundidad se reserva como parámetro.
- Arte definitivo del cofre y sonido.

# Preguntas abiertas

Ninguna. Lo que queda es ajuste en playtest: 50/20 %, 2 objetos por cofre, 4
huecos y los poderes provisionales de los traits. Se ajustan con datos, no
reabren la hoja.

# Decisiones

| Fecha | Decisión | Quién | Estado |
|---|---|---|---|
| 2026-11-10 | Los cofres y los cadáveres son contenedores con inventario propio. | human:simon | aceptada |
| 2026-11-10 | La transferencia de objetos entre inventario y contenedor entra en el alcance. | human:simon | aceptada |
| 2026-11-10 | Los cadáveres del suelo son saqueables; la hoja enmienda `REQ-017` y `scope.md`. | human:simon | aceptada; aplicada por REQ-034 |
| 2026-11-10 | Hoja separada de inventario y traits; no define huecos ni efectos. | human:simon | aceptada |
| 2026-11-10 | Definir después de `REQ-018` y `REQ-019`; aplicar después de `REQ-018` y antes de `REQ-019`. | human:simon | aceptada |
| 2026-11-11 | Abrir/registrar un cofre o cadáver cuesta 1 acción y requiere adyacencia; transferir es gratis y se permite «coger todo». | human:simon | aceptada |
| 2026-11-13 | Varios cadáveres pueden compartir casilla y no bloquean el paso; la interacción elige uno explícitamente. La resurrección apuntará a una **unidad**. | human:simon | aceptada; aplicada a REQ-021 el 2026-11-15 |
| 2026-11-16 | El cadáver de jugador se consume al resucitar (REQ-021 R-014); la persistencia tras vaciarse solo vale para cadáveres de enemigo. | human:simon | aceptada |
| 2026-11-16 | Política de botín de cadáveres: cerrada por REQ-034 v1; esta hoja no la reabre. | human:simon | aceptada |
| 2026-11-16 | Cofres: 50 % por sala no-spawn y 20 % de un segundo cofre en la misma sala; si no sale ninguno, se fuerza uno. | human:simon | aceptada |
| 2026-11-16 | Contenido orientado a mejorar el equipo del grupo con una puntuación determinista por objeto; botín de grupo sin garantía por jugador. | human:simon | aceptada |
| 2026-11-16 | Catálogo actual de 13 objetos con orden de poder; la ampliación es contenido futuro. | human:simon | aceptada |
| 2026-11-16 | Cofre abierto con 1 acción, sin llave, trampa ni tirada, y silencioso. | human:simon | aceptada |
| 2026-11-16 | Una pieza de traits garantizada por nivel, fuera de la curva y configurable. | human:simon | aceptada |
| 2026-11-16 | Cofre de 4 huecos fijos; depósito gratis; «coger todo» atómico. | human:simon | aceptada |
| 2026-11-16 | Panel: `I` abre «Suelo»; abrir un cofre abre «Cofre»; una sola fuente por panel; el HUD derecho sigue al cursor. | human:simon | aceptada |
| 2026-11-16 | El poder de cada trait se declara con signo; los objetos malditos entran en el botín con su puntuación neta. | human:simon | aceptada |
| 2026-11-16 | Los traits de estado quedan fuera de este corte. | human:simon | aceptada |
| 2026-11-16 | El calendario de implementación queda resuelto: va ahora, sin esperar a nada. | human:simon | aceptada |
| 2026-11-16 | Playtest del hito de cofres superado sin defectos ni cambios: colocación 50/20, contenido orientado al grupo, apertura, transferencia, 4 huecos y panel se mantienen. | human:simon | aceptada |

# Aceptación de la hoja

- [x] El usuario ha aprobado el coste y el alcance de la interacción.
- [x] El usuario ha aprobado la política de botín de cadáveres (REQ-034 v1).
- [x] El usuario ha aprobado el contenido y la colocación de cofres.
- [x] El usuario ha aprobado la capacidad y la bolsa compartida (4 huecos, depósito).
- [x] El usuario ha decidido que no hay cofres cerrados, trampas ni llaves.
- [x] El usuario ha aprobado el ciclo de vida del cofre y del cadáver.
- [x] El usuario ha aprobado la UI de transferencia.
- [x] Los requisitos son verificables.
- [x] Las dependencias están claras.
- [x] Se puede generar un grafo de tareas.
