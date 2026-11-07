---
type: Scope
title: Alcance y fases
description: Alcance vigente, hitos y límites del proyecto.
status: draft
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T14:33:11Z }
---

# Alcance vigente

Estamos en la **fase 0**. El objetivo inmediato es tener documentación, arnés y
un shell de experimentos fiable. El primer hito jugable será una sola sala, un
jugador, un enemigo, teclado, cámara y turnos.

# Fases

| Fase | Objetivo | Estado |
|---|---|---|
| 0 | Documentación base, agentes, skills y shell de experimentos | En curso |
| 1 | Prototipo local de un jugador con teclado | Pendiente |
| 2 | Multijugador local hotseat en el mismo teclado | Pendiente |
| 3 | Servidor Node autoritativo, salas, QR y móviles | Pendiente |
| 4 | Contenido: clases, objetivos, niveles, arte y audio | Pendiente |

# Primer hito jugable

- Una sala de rejilla cuadrada.
- Un jugador controlado con teclado.
- Un enemigo controlado por IA simple.
- Cámara que sigue al jugador activo.
- Fase de jugadores y después fase de enemigos.
- Movimiento y ataque en diagonal.
- Puntos de movimiento y una acción por turno.
- Victoria al eliminar a todos los enemigos; derrota si el jugador cae.
- Arte placeholder y HUD mínimo.

Los valores concretos de la economía de turno son provisionales y viven en
[la economía de turno](design/turn-economy.md).

# Decisiones confirmadas

- El juego es local-first.
- El host es solo pantalla.
- Ahora se juega con teclado; después, hotseat; al final, controladores remotos.
- El servidor será Node a medida y las partidas vivirán en memoria.
- El motor será TypeScript y Canvas 2D.
- La rejilla es cuadrada; movimiento y ataque diagonales.
- Todos los jugadores actúan y después todos los enemigos.
- Hasta 6 jugadores en el futuro; el primer prototipo es de 1.
- Un solo nivel por ahora; habrá varios niveles en el futuro.
- La cámara sigue al jugador activo.

# Fuera de alcance ahora

- Servidor, WebSocket, QR y salas.
- Cuentas, base de datos, matchmaking y persistencia.
- Multijugador local y remoto.
- Arte y audio finales.
- Generación procedural de mazmorras en producción.
- Múltiples niveles, clases y objetivos.

# Restricciones

- Debe funcionar en navegador de escritorio para el host.
- Los controladores futuros serán móviles; la UI deberá ser táctil y legible.
- El motor no dependerá del DOM, de la red ni del teclado.
- La documentación debe ser OKF y validable.
- El usuario no debe tener que revisar código para tomar decisiones creativas.
