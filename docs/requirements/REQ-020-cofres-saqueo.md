---
type: Requirement Sheet
id: REQ-020
title: Cofres, cadáveres saqueables y transferencia de objetos
description: "Contenedores con inventario propio, cofres y cadáveres saqueables, y transferencia de objetos entre inventario y contenedor. Borrador: quedan preguntas abiertas."
status: draft
version: 3
decision_owner: human:simon
review_required: true
created_at: 2026-11-10T20:00:00Z
updated_at: 2026-11-13T19:34:25Z
related_tasks: []
generated: { by: deepseek/v4.1-flash, at: 2026-11-10T20:00:00Z }
verified:
---

# Contexto

El juego ya tiene objetos en el suelo de [REQ-010](REQ-010-combate-equipo-acierto-defensa.md)
y cadáveres de presentación de [REQ-017](REQ-017-feedback-visual-eventos.md).
El usuario quiere cofres y que los cadáveres del suelo también sean cofres
saqueables. Eso convierte los contenedores en parte del bucle: explorar, abrir,
saquear y decidir qué llevar.

Esta hoja define los cofres, los cadáveres saqueables y la transferencia entre
inventario y contenedor. No define el inventario ni los huecos
([REQ-018](REQ-018-inventario-equipo.md)) ni los traits
([REQ-019](REQ-019-traits-objetos.md)).

Es un **borrador**: recoge lo decidido y deja abiertas las decisiones que faltan
para cerrarla.

# Enmienda a documentos vigentes

- [REQ-017](REQ-017-feedback-visual-eventos.md) define el cadáver como
  persistente pero **solo presentación**. Esta hoja lo convierte en contenedor
  saqueable.
- [Alcance vigente](../scope.md) incluye el saqueo de cadáveres en «fuera de
  alcance ahora». Esta hoja lo trae al alcance cuando se apruebe.
- [REQ-021](REQ-021-muerte-fantasma-resurreccion.md) define el cadáver de jugador,
  el fantasma y la resurrección. Esta hoja se limita a cofres y cadáveres de
  enemigos.

Ambas actualizaciones se harán al cerrar la hoja, no antes.

# Objetivos de experiencia

- Que explorar tenga recompensa y decisión: qué me llevo y qué dejo.
- Que saquear un cadáver sea rápido y legible.
- Que el cofre se sienta como un objeto del mundo, no como un menú abstracto.
- Que la transferencia no sea una pelea con la interfaz.
- Que el botín sea reproducible por semilla y no rompa el balance.

# Requisitos creativos (decididos)

| ID | Requisito | Aceptación |
|---|---|---|
| R-001 | Los cofres son contenedores con inventario propio; se pueden abrir y saquear. | Un cofre tiene contenido y estado; abrirlo muestra sus objetos y permite transferirlos. |
| R-002 | Los cadáveres de enemigos son contenedores saqueables y persisten en el mundo. | Al morir un enemigo queda un cadáver con contenido; se puede saquear. |
| R-003 | Se pueden transferir objetos entre el inventario personal y el contenedor: coger, depositar e intercambiar. | Las operaciones mueven objetos sin duplicarlos ni perderlos. |
| R-004 | El saqueo debe ser rápido y legible: el jugador ve qué hay y decide sin ambigüedad. | La UI muestra contenido, origen y destino; el feedback confirma cada transferencia. |
| R-005 | El botín es determinista por semilla. | Misma semilla y mismas acciones producen el mismo contenido. |
| R-006 | El saqueo de cadáveres enmienda `REQ-017` y el alcance vigente. | Al aprobar la hoja, `REQ-017` y `scope.md` dejan de decir que el cadáver es solo presentación. |
| R-007 | El botín no rompe el balance provisional sin una decisión explícita. | La política de drop se define antes de implementar; si el enemigo suelta su equipo, se mide el impacto con el método de `ADR-014`. |
| R-008 | Abrir o registrar un cofre/cadáver cuesta **1 acción** y requiere adyacencia; una vez abierto, transferir objetos es **gratis** (sin acción ni MP), limitado por capacidad, con «coger todo». El fantasma no abre cofres y mueve un objeto por acción (`REQ-021`). | Abrir y coger todo consume 1 acción; las transferencias no consumen más; el fantasma inspecciona sin abrir. |

# Decisiones de contenido pendientes

Estas decisiones afectan a la sensación de juego y no están cerradas. Se dejan
como preguntas para la sesión de cierre.

- **Política de botín de cadáveres:** equipo del enemigo, botín fijo, tabla
  aleatoria o nada.
- **Contenido y colocación de cofres:** cuántos por nivel, en qué salas y con qué
  tablas.
- **Capacidad del contenedor y bolsa compartida.**
- **Cofres cerrados, trampas y llaves.**
- **Ciclo de vida del cadáver:** cuánto dura y si se vacía; ya está decidido que
  no bloquea y que varios pueden compartir casilla.

# Requisitos técnicos

| ID | Requisito | Aceptación |
|---|---|---|
| T-001 | Un contenedor es una entidad con ID, tipo (cofre o cadáver), posición, inventario propio, estado (cerrado, abierto, vacío) y origen del botín. | El snapshot expone contenedores y su contenido; el modelo es serializable. |
| T-002 | El cadáver es una entidad del mundo, no solo presentación: se crea al morir un enemigo, persiste y guarda su botín. La presentación sigue siendo responsabilidad del host. | El motor conoce el cadáver y su contenido; el host lo dibuja sin decidir el botín. |
| T-003 | Las transferencias son atómicas: coger, depositar, intercambiar y coger todo validan capacidad y localización antes de mover; si fallan, no dejan cambios parciales. | Tests de invariantes: no se duplica, no se pierde y no se supera la capacidad. |
| T-004 | El botín se genera de forma determinista desde la semilla y tablas de datos; no se usa `Math.random`. | Misma semilla y mismas acciones dan el mismo contenido; las tablas son la única fuente. |
| T-005 | La interacción con el contenedor se integra en el turno: abrir/registrar cuesta 1 acción y exige adyacencia; transferir es gratis y atómico; la IA enemiga no saquea en este corte. | Abrir y transferir respetan la economía de turno; los enemigos no alteran contenedores. |
| T-006 | El host presenta el contenedor junto al inventario, con iconos, cantidades, origen/destino y feedback; el input permite transferir solo con teclado. | La UI coincide con el estado; el jugador entiende qué se mueve y a dónde. |
| T-007 | El estado de contenedores y cadáveres sobrevive dentro de la partida y se expone en el snapshot de debug. | Reiniciar la partida reconstruye el estado; el snapshot permite inspeccionar el contenido. |
| T-008 | Tests nuevos: apertura con acción, transferencia gratuita, coger todo, capacidad, intercambio, cadáver al morir, persistencia, determinismo del botín, contenedor vacío y E2E de la UI. | `pnpm run verify` pasa; los tests de `REQ-010` y `REQ-017` conservan su intención. |
| T-009 | Se actualizan glosario, [economía de turno](../design/turn-economy.md) y arquitectura; se registra un ADR de contenedores y saqueo; se enmiendan `REQ-017` y `scope.md`. | `pnpm run docs:check` pasa; no quedan contradicciones sobre el cadáver como solo presentación. |
| T-010 | Sin dependencias nuevas, sin red y sin arte final. | `package.json` y `pnpm-lock.yaml` no cambian; el motor sigue sin DOM. |

# Requisitos no funcionales

- **Rendimiento:** puede haber varios cadáveres y cofres por nivel; el coste de
  abrir y transferir debe ser despreciable frente al render.
- **Accesibilidad:** el contenido y las transferencias se explican con texto; no
  dependen solo de iconos o colores.
- **Compatibilidad:** Chromium de escritorio como objetivo; Firefox y Safari
  recientes como deseables.
- **Seguridad:** sin datos personales, sin red y sin nuevas dependencias.
- **Mantenibilidad:** un modelo de contenedor reutilizado por cofres y cadáveres;
  tablas de botín como datos; ninguna lógica de botín en el host.

# Dependencias

- [REQ-018](REQ-018-inventario-equipo.md): inventario personal, instancias de
  objeto y localizaciones; el contenedor reutiliza ese modelo.
- [REQ-017](REQ-017-feedback-visual-eventos.md): cadáver persistente, feedback de
  muerte y presentación; esta hoja lo convierte en saqueable.
- [REQ-009](REQ-009-percepcion-alarma-huida.md): muerte de enemigos y estado del
  mundo tras el combate.
- [REQ-010](REQ-010-combate-equipo-acierto-defensa.md): equipo de enemigos,
  armas en el suelo y recogida; la política de drop parte de aquí.
- [ADR-014](../decisions/ADR-014-balance-provisional-fuente-unica.md): balance
  provisional y valores en catálogos; el botín puede alterar el equilibrio.
- [ADR-017](../decisions/ADR-017-feedback-visual-eventos.md): feedback dirigido
  por eventos y cadáver de presentación; esta hoja amplía su alcance.
- **Predecesora en definición:** `REQ-019`; **predecesora en aplicación:**
  `REQ-018`.

# Fuera de alcance

- Cofres cerrados con llave, trampas y puzzles; las llaves quedan fuera de
  `REQ-018`.
- Comercio, trueque, crafting y economía de monedas.
- IA enemiga que saquea o usa contenedores.
- Persistencia entre sesiones o guardado.
- Implementación de hotseat, red y QR.
- Arte final.
- Cadáveres de jugadores y estado fantasma: los define
  [REQ-021](REQ-021-muerte-fantasma-resurreccion.md).

# Preguntas abiertas

1. **Política de botín de cadáveres.** ¿El enemigo suelta su arma, escudo y
   armadura? ¿Botín fijo por tipo, tabla aleatoria o nada? Si suelta el equipo,
   el Bruto con armadura 2 y hacha cambia mucho el balance; hay que decidirlo y
   medirlo.
2. **Contenido y colocación de cofres.** ¿Cuántos cofres por nivel? ¿En salas
   normales, en la sala protegida o en la salida? ¿Botín fijo por semilla o tabla
   por tipo de sala?
3. **Capacidad y bolsa compartida.** ¿El contenedor tiene capacidad? ¿Los cofres
   hacen de almacenamiento común del grupo? ¿Se puede depositar cualquier objeto
   o solo equipo?
4. **Cofres cerrados y trampas.** ¿Entran en este corte? Si entran, ¿requieren
   llaves, una tirada o una herramienta? Las llaves están fuera de `REQ-018`.
5. **Ciclo de vida del cadáver.** ¿Persiste hasta el final del nivel, desaparece
   al vaciarlo o se queda como decoración? **Decidido el 2026-11-13: varios
   cadáveres pueden compartir casilla, no bloquean el paso y la interacción elige
   uno explícitamente.** Sigue abierto cuánto persiste y si se queda vacío.
6. **Apilado y selección.** Varios cadáveres en la misma casilla: cómo se ordena
   la lista (propuesta: orden de muerte), qué se ve en el mapa con dos o más y si
   saquear abre el cadáver elegido o una lista. La resurrección de `REQ-021` debe
   apuntar a una **unidad**, no a la casilla; se enmienda al cerrar esta hoja.
7. **Transferencia y UI.** ¿Panel lateral, ventana centrada o intercambio en el
   mismo tile? «Coger todo» ya está aprobado; ¿qué pasa si el inventario está
   lleno? ¿Se puede soltar un objeto al suelo?
8. **Hotseat.** ¿Solo el jugador activo puede saquear? ¿La pantalla pausa la
   partida? ¿Puede un jugador coger lo que otro dejó en un cofre?
9. **Feedback y alarma.** ¿Saquear hace ruido o alerta enemigos? ¿Qué evento
   visual y de texto produce abrir, coger y dejar?
10. **Calendario.** Se propuso implementar después de cerrar hotseat, pero
   hotseat aún no tiene hoja ni tareas. Confirmar el orden cuando exista.

# Decisiones

| Fecha | Decisión | Quién | Estado |
|---|---|---|---|
| 2026-11-10 | Los cofres y los cadáveres son contenedores con inventario propio. | human:simon | aceptada |
| 2026-11-10 | La transferencia de objetos entre inventario y contenedor entra en el alcance. | human:simon | aceptada |
| 2026-11-10 | Los cadáveres del suelo son saqueables; la hoja enmienda `REQ-017` y `scope.md`. | human:simon | aceptada |
| 2026-11-10 | Hoja separada de inventario y traits; no define huecos ni efectos. | human:simon | aceptada |
| 2026-11-10 | Definir después de `REQ-018` y `REQ-019`; aplicar después de `REQ-018` y antes de `REQ-019`. | human:simon | aceptada |
| 2026-11-10 | Implementación después de cerrar hotseat. | human:simon | provisional; hotseat aún no tiene hoja ni tareas |
| 2026-11-11 | Abrir/registrar un cofre o cadáver cuesta 1 acción y requiere adyacencia; transferir es gratis y se permite «coger todo». | human:simon | aceptada |
| 2026-11-13 | Varios cadáveres pueden compartir casilla y no bloquean el paso; la interacción elige uno explícitamente. La resurrección apuntará a una **unidad** y se enmienda en `REQ-021` al cerrar esta hoja. | human:simon | aceptada; pendiente de aplicar a REQ-021 |

# Aceptación de la hoja

- [x] El usuario ha aprobado el coste y el alcance de la interacción.
- [ ] El usuario ha aprobado la política de botín de cadáveres.
- [ ] El usuario ha aprobado el contenido y la colocación de cofres.
- [ ] El usuario ha aprobado la capacidad y la bolsa compartida.
- [ ] El usuario ha decidido si hay cofres cerrados, trampas y llaves.
- [ ] El usuario ha aprobado el ciclo de vida del cadáver.
- [ ] El usuario ha aprobado la UI de transferencia.
- [ ] Los requisitos son verificables.
- [ ] Las dependencias están claras.
- [ ] Se puede generar un grafo de tareas.
