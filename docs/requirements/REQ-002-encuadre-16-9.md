---
type: Requirement Sheet
id: REQ-002
title: Encuadre 16:9, mapa 12×12 y ajustes de sala
description: Marco horizontal 16:9 con sub-viewport cuadrado de 12×12 tiles, paneles laterales negros, sala más pequeña y más movimiento por turno.
status: draft
version: 1
decision_owner: human:simon
review_required: true
created_at: 2026-11-07T16:20:00Z
updated_at: 2026-11-07T16:20:00Z
related_tasks: []
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T16:20:00Z }
verified:
---

# Contexto

El playtest de `REQ-001` cerró el primer hito: el HUD, el feedback de ataque y el
loop mover → atacar → terminar turno se entienden. La cámara actual muestra
demasiada sala de golpe y el recorrido hasta el enemigo se siente largo.

Esta hoja recoge los cambios pedidos para el siguiente corte. Es un borrador:
no genera tareas hasta que el usuario apruebe las decisiones creativas y se
resuelvan los valores exactos de sala y movimiento.

# Objetivos de experiencia

- Que la sala se lea como un tablero táctico compacto, no como un mapa amplio.
- Que el jugador vea solo la información necesaria para decidir.
- Reservar un espacio estable para las futuras fichas de personaje sin romper
  el encuadre.
- Mantener el HUD y el feedback de ataque que ya funcionan.

# Requisitos creativos

| ID | Requisito | Aceptación |
|---|---|---|
| R-001 | El juego se renderiza dentro de un marco horizontal con relación 16:9. | El marco conserva 16:9 al redimensionar y no deforma la imagen. |
| R-002 | Dentro del marco, el mapa ocupa un sub-viewport cuadrado 1:1, centrado. | El mapa es un cuadrado perfecto, centrado horizontal y verticalmente en el marco 16:9. |
| R-003 | El sub-viewport del mapa muestra exactamente 12×12 tiles, a 32 px lógicos por tile. | Se ven 12 columnas y 12 filas; el jugador queda centrado salvo en los bordes del mapa. |
| R-004 | Los laterales que quedan fuera del cuadrado son negros y quedan reservados para futuras fichas de personaje. | No hay arte ni HUD en esos laterales; son negro plano en este corte. |
| R-005 | La altura lógica del marco es 12×32 = 384 px. La anchura se deriva de 16:9. | El marco lógico mide 384 px de alto y 682,67 px de ancho (o el entero más cercano que conserve la proporción). |
| R-006 | El marco se escala al tamaño de la ventana del navegador sin distorsión, con bandas negras si el espacio disponible no coincide. | A 1280×720, 1920×1080 y una ventana estrecha, el marco mantiene la proporción y se ve nítido. |
| R-007 | La cámara sigue al jugador dentro del sub-viewport de 12×12 y se limita a los bordes del mapa. | Al moverse, el jugador se mantiene centrado; cerca de un borde la cámara se detiene y el jugador sigue visible. |
| R-008 | La sala es algo más pequeña que la actual 32×24. Propuesta pendiente: 20×20. | La sala permite recorrido de cámara y no se siente vacía; el enemigo aparece en pocos turnos. |
| R-009 | El jugador tiene algo más de movimiento por turno. Propuesta pendiente: 6 MP. | El jugador puede recorrer más distancia sin que el turno se vuelva interminable. |
| R-010 | El HUD, el ataque y el feedback actual se mantienen sin cambios en este corte. | El HUD sigue mostrando vida, MP, acción, fase y vida del enemigo; el ataque conserva flash y número de daño. |

# Requisitos técnicos

| ID | Requisito | Aceptación |
|---|---|---|
| T-001 | Separar resolución lógica y resolución de pantalla. El juego se dibuja a 384 px de alto y se escala de forma proporcional. | El canvas lógico no cambia con la ventana; solo cambia su escala de presentación. |
| T-002 | El sub-viewport del mapa tiene 12×12 tiles y se dibuja centrado en el marco 16:9. | La cámara y el render usan un viewport de 12×12, no el tamaño del navegador. |
| T-003 | Los paneles laterales son zonas negras del marco, no parte del mapa ni del motor. | El motor sigue sin conocer el layout; el host decide dónde dibujar el mapa. |
| T-004 | Mantener el determinismo, `window.__game` y los tests existentes; actualizar dimensiones y expectativas. | Los tests de motor, host y E2E pasan con el nuevo encuadre. |
| T-005 | Escalado nítido de pixel art: sin suavizado y con proporción conservada. | Los tiles y sprites no se ven borrosos ni estirados. |
| T-006 | No introducir dependencias nuevas para el layout. | El layout se resuelve con Canvas, CSS y matemáticas simples. |

# Requisitos no funcionales

- **Rendimiento:** el nuevo encuadre no debe reducir los 60 fps objetivo.
- **Accesibilidad:** el HUD sigue siendo legible; el marco no debe cortar texto ni controles.
- **Compatibilidad:** Chromium de escritorio como objetivo; Firefox y Safari recientes como deseables.
- **Mantenibilidad:** el layout del host debe ser una función pura y testeable.
- **Seguridad:** sin red, sin persistencia y sin datos personales.

# Fuera de alcance

- Fichas de personaje en los laterales; solo se reserva el espacio negro.
- Rediseño del HUD o del feedback de ataque.
- Nuevas mecánicas de combate, clases, objetos o niveles.
- Hotseat, servidor, QR y móviles.
- Arte final y animaciones.

# Preguntas abiertas

- Confirmar el tamaño exacto de la sala: propuesta 20×20.
- Confirmar el MP del jugador: propuesta 6. ¿El enemigo también aumenta su
  movimiento o mantiene un paso por fase?
- Confirmar si el HUD actual queda fuera del marco 16:9, como ahora, o pasa a
  superponerse dentro. La propuesta es mantenerlo fuera para no cambiar lo que
  ya funciona.
- Confirmar las posiciones iniciales de jugador y enemigo para que el enemigo
  aparezca en pocos turnos.

# Decisiones

| Fecha | Decisión | Quién | Estado |
|---|---|---|---|
| 2026-11-07 | Marco 16:9 con mapa cuadrado 12×12 centrado y laterales negros. | human:simon | aceptada |
| 2026-11-07 | Altura lógica del marco: 12×32 = 384 px, escalada al navegador. | human:simon | aceptada |
| 2026-11-07 | Sala algo más pequeña y más movimiento por turno; valores exactos pendientes. | human:simon | pendiente de concretar |
| 2026-11-07 | HUD y feedback de ataque se mantienen. | human:simon | aceptada |

# Aceptación de la hoja

- [x] El usuario ha descrito las decisiones creativas.
- [ ] El usuario ha aprobado la hoja completa.
- [ ] Los valores de sala, MP y posiciones iniciales están cerrados.
- [ ] Los requisitos son verificables.
- [ ] Se puede generar un grafo de tareas.
- [ ] No hay contradicciones abiertas.
