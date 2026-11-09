---
type: Requirement Sheet
id: REQ-002
title: Encuadre 16:9, mapa 12×12 y ajustes de sala
description: Marco horizontal 16:9 con sub-viewport cuadrado de 12×12 tiles, paneles laterales negros, sala 20×20 y más movimiento por turno.
status: stable
version: 2
decision_owner: human:simon
review_required: true
created_at: 2026-11-07T16:20:00Z
updated_at: 2026-11-07T17:10:00Z
related_tasks: [TASK-0004, TASK-0005, TASK-0006]
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T17:10:00Z }
verified:
  - by: human:simon
    at: 2026-11-07T17:10:00Z
    note: Aprueba la v2 con sala 20×20, MP 6/4, HUD fuera del marco y posiciones (4,4)/(15,15).
---

# Contexto

El playtest de `REQ-001` cerró el primer hito: el HUD, el feedback de ataque y el
loop mover → atacar → terminar turno se entienden. La cámara actual muestra
demasiada sala de golpe y el recorrido hasta el enemigo se siente largo.

Esta hoja recoge los cambios pedidos para el siguiente corte. La v2 cierra los
valores de sala, movimiento, HUD y posiciones iniciales, y está aprobada para
generar las tareas del milestone.

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
| R-005 | La altura lógica del marco es 12×32 = 384 px. La anchura se deriva de 16:9. | El marco lógico mide 384 px de alto y 682,67 px de ancho; el render de respaldo usa 2048×1152 (3×) para conservar 16:9 exacto con píxeles enteros. |
| R-006 | El marco se escala al tamaño de la ventana del navegador sin distorsión, con bandas negras si el espacio disponible no coincide. | A 1280×720, 1920×1080 y una ventana estrecha, el marco mantiene la proporción y se ve nítido. |
| R-007 | La cámara sigue al jugador dentro del sub-viewport de 12×12 y se limita a los bordes del mapa. | Al moverse, el jugador se mantiene centrado; cerca de un borde la cámara se detiene y el jugador sigue visible. |
| R-008 | La sala mide 20×20 casillas, más pequeña que la actual 32×24. | La sala deja 8 tiles de recorrido de cámara por eje, no se siente vacía y el enemigo aparece en 2-3 turnos. |
| R-009 | El jugador tiene 6 MP por turno y el enemigo 4 MP. | El jugador recorre más distancia sin que el turno se vuelva interminable; el enemigo conserva presión. |
| R-010 | El HUD, el ataque y el feedback actual se mantienen sin cambios en este corte. | El HUD sigue mostrando vida, MP, acción, fase y vida del enemigo; el ataque conserva flash y número de daño. |
| R-011 | Posiciones iniciales: jugador en (4,4) y enemigo en (15,15). | Al arrancar no se ve al enemigo; a 6 MP entra en el viewport en unos 2 turnos. |

> **Revisión 2026-11-09:** el MP enemigo ya no es único. [REQ-009](REQ-009-percepcion-alarma-huida.md)
> v4 fija MP por tipo (Centinela 5, Bruto 4, Cobarde 6). La R-009 y la decisión
> del 2026-11-07 describen el corte histórico de 20×20.

# Requisitos técnicos

| ID | Requisito | Aceptación |
|---|---|---|
| T-001 | Separar resolución lógica, resolución interna y resolución de pantalla. El espacio lógico mide 384 px de alto (682,67 de ancho), se dibuja en un canvas interno de 2048×1152 (3×) y se presenta por CSS al tamaño disponible. | El canvas lógico no cambia con la ventana; el 3× es solo resolución interna y la escala de presentación es responsive, conservando 16:9 exacto. |
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

Ninguna. Los valores de sala, MP, HUD y posiciones iniciales están cerrados.

# Decisiones

| Fecha | Decisión | Quién | Estado |
|---|---|---|---|
| 2026-11-07 | Marco 16:9 con mapa cuadrado 12×12 centrado y laterales negros. | human:simon | aceptada |
| 2026-11-07 | Altura lógica del marco: 12×32 = 384 px, escalada al navegador. | human:simon | aceptada |
| 2026-11-07 | Sala de 20×20 casillas. | human:simon | aceptada |
| 2026-11-07 | Jugador con 6 MP por turno; enemigo con 4 MP. | human:simon | aceptada |
| 2026-11-07 | HUD y feedback de ataque se mantienen fuera del marco. | human:simon | aceptada |
| 2026-11-07 | Posiciones iniciales: jugador (4,4) y enemigo (15,15). | human:simon | aceptada |
| 2026-11-07 | Render de respaldo 2048×1152 (3×) para 16:9 exacto y pixel art nítido. | requirements-writer | aceptada |

# Aceptación de la hoja

- [x] El usuario ha descrito las decisiones creativas.
- [x] El usuario ha aprobado la hoja completa.
- [x] Los valores de sala, MP y posiciones iniciales están cerrados.
- [x] Los requisitos son verificables.
- [x] Se puede generar un grafo de tareas.
- [x] No hay contradicciones abiertas.
