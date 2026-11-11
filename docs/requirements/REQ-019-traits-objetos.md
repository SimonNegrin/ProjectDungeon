---
type: Requirement Sheet
id: REQ-019
title: Traits de objetos equipados
description: "Sistema de traits que los objetos equipados aportan al portador: modificadores de stats y efectos especiales como cuerpo etéreo, robo de vida y ataque de área. Borrador: quedan preguntas abiertas."
status: draft
version: 1
decision_owner: human:simon
review_required: true
created_at: 2026-11-10T20:00:00Z
updated_at: 2026-11-10T20:00:00Z
related_tasks: []
generated: { by: deepseek/v4.1-flash, at: 2026-11-10T20:00:00Z }
verified:
---

# Contexto

El equipo de [REQ-010](REQ-010-combate-equipo-acierto-defensa.md) solo aporta
números: acierto, daño, escudo y armadura. [REQ-014](REQ-014-atributos-inherentes-personajes.md)
fijó nueve atributos y [REQ-018](REQ-018-inventario-equipo.md) reserva los huecos
y el campo de traits en el objeto. Falta definir **qué hacen** esos traits.

El usuario quiere dos familias:

- **Modificadores de stats:** incremento o decremento de los nueve atributos,
  incluidas las acciones por turno (con el tope de `REQ-026`).
- **Efectos especiales:** cuerpo etéreo (atravesar paredes), robo de vida (curar
  al portador el daño infligido) y ataque de área.

Esta hoja define el sistema de traits: vocabulario, fuentes, stacking,
disparadores y el diseño de los tres especiales. No define el inventario ni los
huecos (`REQ-018`) ni los cofres y el saqueo (`REQ-020`).

Es un **borrador**: recoge lo decidido y deja abiertas las decisiones que faltan
para cerrarla.

# Objetivos de experiencia

- Que un objeto se sienta especial por lo que hace, no solo por sus números.
- Que los traits se entiendan y se puedan leer antes de equipar.
- Que los especiales abran tácticas nuevas sin convertir el juego en excepciones.
- Que el jugador pueda combinar traits y notar la sinergia, por ejemplo área con
  robo de vida.
- Que el balance sea medible y reproducible por semilla.

# Requisitos creativos (decididos)

| ID | Requisito | Aceptación |
|---|---|---|
| R-001 | Un objeto equipado puede aportar uno o varios traits a su portador. | El objeto declara traits; al equiparlo, el portador los recibe; al desequiparlo, desaparecen. Un objeto en el inventario no aporta traits. |
| R-002 | Un trait puede incrementar o decrementar stats del portador. | Aplicar y quitar el objeto cambia los stats efectivos en la cantidad indicada. |
| R-003 | El diseño debe cubrir al menos tres traits especiales: cuerpo etéreo, robo de vida y ataque de área. | Los tres tienen definición, disparador y efecto en esta hoja o en un anexo. |
| R-004 | Los traits se muestran al jugador con nombre, descripción y efecto. | La UI de inventario/personaje permite leer el trait antes de equipar. |
| R-005 | Los traits especiales producen feedback visual y de texto. | Cada trait genera un evento legible; no depende solo de una animación o de un color. |
| R-006 | El jugador puede entender por qué un stat tiene el valor que tiene. | La ficha de personaje desglosa inherente, equipo y traits; no muestra solo el total. |

# Decisiones de contenido pendientes

Estas decisiones afectan a la sensación de juego y no están cerradas. Se dejan
como preguntas para la sesión de cierre.

- **Qué especiales entran en el primer corte:** los tres o solo algunos.
- **Semántica de cuerpo etéreo:** dónde puede terminar el turno, qué ve, qué
  ataca y qué pasa al desequipar dentro de un muro.
- **Semántica de robo de vida:** por golpe o por muerte, overkill, tope y
  enemigos.
- **Semántica de ataque de área:** forma, alcance, fuego amigo, tiradas y coste.
- **Stacking y topes:** suma, máximo, único, stats negativos y límites.
- **Traits negativos o malditos:** si entran y cómo se comunican.

# Requisitos técnicos

| ID | Requisito | Aceptación |
|---|---|---|
| T-001 | El catálogo de traits es dato, no código: ID estable, nombre, descripción, tipo (modificador, disparado o continuo), parámetros, clave de stacking y fuente. | Cambiar un trait del catálogo cambia el juego sin tocar el motor; los IDs son estables. |
| T-002 | El modelo admite traits de varias fuentes: inherente, equipo y temporal. El primer corte solo los usa en objetos equipados. | La fuente forma parte del dato; el contenido inicial no necesita traits inherentes ni temporales. |
| T-003 | El stacking es explícito y determinista: suma, máximo o único; orden de aplicación estable; topes y suelos definidos. | Dos fuentes del mismo trait producen un resultado predecible y testeable; el orden no depende del orden de iteración del host. |
| T-004 | Hay un pipeline de disparadores: equipar/desequipar, impacto, daño infligido, muerte, movimiento y inicio/fin de turno. | Cada trait declara sus disparadores; el motor los emite de forma determinista y sin DOM. |
| T-005 | Los stats efectivos incluyen los traits y se calculan en un único punto, junto al equipo de `REQ-018`. | Combate, movimiento y UI leen el mismo valor; no hay sumas paralelas. |
| T-006 | Cuerpo etéreo se integra con pathfinding, colisión, ocupación, línea de visión y generación de mapa. | El motor representa el estado etéreo y resuelve los casos límite decididos; no hay atravesar muros por accidente. |
| T-007 | Robo de vida se integra en el resultado de combate: el daño infligido genera una curación acotada y un evento de feedback. | La curación no supera los PV máximos, no es negativa y queda en el resultado del ataque. |
| T-008 | Ataque de área se integra como una acción de ataque con objetivos múltiples: selección, resolución por objetivo, fuego amigo y coste según la decisión. | El resultado enumera los objetivos y sus tiradas; el orden es determinista; el feedback muestra cada impacto. |
| T-009 | Serialización y debug: el snapshot expone traits activos, fuente, stats efectivos y eventos de trait. | Se puede reproducir una partida y explicar cada modificación desde el snapshot. |
| T-010 | Tests nuevos: stacking, topes, orden de disparadores, cuerpo etéreo, robo de vida, área, sinergias y no regresión de `REQ-006`, `REQ-009`, `REQ-010` y `REQ-017`. | `pnpm run verify` pasa; los tests existentes conservan su intención. |
| T-011 | Se actualizan glosario, [economía de turno](../design/turn-economy.md) y arquitectura; se registra un ADR de traits y pipeline de efectos. Si la sensación de un especial no se decide hablando, se propone un experimento interactivo. | `pnpm run docs:check` pasa; el ADR existe y está enlazado; hay decisión o experimento para cada especial. |
| T-012 | Sin dependencias nuevas, sin red y sin arte final. | `package.json` y `pnpm-lock.yaml` no cambian; el motor sigue sin DOM. |

# Requisitos no funcionales

- **Rendimiento:** un ataque de área puede resolver varios objetivos; el coste
  debe medirse y mantenerse dentro del objetivo de 60 fps.
- **Accesibilidad:** los traits se explican con texto; el feedback no depende
  solo de iconos, colores o animaciones.
- **Compatibilidad:** Chromium de escritorio como objetivo; Firefox y Safari
  recientes como deseables.
- **Seguridad:** sin datos personales, sin red y sin nuevas dependencias.
- **Mantenibilidad:** catálogo de traits, pipeline único de disparadores y un
  punto de agregación de stats; los traits no se implementan como casos
  especiales dispersos por el motor.

# Dependencias

- [REQ-018](REQ-018-inventario-equipo.md): huecos de equipo, campo de traits en el
  objeto y agregación de stats; esta hoja los consume.
- [REQ-014](REQ-014-atributos-inherentes-personajes.md): nueve atributos y capa de
  absorción sobre la que actúan los modificadores.
- [REQ-010](REQ-010-combate-equipo-acierto-defensa.md): resolvedor de combate,
  armas y equipo; robo de vida y área lo extienden.
- [REQ-009](REQ-009-percepcion-alarma-huida.md): línea de visión y percepción;
  cuerpo etéreo puede alterarlas.
- [REQ-006](REQ-006-movimiento-animado.md): movimiento animado y cámara; cuerpo
  etéreo puede alterar el pathfinding y la presentación.
- [REQ-017](REQ-017-feedback-visual-eventos.md): feedback de eventos; los traits
  especiales necesitan eventos y presentación.
- [ADR-012](../decisions/ADR-012-combate-equipo-rng.md): combate con equipo y RNG
  sembrado.
- [ADR-015](../decisions/ADR-015-atributos-inherentes-absorcion.md): esquema de
  atributos.
- **Secuencia:** esta hoja se define después de `REQ-018` y antes de `REQ-020`,
  pero se aplica después de `REQ-020`.

# Fuera de alcance

- El catálogo completo de traits y el contenido de cada objeto; esta hoja define
  el sistema y un primer conjunto.
- Magia, hechizos, ataques a distancia y estados alterados más allá de los tres
  especiales.
- Crafting, reroll de traits, mejora de objetos y desbloqueos.
- Traits de enemigos como contenido jugable; el modelo puede admitirlos, pero no
  se implementan en este corte salvo decisión contraria.
- Hotseat, red, persistencia y guardado.
- Arte final.

# Preguntas abiertas

1. **Qué especiales entran en el primer corte.** ¿Los tres a la vez, o primero
   modificadores de stats y uno solo? La propuesta es empezar por modificadores
   y robo de vida para validar el pipeline de disparadores, después área y dejar
   cuerpo etéreo para un corte posterior por su impacto en movimiento, visión y
   mapa.
2. **Cuerpo etéreo.** ¿Puede terminar el turno dentro de un muro? ¿Los enemigos
   lo ven a través de muros? ¿Puede atacar a través? ¿Puede ser atacado? ¿Qué
   pasa si se desequipa el objeto dentro de un muro? ¿Cuesta MP atravesar? ¿Cómo
   interactúa con puertas, ocupación y generación de mapa?
3. **Robo de vida.** ¿Cura por cada impacto o solo al matar? ¿El overkill cuenta?
   ¿Se cura el daño bruto o el daño efectivo? ¿Puede sobrecurar? ¿Lo tienen los
   enemigos? ¿Se combina con área por objetivo?
4. **Ataque de área.** ¿Qué forma tiene (adyacentes, cono, radio)? ¿Qué alcance?
   ¿Fuego amigo? ¿Una tirada por objetivo o una tirada global? ¿Usa el acierto y
   daño del arma? ¿Cuesta acción, MP o ambos? ¿Cómo se presenta?
5. **Stacking y topes.** ¿Los modificadores se suman? ¿Dos objetos con el mismo
   trait se acumulan o solo cuenta el mayor? ¿Hay tope por stat? ¿Puede un stat
   bajar de 0? ¿Un trait negativo puede dejar a un personaje sin ataque?
6. **Traits negativos o malditos.** ¿Entran en el primer corte? ¿Se conocen al
   equipar o se descubren? ¿Se pueden quitar?
7. **Fuentes y enemigos.** ¿Los traits son solo de objetos o también inherentes
   a personajes y enemigos? ¿Un enemigo puede tener cuerpo etéreo o robo de vida?
8. **Visibilidad.** ¿El jugador ve todos los traits de un objeto desde el
   principio o hay identificación? La propuesta es verlos siempre en este corte.
9. **Balance.** ¿Qué método se usa para medir el impacto de un trait? ¿Se amplía
   el banco de pruebas de `EXP-003` o se crea un experimento nuevo?
10. **Calendario.** Se propuso implementar después de cerrar hotseat, pero
    hotseat aún no tiene hoja ni tareas. Confirmar el orden cuando exista.

# Decisiones

| Fecha | Decisión | Quién | Estado |
|---|---|---|---|
| 2026-11-10 | Los traits los aportan los objetos equipados y pueden incrementar o decrementar stats. | human:simon | aceptada |
| 2026-11-10 | Los especiales a definir son cuerpo etéreo, robo de vida y ataque de área. | human:simon | aceptada |
| 2026-11-10 | Hoja separada de inventario y de cofres; no define huecos ni contenedores. | human:simon | aceptada |
| 2026-11-10 | Definir después de `REQ-018` y antes de `REQ-020`; aplicar después de `REQ-020`. | human:simon | aceptada |
| 2026-11-10 | Implementación después de cerrar hotseat. | human:simon | provisional; hotseat aún no tiene hoja ni tareas |

# Aceptación de la hoja

- [ ] El usuario ha decidido qué especiales entran en el primer corte.
- [ ] El usuario ha aprobado la semántica de cuerpo etéreo.
- [ ] El usuario ha aprobado la semántica de robo de vida.
- [ ] El usuario ha aprobado la semántica de ataque de área.
- [ ] El usuario ha aprobado el stacking y los topes.
- [ ] El usuario ha decidido si hay traits negativos o malditos.
- [ ] El usuario ha decidido si los enemigos usan traits.
- [ ] Los requisitos son verificables.
- [ ] Las dependencias están claras.
- [ ] Se puede generar un grafo de tareas.
