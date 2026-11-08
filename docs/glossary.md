---
type: Glossary
title: Glosario
description: Términos compartidos por el equipo humano y los agentes.
status: draft
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T14:33:11Z }
---

# Glosario

| Término | Definición |
|---|---|
| **Host** | Pestaña o pantalla compartida que muestra la partida. No es la autoridad del estado. |
| **Controlador** | Interfaz del jugador. En la fase remota será el móvil; ahora es el teclado. |
| **Sala de juego** | Sesión de juego identificada por un código. En remoto la emite el servidor. En las hojas de requisitos, «sala» sin calificar suele referirse a una sala de la mazmorra. |
| **Sala de la mazmorra** | Habitación rectangular generada por BSP; unidad `Room` del mapa. |
| **Fase de jugadores** | Periodo en el que cada jugador usa su turno, en orden fijo. |
| **Fase enemiga** | Periodo posterior en el que actúan todos los enemigos. |
| **MP** | Puntos de movimiento disponibles en un turno. |
| **Acción** | Una intervención táctica: atacar, interactuar o esperar. |
| **Hotseat** | Varios jugadores comparten el mismo teclado y juegan por turnos. |
| **Local-first** | Construir y validar el juego en local antes de añadir red. |
| **Experimento** | Página interactiva que responde una pregunta de diseño o técnica y registra una decisión. |
| **Requisito** | Necesidad creativa o técnica aprobada, con criterios de aceptación. |
| **Tarea** | Unidad atómica de trabajo derivada de un requisito. |
| **Artefacto** | Evidencia de una tarea: informe, tests, capturas, logs o diff. |
| **OKF** | Open Knowledge Format: Markdown con frontmatter YAML y enlaces. |
| **Determinista** | Mismo estado inicial, comandos y semilla producen el mismo resultado. |
| **Semilla** | Valor que inicializa el generador pseudoaleatorio. |
| **RNG sembrado** | Generador pseudoaleatorio determinista inicializado por la semilla; su estado es serializable y reproducible. |
| **Acierto** | Modificador del personaje que se suma al acierto del arma para resolver el impacto. |
| **Defensa** | Modificador del personaje que se suma al escudo para resistir el impacto. |
| **Escudo** | Equipo que suma a la defensa; decide si un ataque impacta, no cuánto duele. |
| **Armadura** | Equipo que resta al daño de un impacto; no evita el impacto. |
| **Modificador** | Valor por personaje de acierto, daño o defensa; es un dato serializable. |
| **Equipo** | Arma, escudo y armadura de una unidad, guardados por IDs en el estado. |
| **Damero** | Patrón de suelo de dos colores planos generados por código que alternan por tile; la paridad es global `(x + y) % 2` y no se reinicia por sala. |
| **Paleta de sala** | Par de colores del damero: una base común para la mazmorra y un segundo tono curado por sala. Se asigna por contraste con el ambiente, no por imitación. |
| **Ambiente decorativo** | Familia dominante de decoración de una sala: humedad, muerte/combate, ruina, vegetación o mixta. Se materializa en focos locales con mezcla. |
| **Decoración** | Decal plano del tileset dibujado sobre el suelo; no bloquea, no se escribe en la rejilla y no cambia reglas. |
| **Percepción** | Regla que decide si un enemigo ve a un jugador: visión 360°, radio por tipo y línea de visión de Bresenham; los muros bloquean y las unidades no. |
| **Dormido** | Estado `dormant`: el enemigo no se mueve, no ataca y no patrulla hasta ver a un jugador, recibir daño o una alarma. |
| **Alerta** | Estado `alert`: el enemigo persigue la última posición conocida y ataca si llega a adyacencia con acción. |
| **Regreso** | Estado `returning`: el enemigo vuelve a su puesto sin atacar y se duerme al llegar. |
| **Alarma** | Onda única de radio 8 al ver por primera vez en un episodio; alerta a los enemigos vivos dentro del radio, sin línea de visión y sin cadena. |
| **Última posición conocida** | `lastKnown`: punto al que acude un enemigo alertado o al que se comparte la alarma. |
| **Memoria** | `alertTurns`: 2 fases enemigas investigando y 1 volviendo antes de dormirse. |
| **Huida** | Movimiento determinista del perfil cobarde tras un golpe de ≥40 % de sus PV máximos: rompe la línea de visión y maximiza la distancia; acorralado, lucha. |
| **Debug hook** | API de desarrollo que expone estado o permite avanzar el juego en tests. |
| **Playtest** | Sesión en la que el usuario prueba una build y evalúa sensaciones. |
