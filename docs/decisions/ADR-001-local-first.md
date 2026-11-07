---
type: ADR
title: "ADR-001: desarrollo local-first"
description: Empezar por un juego local con teclado y añadir multijugador y servidor al final.
status: stable
decision_status: accepted
decided_by: human:simon
decided_at: 2026-11-07T14:33:11Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T14:33:11Z }
---

# Contexto

El objetivo final incluye host, QR, móviles y servidor. Empezar por ahí añade
complejidad de red, despliegue, reconexión y testing multi-cliente antes de saber
si el loop local es divertido.

# Decisión

Construir en este orden:

1. Prototipo local de un jugador con teclado.
2. Multijugador local hotseat en el mismo teclado.
3. Servidor Node autoritativo, salas, QR y controladores móviles.
4. Contenido y pulido.

El motor se diseña para ser reutilizado por el servidor futuro, pero no se
implementa la red ahora.

# Consecuencias

- El primer hito es jugable sin infraestructura.
- El input se abstrae desde el principio para no depender del teclado.
- El estado es serializable y determinista.
- El host no se implementa como autoridad.
- El servidor y el QR se posponen, pero su arquitectura queda documentada.

# Alternativas descartadas

- **Empezar por el servidor y los móviles**: más riesgo y más tiempo hasta la
  primera prueba de juego.
- **Host autoritativo con WebRTC**: complica NAT, reconexión, validación y tests.
- **Servicio realtime gestionado**: viable, pero el usuario prefiere un servidor
  Node a medida.
