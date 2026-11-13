---
type: Requirement Sheet
id: REQ-016
title: Pantalla de inicio y configuración de jugadores
description: "Pantalla previa con 1-6 jugadores, semilla visible y editable, y por jugador arquetipo, variante y nombre; se entra al arrancar, desde el resultado y desde la pausa."
status: stable
version: 2
decision_owner: human:simon
review_required: true
created_at: 2026-11-09T15:00:00Z
updated_at: 2026-11-13T19:07:43Z
related_tasks: []
generated: { by: deepseek/v4-pro, at: 2026-11-09T15:00:00Z }
verified:
  - by: human:simon
    at: 2026-11-13T19:07:43Z
    note: >-
      Aprueba la v2: selector 1-6 activo, flujo jugador a jugador, nombres de
      hasta 12 (vacío = arquetipo, duplicados permitidos), arquetipos repetidos,
      semilla visible y editable con aleatoria por defecto, y entrada desde
      arranque, resultado y pausa. El modo hotseat queda en REQ-031.
---

# Contexto

El juego arranca directo con un único jugador y sin pantalla previa. Para jugar
en grupo (hasta 6 cooperativos, hotseat en fase 2) hace falta una pantalla de
inicio donde se configure la partida: cuántos jugadores, con qué personaje juega
cada uno (arquetipo de REQ-015 + variante de sprite), su nombre y la semilla de la
mazmorra.

Esta hoja define esa pantalla y su contrato con el estado inicial. El **modo
hotseat** —turnos, relevo, cámara y HUD— vive en
[REQ-031](REQ-031-hotseat-local.md); aquí solo se construye la partida que ese
modo consume.

La **v2 cierra** las preguntas que quedaban abiertas: el selector de 1-6 ya está
activo, el flujo es jugador a jugador, los nombres tienen límite y los duplicados
están permitidos, la semilla es visible y editable, y la pantalla se entra desde
el arranque, el resultado y la pausa. El mapeo de sprites queda como dato de
implementación.

# Objetivos de experiencia

- Fricción cero: pasar de arrancar a jugar en pocos pasos.
- Que cada jugador entienda qué elige y qué define a su personaje (stats y
  variante visibles).
- Configurar la partida de 1-6 jugadores sin pasos ocultos.
- Que la semilla sea transparente: se ve, se puede cambiar y permite repetir una
  mazmorra concreta.
- Que repetir la misma party sea rápido; que cambiarla sea explícito.

# Requisitos creativos (decididos)

| ID | Requisito | Aceptación |
|---|---|---|
| R-001 | La pantalla de inicio aparece al arrancar, al elegir **«Nueva»** en el resultado y al elegir **«Nueva»** en el menú de pausa. | Esas tres entradas muestran la configuración, no la mazmorra. |
| R-002 | Se elige el número de jugadores: de **1 a 6**. | El selector admite 1-6 y lo guarda. |
| R-003 | Cada jugador elige uno de los nueve arquetipos de REQ-015. | El roster completo está disponible; dos jugadores pueden repetir arquetipo. |
| R-004 | Cada jugador elige una de las dos variantes de sprite de su arquetipo (sin etiqueta de género). | Cada arquetipo ofrece dos variantes; la elegida se guarda. |
| R-005 | Cada jugador escribe un nombre de hasta **12 caracteres**; si lo deja vacío, se usa el del arquetipo. Los nombres duplicados están permitidos. | El nombre se guarda; 12 es el máximo; vacío usa el arquetipo; no se bloquean duplicados. |
| R-006 | Al confirmar, la partida arranca con los N jugadores y sus personajes configurados. | El estado parte con N jugadores, cada uno con arquetipo, variante y nombre. |
| R-007 | La pantalla muestra un **campo de semilla global**, relleno con una semilla aleatoria al abrirse. Los jugadores pueden cambiarla o dejarla; si se vacía, al confirmar se genera otra aleatoria; un valor inválido no deja empezar. | La semilla se ve; editarla cambia la mazmorra; vacío genera una nueva; inválido bloquea con mensaje. |
| R-008 | El orden de los jugadores en la configuración es el **orden de turno**; los arquetipos repetidos están permitidos. | El estado conserva el orden; el hotseat lo usa sin reordenar. |
| R-009 | El flujo es **jugador a jugador**: primero número de jugadores y semilla, después cada jugador elige arquetipo, variante y nombre antes de pasar al siguiente. | Se configura un jugador completo antes de pasar al siguiente; se puede volver atrás. |
| R-010 | La configuración no se guarda entre sesiones; cada entrada genera una semilla aleatoria nueva salvo que se escriba otra. | Recargar la página no recupera la party anterior; la semilla se genera al abrir. |

# Requisitos técnicos

| ID | Requisito | Aceptación |
|---|---|---|
| T-001 | El estado guarda una lista de N jugadores; cada uno con arquetipo, variante, nombre y orden, más la semilla de la partida. | El snapshot expone la lista y la semilla; es serializable. |
| T-002 | La pantalla es presentación del host; no cambia el motor ni las fórmulas de combate. | El motor sigue puro; la pantalla solo construye el estado inicial. |
| T-003 | Los sprites salen de `rogues.png` (ADR-006); se asigna un sprite por variante de arquetipo. | Cada variante apunta a un sprite concreto del pack. |
| T-004 | La semilla se genera y normaliza en el host; `?seed=` rellena el campo para debug y sigue siendo editable. Sin campo válido no se construye el estado. | Una semilla escrita llega al generador; `?seed=` precarga; inválido se rechaza. |
| T-005 | Sin dependencias nuevas, sin red ni persistencia. | `package.json` y `pnpm-lock.yaml` no cambian. |

# Requisitos no funcionales

- **Rendimiento:** configurar hasta 6 jugadores no añade coste al arranque; la
  generación de la mazmorra sigue siendo la actual.
- **Accesibilidad:** navegación completa por teclado, foco visible, textos
  legibles y errores de nombre o semilla anunciados con texto.
- **Compatibilidad:** Chromium de escritorio como objetivo; Firefox y Safari
  recientes como deseables.
- **Seguridad:** sin datos personales, sin red y sin nuevas dependencias.
- **Mantenibilidad:** un único constructor de estado inicial; el hotseat no
  duplica la configuración.

# Dependencias

- [REQ-015](REQ-015-roster-arquetipos.md): arquetipos, variantes y nombre por
  defecto.
- [REQ-031](REQ-031-hotseat-local.md): modo que consume la configuración, el orden
  y la semilla.
- [REQ-024](REQ-024-menu-pausa-guardado.md): entrada «Nueva» desde la pausa y
  reinicio con la misma party y semilla.
- [ADR-006](../decisions/ADR-006-arte-placeholder-32rogues.md): sprites de
  `rogues.png`.
- [ADR-014](../decisions/ADR-014-balance-provisional-fuente-unica.md): valores
  provisionales del roster.

# Fuera de alcance

- Modo hotseat, turnos y relevo: se definen en `REQ-031`.
- Red, QR, controladores móviles y salas.
- Persistencia de configuraciones entre sesiones.
- Progresión, desbloqueos de arquetipos u objetos.
- Edición de la semilla desde la partida; solo en la pantalla de inicio.
- Remapeo de controles y perfiles.

# Preguntas abiertas

1. **Mapeo de sprites.** Qué sprite de `rogues.png` corresponde a cada
   arquetipo/variante; es dato de implementación con `ADR-006`.
2. **Rango de semilla.** Límites y normalización exactos del campo; se reutiliza
   la lógica del host y se documenta al implementar.
3. **Caracteres del nombre.** Alfabeto permitido además del límite de 12; se
   valida al implementar sin bloquear letras, números ni espacios.

# Decisiones

| Fecha | Decisión | Quién | Estado |
|---|---|---|---|
| 2026-11-09 | Pantalla de inicio con nº de jugadores (1-6) y, por jugador, arquetipo + variante + nombre. | human:simon | aceptada |
| 2026-11-09 | Nombre por defecto = nombre del arquetipo; dos variantes de sprite por arquetipo. | human:simon | aceptada |
| 2026-11-13 | Selector de 1-6 activo; el hotseat ya está definido en REQ-031. | human:simon | aceptada |
| 2026-11-13 | Flujo jugador a jugador: número y semilla, después cada jugador completo. | human:simon | aceptada |
| 2026-11-13 | Nombres de hasta 12; vacío usa el arquetipo; duplicados y arquetipos repetidos permitidos. | human:simon | aceptada |
| 2026-11-13 | Semilla global visible, aleatoria al abrir, editable; vacío genera otra; `?seed=` precarga. | human:simon | aceptada |
| 2026-11-13 | Entrada al arrancar, desde el resultado y desde la pausa; sin persistencia de configuración. | human:simon | aceptada |

# Aceptación de la hoja

- [x] El usuario ha aprobado el flujo de configuración.
- [x] El usuario ha resuelto las preguntas de hotseat, nombre, semilla y entradas.
- [x] Los requisitos son verificables.
- [x] Las dependencias están claras.
- [x] Se puede generar un grafo de tareas.
- [x] El usuario ha revisado el texto de la v2 y la hoja queda `stable`.

# Notas de vigencia

- **v2 (2026-11-13):** cierra las preguntas abiertas de la v1; el hotseat deja de
  estar fuera de alcance y pasa a `REQ-031`. El mapeo de sprites y el rango de
  semilla quedan como datos de implementación.
