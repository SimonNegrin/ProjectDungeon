---
type: Requirement Sheet
id: REQ-024
title: Menú de pausa y guardado local
description: "Menú de pausa global con reanudar, guardar en .zip, cargar .json o .zip, reiniciar y controles; guardado local solo en fase de personajes, carga en el turno activo y reinicio con la misma party y semilla."
status: draft
version: 2
decision_owner: human:simon
review_required: true
created_at: 2026-11-11T13:10:00Z
updated_at: 2026-11-13T19:07:43Z
related_tasks: []
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T13:10:00Z }
verified:
---

# Contexto

El usuario quiere una pantalla de menú que pause la partida y permita cargar,
guardar, reiniciar y consultar los controles. El guardado es un archivo local: un
`.zip` con la partida y un manifiesto. La carga acepta ese `.zip` o un `.json` de
partida.

Esto cierra la pregunta de persistencia abierta en la visión: la persistencia es
local y por archivo, sin cuentas, servidor ni base de datos. No implica
progresión entre partidas ni guardado automático.

El menú es **solo de pausa**. El arranque sigue en
[REQ-016](REQ-016-pantalla-inicio-configuracion.md) y el modo de juego en
[REQ-031](REQ-031-hotseat-local.md).

La **v2** incorpora el hotseat: la pausa es global y la abre cualquier jugador;
guardar solo se permite en la fase de personajes y sin animaciones; cargar
devuelve el control al jugador activo; y el reinicio vive en este menú, con
«Nueva» y «Reiniciar», sin atajo `R`.

# Enmienda a documentos vigentes

- [Visión](../vision.md) y [alcance](../scope.md) dejan de tratar la persistencia
  como pregunta abierta: queda definida como archivo local de partida.
- [REQ-017](REQ-017-feedback-visual-eventos.md): la pausa congela la timeline de
  presentación; el menú no genera eventos de juego.
- [REQ-021](REQ-021-muerte-fantasma-resurreccion.md) y
  [REQ-020](REQ-020-cofres-saqueo.md): el guardado incluye fantasmas, cadáveres y
  contenedores; el formato debe representarlos.
- [REQ-031](REQ-031-hotseat-local.md): pausa global, guardado restringido a la
  fase de personajes, carga en el activo y reinicio desde la pausa.

# Objetivos de experiencia

- Poder dejar la partida y retomarla exactamente donde estaba.
- Que guardar y cargar sea comprensible sin manual: un botón, un archivo.
- Que un archivo inválido no rompa ni corrompa la partida en curso.
- Que la pausa se sienta como una pausa real, no como un menú que sigue jugando.
- Que en hotseat cualquier jugador pueda pausar sin romper el turno.
- Que reiniciar sea una decisión explícita y repetible.
- Que los controles estén a mano cuando alguien nuevo se sienta a la mesa.

# Requisitos creativos (decididos)

| ID | Requisito | Aceptación |
|---|---|---|
| R-001 | Existe un menú de pausa que detiene la partida y se abre con `Esc`. | Con el menú abierto no avanza ningún turno, beat ni animación de juego. |
| R-002 | El menú ofrece reanudar, guardar, cargar, **reiniciar** y controles. | Las cinco acciones están disponibles y se navegan con teclado. |
| R-003 | Guardar solo está disponible desde el menú de pausa, **en la fase de personajes y sin animación**, y produce **un** archivo `.zip`. | Fuera de la pausa no hay atajo; en fase enemiga o animación la acción se desactiva; cada guardado descarga un único archivo. |
| R-004 | El `.zip` contiene `partida.json` y `manifiesto.json`. El manifiesto incluye versión del formato, versión del juego, fecha, semilla y resumen de la partida. | Un guardado se puede identificar y validar sin abrir la partida. |
| R-005 | Cargar acepta un `.zip` de guardado o un `.json` de partida. | Ambos formatos reconstruyen la partida; un archivo inválido se rechaza con mensaje. |
| R-006 | Cargar con una partida en curso pide confirmación y reemplaza la partida actual. | Cancelar no cambia nada; confirmar reconstruye la partida cargada. |
| R-007 | La pantalla de controles explica las teclas vigentes con texto; no permite remapear. | La lista coincide con los controles del juego; no hay editor de teclas. |
| R-008 | La partida guardada conserva el estado completo: semilla, RNG, turno, **orden de jugadores, jugador activo y ronda**, jugadores vivos, fantasmas, cadáveres, contenedores, objetos, equipo, **acciones restantes/máximas, maná y nivel de magia**. | Cargar y volver a guardar produce un estado equivalente; el control vuelve al activo. |
| R-009 | El guardado no incluye presentación: ni timeline de feedback, ni cámara, ni cursor. Al cargar se reconstruye la presentación. | La partida cargada se ve en estado final, sin reproducir beats pendientes. |
| R-010 | **Reiniciar partida** abre un diálogo con **«Nueva»** y **«Reiniciar»**: «Reiniciar» repite la misma party y semilla; «Nueva» lleva a la pantalla de inicio; `Esc` cancela. | Reiniciar reconstruye la misma mazmorra; Nueva no reutiliza la partida; cancelar no cambia nada. |
| R-011 | La pausa es **global**: cualquier jugador la abre y afecta a todos. No hay pausa por jugador. | En hotseat, cualquier jugador pausa; reanudar devuelve el control al activo. |

# Requisitos técnicos

| ID | Requisito | Aceptación |
|---|---|---|
| T-001 | El estado del motor es serializable de forma completa y determinista: semilla, estado del RNG, turno, ronda, orden y jugador activo, unidades, cadáveres, contenedores, inventarios y equipo. | Test de ida y vuelta: serializar, cargar, serializar produce el mismo estado. |
| T-002 | El guardado se construye desde el motor, no desde el host: el host solo empaqueta, descarga y lee archivos. | El formato no contiene datos de presentación ni de DOM. |
| T-003 | El `.zip` se genera y se lee sin red. Se prefiere la API nativa del navegador; si hace falta una dependencia, se registra un ADR. | El archivo se abre en un lector estándar; `package.json` solo cambia con ADR. |
| T-004 | El manifiesto valida el formato antes de aplicar la partida: `format_version`, `game_version`, fecha ISO, semilla y resumen. | Un manifiesto ausente, malformado o con versión desconocida se rechaza sin cambios. |
| T-005 | `partida.json` se valida contra un esquema estricto antes de tocar el estado; no se usa `eval`, no se aceptan campos ejecutables ni rutas. | Tests con JSON corrupto, campos extra, tipos erróneos y versión desconocida: rechazo limpio. |
| T-006 | La carga tiene límites de tamaño y de entradas del `.zip` para evitar archivos desmedidos o bombas de descompresión. | Un `.zip` con demasiadas entradas o tamaño desmedido se rechaza con mensaje. |
| T-007 | La pausa detiene la timeline de presentación y bloquea el input de juego; reanudar continúa exactamente desde el mismo estado. Guardar se desactiva en fase enemiga y durante animaciones. | Tests: beats congelados, input ignorado, reanudar sin saltos, guardar desactivado fuera de la fase de personajes. |
| T-008 | La pausa y el menú viven en el host; el motor no conoce el menú. | El motor no expone comandos de pausa; los tests del motor no cambian. |
| T-009 | La descarga usa un nombre de archivo estable con semilla y fecha; la carga usa un selector de archivo local. | Dos guardados de la misma partida no se sobrescriben entre sí. |
| T-010 | Tests nuevos: ida y vuelta, manifiesto, validación, límites, pausa, confirmación de carga, controles, guardado restringido, carga en el activo y E2E de descarga/carga. | `pnpm run verify` pasa; los tests de `REQ-017` conservan su intención. |
| T-011 | Se actualizan glosario, arquitectura y visión/alcance; se registra un ADR del formato de guardado. | `docs:check` pasa; no queda la persistencia como pregunta abierta. |
| T-012 | Sin red, sin cuentas, sin base de datos y sin dependencias nuevas salvo ADR. | No hay peticiones de red; el guardado funciona con la pestaña offline. |
| T-013 | Reiniciar reconstruye el estado inicial desde la configuración guardada (semilla y party) y no depende de un atajo de teclado. | Misma semilla y party producen la misma mazmorra; no queda `R` como control. |

# Formato de guardado (propuesto)

```text
proyectdungeon-<semilla>-<AAAAMMDD-HHmmss>.zip
├── manifiesto.json
└── partida.json
```

`manifiesto.json`: `format_version`, `game_version`, `created_at`, `seed`,
`summary` (jugadores, nivel, turno, resultado si lo hay).

`partida.json`: estado completo del motor, incluidos el estado del RNG, la
semilla, la party y su orden, el jugador activo, la ronda y el turno. Sin
timeline, cámara ni cursor.

# Requisitos no funcionales

- **Rendimiento:** guardar y cargar no bloquean el hilo principal más de lo
  necesario para serializar; el archivo típico debe ser pequeño.
- **Accesibilidad:** menú navegable con teclado, foco visible y textos claros.
- **Compatibilidad:** Chromium de escritorio como objetivo; Firefox y Safari
  recientes como deseables.
- **Seguridad:** archivos no confiables; validación estricta y límites de tamaño.
- **Mantenibilidad:** formato versionado y esquema único; migraciones futuras
  explícitas.

# Dependencias

- [REQ-002](REQ-002-encuadre-16-9.md) y [REQ-005](REQ-005-viewport-impar-13.md):
  marco y presentación que se pausa y se reconstruye.
- [REQ-016](REQ-016-pantalla-inicio-configuracion.md): arranque, jugadores y
  semilla.
- [REQ-017](REQ-017-feedback-visual-eventos.md): timeline que la pausa congela.
- [REQ-018](REQ-018-inventario-equipo.md): inventarios y equipo serializados.
- [REQ-020](REQ-020-cofres-saqueo.md): contenedores y cadáveres.
- [REQ-021](REQ-021-muerte-fantasma-resurreccion.md): fantasmas y resurrección.
- [REQ-031](REQ-031-hotseat-local.md): pausa global, guardado restringido y
  reinicio.
- [ADR-012](../decisions/ADR-012-combate-equipo-rng.md): RNG sembrado y
  serializable; el guardado reutiliza ese estado.

# Fuera de alcance

- Guardado en la nube, cuentas, servidor o base de datos.
- Varios slots por partida, autoguardado y guardado rápido.
- Migración entre versiones de formato; la v1 rechaza versiones desconocidas.
- Remapeo de controles y perfiles.
- Menú de arranque; el inicio sigue en `REQ-016`.
- Guardar la presentación: beats, cámara, cursor y feedback.
- Guardado durante la fase remota o sincronización entre dispositivos.
- Guardar después de la pantalla de resultado.

# Preguntas abiertas

1. **Tecla de pausa.** Resuelta: `Esc`.
2. **Tras cargar.** Resuelta: se reanuda en el turno del jugador activo.
3. **Tamaño máximo.** ¿Qué límite de archivo y de entradas se acepta?
4. **Partida terminada.** Provisional: no se guarda después de victoria o derrota.
5. **Manifiesto.** ¿Incluye nombres de personajes o solo el resumen?
6. **Hotseat.** Resuelta: pausa global y cualquier jugador puede abrirla.
7. **Audio.** Cuando exista música, ¿la pausa la detiene o la atenúa?
8. **Reinicio en fase enemiga.** Provisional: permitido desde la pausa; aborta la
   fase y reconstruye la partida.

# Decisiones

| Fecha | Decisión | Quién | Estado |
|---|---|---|---|
| 2026-11-11 | El menú existe solo en pausa; el arranque sigue en `REQ-016`. | human:simon | aceptada |
| 2026-11-11 | Guardar solo desde el menú de pausa, con un archivo por partida. | human:simon | aceptada |
| 2026-11-11 | El `.zip` contiene `partida.json` y `manifiesto.json` con versión, fecha, semilla y resumen. | human:simon | aceptada |
| 2026-11-11 | Cargar acepta `.zip` o `.json`, pide confirmación y reemplaza la partida actual. | human:simon | aceptada |
| 2026-11-11 | Los controles son texto informativo; sin remapeo. | human:simon | aceptada |
| 2026-11-11 | La persistencia es local por archivo, sin cuentas ni servidor. | human:simon | aceptada |
| 2026-11-13 | Pausa global con `Esc`; cualquier jugador la abre y afecta a todos. | human:simon | aceptada |
| 2026-11-13 | Guardar solo en fase de personajes y sin animación; cargar en el turno activo. | human:simon | aceptada |
| 2026-11-13 | Reiniciar vive en el menú con «Nueva» y «Reiniciar»; misma party y semilla; sin `R`. | human:simon | aceptada |
| 2026-11-13 | El guardado incluye semilla, party, orden, activo y ronda. | human:simon | aceptada |

# Aceptación de la hoja

- [x] El usuario ha aprobado las decisiones creativas.
- [x] El usuario ha aprobado la pausa global, el guardado restringido y el reinicio.
- [ ] El usuario ha revisado el texto de la hoja.
- [x] Los requisitos son verificables.
- [x] Las dependencias están claras.
- [ ] El grafo de tareas es posible; depende de cerrar el estado serializable de `REQ-018`/`REQ-020`/`REQ-021`.

# Notas de vigencia

- **v2 (2026-11-13):** incorpora hotseat (pausa global, guardado solo en fase de
  personajes, carga en el activo) y mueve el reinicio aquí, con misma party y
  semilla. Sustituye el reinicio instantáneo con `R` de versiones anteriores.
