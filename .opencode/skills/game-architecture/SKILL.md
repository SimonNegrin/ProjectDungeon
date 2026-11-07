---
name: Game Architecture
description: Diseñar y revisar el motor local-first, el input, el render y la futura capa de red sin sobreingeniería.
---

# Cuándo usarla

Al diseñar el motor, el estado, los comandos, el render, el input o la futura
capa de servidor.

# Principios

- Motor puro y determinista.
- Estado serializable.
- Input separado: teclado ahora, comandos de red después.
- Render separado: Canvas solo en el host.
- Una sola fuente de verdad: `GameEngine`.
- Nada de ECS, Phaser ni framework de gameplay en el primer hito.
- No construir el servidor hasta la fase 3.

# Flujo

```text
InputSource -> Command -> GameEngine -> Events -> Renderer/HUD
```

El motor no lee teclado, no dibuja y no usa `Date.now()` para reglas.

# Estado

Incluye:

- rejilla y mapa;
- jugadores;
- enemigos;
- turno y fase;
- recursos (MP, acción);
- eventos pendientes;
- semilla y RNG.

Debe poder serializarse y compararse en tests.

# Futuro servidor

- Node autoritativo.
- WebSocket.
- Salas en memoria.
- El servidor emite el ID de sala.
- El host es un cliente.
- El motor se reutiliza en servidor y tests.

# Testing

- Exponer `?test=1&seed=...`.
- Exponer `window.__game`.
- Permitir paso manual.
- Evitar aleatoriedad no determinista.

# Checklist

- [ ] El motor no depende del DOM.
- [ ] El input está abstraído.
- [ ] El estado es serializable.
- [ ] El RNG tiene semilla.
- [ ] Los tests no dependen del tiempo real.
- [ ] No se ha añadido infraestructura de red antes de tiempo.
