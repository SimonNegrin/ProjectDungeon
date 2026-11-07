---
type: Requirement Sheet
id: REQ-001
title: Primer prototipo jugable local
description: Una sala, un jugador, un enemigo, teclado, cámara y turnos con la economía provisional.
status: stable
version: 1
decision_owner: human:simon
review_required: true
created_at: 2026-11-07T15:24:03Z
updated_at: 2026-11-07T16:20:00Z
related_tasks: [TASK-0001, TASK-0002, TASK-0003]
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T15:24:03Z }
verified:
  - by: human:simon
    at: 2026-11-07T16:18:00Z
    note: Playtest del primer hito; HUD y feedback de ataque aprobados.
---

# Contexto

La fase 0 ha dejado documentación, agentes, skills y un shell de experimentos
fiable. El siguiente paso es convertir ese arnés en una experiencia jugable
mínima: una sola sala local que permita recorrer el loop completo de movimiento,
ataque, turno enemigo y final de partida.

Esta hoja valida la integración técnica y la legibilidad del loop. No pretende
equilibrar el juego ni decidir el arte final. Los valores concretos viven en
[la economía de turno provisional](../design/turn-economy.md) y se usarán tal
cual.

# Objetivos de experiencia

- En los primeros segundos, el jugador entiende dónde está, qué puede hacer y de
  quién es el turno.
- Mover, atacar y terminar el turno forma un ciclo claro y sin tiempo muerto.
- La cámara muestra suficiente sala para decidir sin perder de vista al jugador.
- El combate se lee: quién golpea, cuánto daño hace y cuándo termina la partida.
- El usuario puede probar la build en el navegador y darnos feedback creativo sin
  leer código.

# Requisitos creativos

| ID | Requisito | Aceptación |
|---|---|---|
| R-001 | Una sola sala de mazmorra de 32×24 casillas, con muros de piedra en el borde y suelo transitable. La sala es mayor que el viewport para que la cámara tenga recorrido. | Al arrancar se ve la sala y el jugador; la cámara se desplaza y se detiene en los bordes. |
| R-002 | El jugador es un caballero y el enemigo un goblin, usando los sprites de 32rogues. La silueta y el color deben distinguirse sobre el suelo. | Ambos sprites se renderizan centrados en su casilla y se reconocen a simple vista. |
| R-003 | El movimiento es instantáneo entre casillas, en 8 direcciones, con 4 MP, coste 1 también en diagonal y sin corte de esquina. | Cada pulsación mueve una casilla o se rechaza; el HUD refleja el MP restante. |
| R-004 | Cada unidad tiene una acción por turno. El ataque básico es cuerpo a cuerpo, hace 5 de daño al enemigo y 3 del enemigo al jugador. Vida: 20 del jugador y 10 del enemigo. | Atacar solo funciona en adyacencia, descuenta la acción, actualiza la vida y la muerte ocurre a 0. |
| R-005 | El turno del jugador termina con `E`. Después actúan todos los enemigos y vuelve la fase del jugador, restaurando MP y acción. | El HUD cambia de fase; el enemigo se mueve o ataca de forma determinista. |
| R-006 | La cámara sigue al jugador activo y se limita a los bordes del mapa. | Al moverse cerca de un borde, la cámara deja de desplazarse y el jugador sigue visible. |
| R-007 | Controles de teclado: `WASD`/flechas para mover, `Espacio`/`Enter` para atacar, `E` para terminar turno, `R` para reiniciar y `F1` para alternar debug. | Cada tecla produce la acción esperada; `R` devuelve la sala al estado inicial. |
| R-008 | HUD mínimo: vida y MP del jugador, acción disponible, fase actual, vida del enemigo y ayuda de teclas. Overlay de victoria o derrota con opción de reiniciar. | El HUD refleja el estado sin ambigüedad y el overlay aparece al terminar la partida. |
| R-009 | Feedback visual: casilla resaltada, flash de daño y número de daño. Sin animaciones de movimiento ni audio en este corte. | El impacto se percibe en el momento del ataque y no se confunde con el movimiento. |
| R-010 | El arte placeholder usa el pack 32rogues incluido en el repositorio, con su licencia y crédito. | Los PNG necesarios están versionados; `LICENSE.txt` y el crédito a Seth Boyles están presentes. |

# Requisitos técnicos

| ID | Requisito | Aceptación |
|---|---|---|
| T-001 | El motor es determinista, no depende del DOM, la red ni el teclado, y recibe comandos. | Los tests del motor pasan sin jsdom, sin red y con semilla fija. |
| T-002 | El host separa motor, render Canvas 2D, cámara, input de teclado y HUD DOM. | No hay imports del motor hacia Canvas ni del render hacia reglas de juego. |
| T-003 | El estado es serializable y el modo test expone `window.__game` con snapshot y envío de comandos. | Playwright puede leer el estado y forzar comandos sin depender del tiempo real. |
| T-004 | Tests unitarios de movimiento, diagonal, ocupación, combate, turnos, IA y final de partida; integración input→comando; E2E del loop completo. | `pnpm run verify` y `pnpm run test:e2e` pasan y cubren los criterios anteriores. |
| T-005 | Build con Vite y pnpm; sin servidores ni peticiones de red en runtime. | `pnpm run build` genera la build y la partida funciona sin red. |
| T-006 | Los assets se cargan desde el propio bundle; no se depende de itch.io en runtime. | La sala se ve con red desactivada. |
| T-007 | El repositorio se mantiene limpio y verificado con `pnpm run verify`. | No hay tests borrados, saltados o debilitados. |

# Requisitos no funcionales

- **Rendimiento:** 60 fps objetivo en un portátil corriente; la sala no debe
  provocar caídas de frame por dibujar la rejilla.
- **Accesibilidad:** teclado como único input; texto legible; contraste suficiente
  entre sprites, suelo y HUD.
- **Compatibilidad:** Chromium de escritorio como objetivo principal; Firefox y
  Safari recientes como deseables.
- **Seguridad:** sin red, sin cuentas, sin persistencia y sin datos personales.
- **Mantenibilidad:** módulos pequeños, tipos claros y tests deterministas; sin
  ECS ni motor genérico.

# Fuera de alcance

- Multijugador local hotseat y selección de personajes.
- Servidor, WebSocket, QR, salas y móviles.
- Varios niveles, generación procedural, clases, objetos y progresión.
- Arte final, animaciones de sprites, audio y efectos avanzados.
- Guardado, carga y persistencia.
- Balance fino de la economía de turno.

# Preguntas abiertas

El playtest cerró esta hoja. Las mejoras de encuadre, tamaño de sala y
movimiento por turno se recogen en [REQ-002](REQ-002-encuadre-16-9.md).

# Decisiones

| Fecha | Decisión | Quién | Estado |
|---|---|---|---|
| 2026-11-07 | Sala de 32×24 con cámara con recorrido real. | human:simon | aceptada |
| 2026-11-07 | Movimiento instantáneo entre casillas. | human:simon | aceptada |
| 2026-11-07 | Usar el pack 32rogues como arte placeholder. | human:simon | aceptada |
| 2026-11-07 | No hacer experimento antes de construir; la economía provisional se usa tal cual y el playtest decide después. | requirements-writer | aceptada |
| 2026-11-07 | Playtest del primer hito: HUD y feedback de ataque aprobados. La cámara, la sala y el movimiento se revisan en REQ-002. | human:simon | aceptada |

La licencia y el uso del pack se registran en
[ADR-006](../decisions/ADR-006-arte-placeholder-32rogues.md).

# Aceptación de la hoja

- [x] El usuario ha aprobado las decisiones creativas.
- [x] Los requisitos son verificables.
- [x] Las dependencias están claras.
- [x] Se puede generar un grafo de tareas.
- [x] Está claro el fuera de alcance.
- [x] No hay contradicciones abiertas.
- [x] El usuario ha hecho el playtest de la build.
