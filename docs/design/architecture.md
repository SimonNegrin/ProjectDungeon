---
type: Architecture
title: Arquitectura local-first
description: Separación entre motor, render, input y la futura capa de red.
status: draft
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T11:04:36Z }
---

# Principios

- **Local-first**: primero un juego local con teclado; la red llega al final.
- **Motor determinista**: mismo estado, comandos y semilla producen el mismo
  resultado.
- **Render separado**: el motor no conoce Canvas ni el DOM.
- **Input separado**: el motor recibe comandos, no teclas.
- **Estado serializable**: el estado debe poder guardarse, compararse y enviarse
  por red en el futuro.
- **Sin sobreingeniería**: nada de ECS ni motor genérico para el primer hito.

# Módulos previstos

```text
src/
  game/        # Estado, reglas, turnos, rejilla, combate, IA
  host/        # Canvas, cámara, input de teclado, HUD
  ui/          # Componentes de HUD y overlays
  shared/      # Tipos y utilidades compartidas
  server/      # Fase remota, todavía no existe
  controller/  # Fase remota, todavía no existe
```

El shell de experimentos vive en `experiments/` y no debe ser importado por
producción. El código validado en un experimento se promociona a `src/`.

# Flujo local

```text
Teclado
  -> InputSource
  -> Command
  -> GameEngine.reduce(state, command)
  -> Events
  -> MotionTimeline (host)
  -> Renderer + HUD + Cursor
```

El motor no lee teclado, no dibuja y no usa `Date.now()` para reglas. El bucle de
render puede usar tiempo real, pero la simulación de turnos avanza por comandos
y eventos.

# Presentación del movimiento

El motor resuelve cada comando de movimiento de forma atómica. El host no vuelve
a simular: `src/host/motion.ts` construye una timeline de presentación con los
eventos ordenados de la acción (`UnitMoved` con `from`, `to` y `mpLeft`, más los
eventos de ataque, turno y fin de partida).

- **Estado**: el estado del motor es la única verdad. La timeline produce
  overrides de posición y cámara para el render, y un estado derivado para HUD y
  overlay; no muta ni sustituye el estado del motor.
- **Ritmo**: una única `MOTION_CONFIG` con 125 ms por paso, 70 ms de pausa por
  tile (inicio, intermedios y destino) y diagonal a duración constante. `n`
  pasos generan `n + 1` pausas.
- **Reloj**: `requestAnimationFrame` con delta acotado; el avance interno usa
  subtramos para no saltar fases. `prefers-reduced-motion: reduce` aplica el
  estado final de forma instantánea.
- **Render**: las posiciones visuales son centros de tile en píxeles enteros; el
  sprite se dibuja con `imageSmoothingEnabled = false` y el recorte del viewport
  existente. La cámara sigue a la unidad animada, redondea a entero y se limita
  al mapa; mover el cursor no la desplaza.
- **Input**: durante la animación se descartan las intenciones de juego; `F1` y
  `R` siguen activos y `R` cancela. `window.__game.dispatch` completa la
  presentación pendiente antes de aplicar un comando de test.
- **Debug**: `window.__game` expone `animation` (activa, paso, posición visual,
  cámara) y `advance(ms)` para avanzar el reloj de presentación de forma
  determinista, sin mutadores del estado vivo.

Ver [ADR-008](../decisions/ADR-008-presentacion-animada.md) y
[REQ-006](../requirements/REQ-006-movimiento-animado.md).

# Render del host

- **Canvas 2D** con resolución lógica fija y escalado por `devicePixelRatio`.
- **Cámara**: sigue a la unidad activa, redondea a píxel entero y se limita al
  mapa. El HUD no se transforma con la cámara.
- **Capa**: HUD en DOM, no dibujado en Canvas; el Canvas no es accesible por sí
  solo, así que el HUD refleja vida, turno y fase con `data-testid` y `aria-live`
  para los eventos importantes. No se depende solo del color.
- **Orden de dibujo**: limpiar, tilemap, entidades, efectos y overlay de debug.
- **Debug y test**: `?debug=1`, `?test=1&seed=...`, `window.__game` y paso manual
  determinista. Nada de animaciones no deterministas en modo test.
- **Rendimiento**: evitar objetos por frame, precargar assets, un solo canvas
  para el tablero y medir antes de optimizar. El modo test no usa reloj real.

# Flujo remoto futuro

```text
Móvil -> WebSocket -> Servidor autoritativo
                         -> GameEngine
                         -> Events -> Host (Canvas)
```

El host seguirá siendo una pantalla. El servidor emitirá el identificador de
sala y el host mostrará el QR. El servidor validará las acciones; el cliente no
será autoridad.

# Tecnología

- TypeScript.
- pnpm como gestor de paquetes.
- Vite para desarrollo y build.
- Canvas 2D para el tablero del host.
- DOM/CSS para HUD, controles y experimentos.
- Vitest para unitarios.
- Playwright para E2E y capturas.
- Node para scripts y, más adelante, servidor.

Ver [ADR-002](../decisions/ADR-002-stack.md) y
[ADR-004](../decisions/ADR-004-pnpm.md).

# Cámara y mapa

- Mapa de rejilla cuadrada.
- Cámara que sigue al jugador activo y se limita al mapa.
- Tilemap con capas desde el punto de vista del modelo, aunque el primer nivel
  sea una sola sala.
- Varios niveles y profundidad se posponen.

# Testing

- Unitarios: movimiento, diagonal, colisiones, turnos, combate, IA, victoria.
- Integración: input -> comando -> estado -> eventos.
- E2E: partida local corta con Playwright.
- Visual: capturas de estados clave y modo test determinista.
- Manual: playtest del usuario para sensación y legibilidad.

# No objetivos

- Servidor, WebSocket, QR, salas y reconexión en la fase actual.
- Persistencia en base de datos.
- Multijugador local o remoto.
- Arte y audio finales.
- Generación procedural como sistema de producción.
