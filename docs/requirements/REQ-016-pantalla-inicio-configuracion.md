---
type: Requirement Sheet
id: REQ-016
title: Menú principal, configuración y resumen de partida
description: "Menú principal al arrancar con Nueva y Cargar; configuración con número de jugadores y semilla, jugador a jugador, resumen de la party y arranque con el orden elegido."
status: stable
version: 3
decision_owner: human:simon
review_required: true
created_at: 2026-11-09T15:00:00Z
updated_at: 2026-11-14T22:12:15Z
related_tasks: []
generated: { by: deepseek/v4-pro, at: 2026-11-09T15:00:00Z }
verified:
  - by: human:simon
    at: 2026-11-14T22:12:15Z
    note: >-
      Aprueba la v3: menú principal solo al arrancar con Nueva y Cargar, paso 1
      cerrado con jugadores y semilla, flujo jugador a jugador con Atrás, ficha
      completa del arquetipo, resumen con Empezar/Atrás/Cancelar, cancelación
      confirmada al menú principal, semilla decimal de 32 bits, nombre de 12 y
      tabla de 18 sprites con render por variante. Incluye la retirada del
      reinicio rápido: el resultado solo ofrece «Nueva partida».
---

# Contexto

El juego arranca directo con un único jugador y sin pantalla previa. Para jugar en
grupo (hasta 6 cooperativos, hotseat en fase 2) hace falta un menú principal y una
configuración donde se decida la partida: cuántos jugadores, con qué personaje
juega cada uno (arquetipo de REQ-015 + variante de sprite), su nombre y la semilla
de la mazmorra.

La v3 cierra la hoja y reestructura el flujo: primero un **menú principal** (solo
al arrancar) con «Nueva» y «Cargar»; después el **paso 1** con número de jugadores
y semilla; después cada jugador; y por último un **resumen** antes de empezar. El
paso 1 queda cerrado en cuanto se empieza a configurar jugadores, y cancelar pide
confirmación y devuelve al menú principal.

Esta hoja define la pantalla y su contrato con el estado inicial. El **modo
hotseat** —turnos, relevo, cámara y HUD— vive en
[REQ-031](REQ-031-hotseat-local.md); la **carga de archivos y el menú de pausa**
viven en [REQ-024](REQ-024-menu-pausa-guardado.md). Aquí solo se construye la
partida que esos sistemas consumen.

# Flujo

1. **Menú principal** (solo al arrancar): «Nueva» y «Cargar».
2. **Paso 1**: número de jugadores (1-6) y semilla.
3. **Jugador 1 a N**: cada uno elige arquetipo, variante y nombre. «Atrás» y
   «Siguiente»; el último lleva al resumen.
4. **Resumen**: party en orden y semilla en solo lectura; «Empezar», «Atrás» al
   último jugador y «Cancelar».
5. **Partida**.

Entradas a la configuración: «Nueva» en el menú principal, «Nueva» en la pantalla
de resultado (directo al paso 1) y «Nueva» en el menú de pausa (con confirmación
previa que descarta la partida en curso). No hay más entradas.

# Objetivos de experiencia

- Fricción cero: pasar de arrancar a jugar en pocos pasos.
- Que cada jugador entienda qué elige y qué define a su personaje (stats y
  variante visibles).
- Configurar la partida de 1-6 jugadores sin pasos ocultos.
- Que la semilla sea transparente: se ve, se puede escribir y permite repetir una
  mazmorra concreta.
- Que las acciones destructivas sean explícitas y confirmadas.
- Que repetir la misma party sea rápido; que cambiarla sea explícito.

# Requisitos creativos (decididos)

| ID | Requisito | Aceptación |
|---|---|---|
| R-001 | Al arrancar aparece un **menú principal** con «Nueva» y «Cargar». «Cargar» abre el selector de archivo de REQ-024. `Esc` no hace nada aquí. | Es la primera pantalla; ambos botones funcionan; no hay otro punto de entrada al menú principal; `Esc` no la abandona. |
| R-002 | «Nueva» abre el **paso 1**. Desde el menú principal y desde el resultado va directo; desde el menú de pausa pide antes confirmación avisando de que se pierde el progreso no guardado y, al confirmar, descarta la partida en ese momento. | Cada origen llega al paso 1; desde la pausa hay confirmación y la partida deja de existir al confirmar. |
| R-003 | El **paso 1** fija los dos datos de la partida: número de jugadores (1-6) y semilla. No hay otro sitio donde cambiarlos. | El paso 1 es el único editable de N y semilla; el resumen la muestra sin editar. |
| R-004 | Una vez iniciada la configuración de jugadores, el **número de jugadores no se cambia**: para corregirlo se cancela y se empieza de nuevo. | No hay control de N después del paso 1; la única vía es cancelar. |
| R-005 | Cada jugador elige uno de los **nueve arquetipos** de REQ-015 y una de sus **dos variantes** de sprite, sin etiqueta de género. Dos jugadores pueden repetir arquetipo y variante. | El roster completo está disponible; cada arquetipo ofrece dos variantes; la elegida se guarda. |
| R-006 | Al elegir arquetipo se ve su **ficha completa**: nueve atributos, arma temática, nivel de magia y las dos miniaturas de variante. | La ficha muestra todos esos datos y cambia al cambiar de arquetipo. |
| R-007 | Cada jugador escribe un nombre de hasta **12 caracteres**; si lo deja vacío, se usa el del arquetipo. Los nombres duplicados están permitidos. | El nombre se guarda; 12 es el máximo; vacío usa el arquetipo; no se bloquean duplicados. |
| R-008 | El flujo es **jugador a jugador**: cada jugador se configura completo antes de pasar al siguiente. «Atrás» recorre los jugadores ya configurados sin volver al paso 1 y conserva lo escrito; «Siguiente» en el último lleva al resumen. | Se configura un jugador completo antes del siguiente; «Atrás» conserva valores; el último «Siguiente» abre el resumen. |
| R-009 | El **resumen** lista la party en orden (número, arquetipo, variante y nombre) y la semilla en solo lectura, con «Empezar», «Atrás» (al último jugador) y «Cancelar». | Los tres botones están; «Atrás» vuelve al último jugador; la semilla no se edita en el resumen. |
| R-010 | «Empezar» arranca la partida con los N jugadores y la semilla mostrada en el resumen. | El estado parte con N jugadores, cada uno con arquetipo, variante y nombre, y con esa semilla. |
| R-011 | «Cancelar» y `Esc` en el paso 1, en un jugador o en el resumen piden confirmación; al confirmar se descarta la configuración y se vuelve al **menú principal**. Cancelar el aviso sigue configurando. | El aviso aparece en los tres puntos; confirmar descarta y vuelve al menú principal; cancelar no cambia nada. |
| R-012 | La configuración no se guarda entre sesiones. Cada entrada al paso 1 genera una semilla aleatoria; si el campo se vacía, al continuar se genera otra; un valor inválido bloquea. `?seed=` solo precarga la primera entrada de la carga de página. | Recargar no recupera la party anterior; la semilla se genera al entrar; vacío genera otra; inválido bloquea con mensaje. |
| R-013 | Los jugadores se numeran **1..N** y ese número es el **orden de turno** del hotseat. No hay control para reordenar. | El estado conserva el orden; el hotseat lo usa sin reordenar; no existe acción de reordenar. |

# Requisitos técnicos

| ID | Requisito | Aceptación |
|---|---|---|
| T-001 | El estado guarda una lista de N jugadores; cada uno con arquetipo, variante, nombre y orden, más la semilla de la partida. | El snapshot expone la lista y la semilla; es serializable. |
| T-002 | La pantalla es presentación del host; no cambia el motor ni las fórmulas de combate. Un único constructor de estado inicial. | El motor sigue puro; la pantalla solo construye el estado inicial. |
| T-003 | Los sprites salen de `rogues.png` (ADR-006): cada arquetipo tiene dos celdas de 32×32 asignadas en la tabla de abajo. La variante forma parte del estado y el mapa y la miniatura del HUD usan la elegida. | Cada variante apunta a una celda concreta; el jugador se dibuja con su variante, no con un sprite fijo. |
| T-004 | La semilla se parsea y normaliza con la lógica actual del host: entero con signo opcional, finito, normalizado a 32 bits sin signo. Vacío genera una aleatoria; inválido bloquea el avance con mensaje. `?seed=` válido precarga el campo solo en la primera entrada de la carga de página y sigue siendo editable; `?seed=` inválido se ignora con aviso y se genera una aleatoria. | Una semilla escrita llega al generador; `?seed=` precarga una vez; inválido bloquea; sin campo válido no se construye el estado. |
| T-005 | Valores por defecto y reseteos: N=1; Jugador 1 con Guerrero, variante 1 y nombre vacío; cambiar de arquetipo vuelve la variante a la 1; ir atrás y adelante conserva lo escrito; cancelar descarta toda la configuración. | Abrir la pantalla siempre parte de esos valores; los reseteos se cumplen. |
| T-006 | El nombre se guarda en NFC, con espacios recortados, máximo 12 code points y solo letras, dígitos y espacio; se trunca en vivo sin mensaje de error. | Nombres con acentos y espacios se aceptan; 13 caracteres se recortan a 12; los símbolos no se aceptan. |
| T-007 | Navegación completa por teclado, foco visible, `Enter`/`Espacio` activan, `Esc` cancela con confirmación y los errores y avisos se anuncian con texto y `aria-live`. | Se puede completar todo el flujo sin ratón; el foco y los errores son perceptibles sin depender del color. |
| T-008 | Tests nuevos: defaults, N=1 y N=6, avance y retroceso entre jugadores, resumen, cancelar en los tres puntos, semilla inválida, semilla vacía, `?seed=` válido e inválido, nombre con acentos y truncado, sprite por variante y E2E de arranque, cancelación y partida con 2 jugadores. | `pnpm run verify` pasa; los tests de REQ-005, REQ-009, REQ-010, REQ-017, REQ-021 y REQ-026 conservan su intención. |
| T-009 | Sin dependencias nuevas, sin red ni persistencia. | `package.json` y `pnpm-lock.yaml` no cambian. |
| T-010 | Se actualizan glosario, índice y alcance; se añade la tabla de sprites a ADR-006 y se anotan las enmiendas a REQ-022, REQ-024 y REQ-031. | `pnpm run docs:check` pasa; no quedan entradas ni controles contradictorios. |

# Tabla de sprites

Celdas de 32×32 sobre la rejilla de 7×7 de `rogues.png`; la columna es `sx` y la
fila es `sy`. La UI no muestra nombres de género: las variantes son 1 y 2.

| Arquetipo | Variante 1 | Variante 2 |
|---|---|---|
| Guerrero | caballero, fila 2 col. a (0, 32) | caballera, fila 2 col. c (64, 32) |
| Bárbaro | bárbaro, fila 4 col. a (0, 96) | bárbara, fila 4 col. f (160, 96) |
| Pícaro | pícaro, fila 1 col. d (96, 0) | bandido, fila 1 col. e (128, 0) |
| Arquero | ranger, fila 1 col. c (64, 0) | elfo, fila 1 col. b (32, 0) |
| Mago | mago, fila 5 col. b (32, 128) | maga, fila 5 col. a (0, 128) |
| Clérigo | clérigo de guerra, fila 3 col. d (96, 64) | sacerdote, fila 3 col. b (32, 64) |
| Espadachín | espadachín, fila 4 col. d (96, 96) | esgrimidor, fila 4 col. e (128, 96) |
| Cocinero | panadero, fila 6 col. d (96, 160) | herrero, fila 6 col. e (128, 160) |
| Granjero | granjero, fila 6 col. a (0, 160) | campesino, fila 7 col. a (0, 192) |

# Requisitos no funcionales

- **Rendimiento:** configurar hasta 6 jugadores no añade coste al arranque; la
  generación de la mazmorra sigue siendo la actual.
- **Accesibilidad:** navegación completa por teclado, foco visible, textos
  legibles y errores de nombre o semilla anunciados con texto.
- **Compatibilidad:** Chromium de escritorio como objetivo; Firefox y Safari
  recientes como deseables.
- **Seguridad:** sin datos personales, sin red y sin nuevas dependencias.
- **Mantenibilidad:** un único constructor de estado inicial; el hotseat y la
  carga no duplican la configuración.

# Dependencias

- [REQ-015](REQ-015-roster-arquetipos.md): arquetipos, variantes y nombre por
  defecto.
- [REQ-024](REQ-024-menu-pausa-guardado.md): botón «Cargar», selector de archivo
  y entrada «Nueva» desde la pausa.
- [REQ-031](REQ-031-hotseat-local.md): modo que consume la configuración, el orden
  y la semilla; pantalla de resultado con «Nueva».
- [REQ-022](REQ-022-hud-izquierdo-jugador.md): miniatura del jugador activo.
- [ADR-006](../decisions/ADR-006-arte-placeholder-32rogues.md): sprites de
  `rogues.png` y tabla de variantes.
- [ADR-014](../decisions/ADR-014-balance-provisional-fuente-unica.md): valores
  provisionales del roster.

# Enmiendas a documentos vigentes

- [REQ-022](REQ-022-hud-izquierdo-jugador.md): la miniatura del HUD usa la
  variante elegida, no el retrato fijo del arquetipo.
- [REQ-024](REQ-024-menu-pausa-guardado.md): «Cargar» aparece también en el menú
  principal; el menú de pausa conserva el suyo.
- [REQ-031](REQ-031-hotseat-local.md): «Nueva partida» del resultado lleva al
  paso 1; no hay reinicio rápido ni con la misma party y semilla.
- [Alcance](../scope.md) y [glosario](../glossary.md): menú principal, paso 1 y
  resumen como términos del arranque.

# Fuera de alcance

- Modo hotseat, turnos y relevo: se definen en `REQ-031`.
- Carga, validación y reemplazo de partida: se definen en `REQ-024`.
- Menú principal desde la pausa o el resultado: solo existe al arrancar.
- Vista previa de la mazmorra, miniaturas del mapa y semilla en partida.
- Red, QR, controladores móviles y salas.
- Persistencia de configuraciones entre sesiones.
- Progresión, desbloqueos de arquetipos u objetos.
- Remapeo de controles, perfiles y teclas por jugador.

# Preguntas abiertas

Ninguna. La v3 cierra el flujo, los límites del nombre, la semilla y los sprites;
las preguntas 1-3 de la v2 quedan resueltas en R-003, R-012, T-004 y la tabla de
sprites.

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
| 2026-11-14 | Menú principal al arrancar con «Nueva» y «Cargar»; solo existe en el arranque. | human:simon | aceptada |
| 2026-11-14 | Paso 1 fija número de jugadores y semilla; después no se cambia N sin cancelar. | human:simon | aceptada |
| 2026-11-14 | Resumen antes de «Empezar» con party, semilla de solo lectura, «Atrás» y «Cancelar». | human:simon | aceptada |
| 2026-11-14 | Cancelar pide confirmación y vuelve al menú principal; desde la pausa, «Nueva» descarta la partida al confirmar. | human:simon | aceptada |
| 2026-11-14 | Ficha completa del arquetipo: nueve atributos, arma, magia y dos miniaturas. | human:simon | aceptada |
| 2026-11-14 | Semilla decimal de 32 bits con el parser actual; tabla de sprites de 18 celdas aprobada. | human:simon | aceptada |

# Aceptación de la hoja

- [x] El usuario ha aprobado el flujo, el paso 1, el resumen y la cancelación.
- [x] El usuario ha aprobado la ficha de arquetipo, la semilla y la tabla de sprites.
- [x] Los requisitos son verificables.
- [x] Las dependencias están claras.
- [x] No hay preguntas abiertas ni contradicciones.
- [x] El usuario ha revisado el texto de la v3 y la hoja queda `stable`.

# Notas de vigencia

- **v3 (2026-11-14):** añade el menú principal, el paso 1 cerrado
  (jugadores y semilla), el resumen con «Empezar»/«Atrás»/«Cancelar», la
  cancelación confirmada con vuelta al menú principal, la ficha completa del
  arquetipo, la semilla decimal de 32 bits y la tabla de 18 sprites. El render
  pasa a usar la variante elegida. Corrige la enmienda a REQ-031 tras retirar el
  reinicio rápido.
- **v2 (2026-11-13):** cerró las preguntas de hotseat, flujo, nombres, semilla y
  entradas; el hotseat pasó a `REQ-031`.
- **v1 (2026-11-09):** primera pantalla de inicio con 1-6 jugadores, arquetipo,
  variante, nombre y semilla.
