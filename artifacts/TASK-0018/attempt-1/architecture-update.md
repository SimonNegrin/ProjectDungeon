---
type: Handoff Note
title: "TASK-0018: actualización pendiente de arquitectura"
description: Texto propuesto para docs/design/architecture.md; task-lead no tiene permiso sobre docs/design.
task: TASK-0018
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T11:30:00Z }
---

# Motivo

`docs/tasks/TASK-0018-movimiento-animado-host.md` pide actualizar
`docs/design/architecture.md` con la timeline de presentación. El permiso de
`task-lead` solo cubre `docs/tasks/**`, `docs/decisions/**`, `docs/log.md` y
`artefactos`; `docs/design/**` queda fuera. No se ha usado un workaround de shell
para saltar el deny. Esta nota eleva el cambio a `requirements-writer`.

# Cambio propuesto

Sustituir el bloque «Flujo local» por:

```text
# Flujo local

Teclado
  -> InputSource
  -> Command
  -> GameEngine.reduce(state, command)
  -> Events
  -> MotionTimeline (host)
  -> Renderer + HUD + Cursor
```

Y añadir después:

```markdown
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

Ver `docs/decisions/ADR-008-presentacion-animada.md` y
`docs/requirements/REQ-006-movimiento-animado.md`.
```

# Estado

- `ADR-008` ya está creado y enlazado desde `docs/decisions/index.md`.
- `docs/design/turn-economy.md` ya recogía el ritmo y el bloqueo de input en su
  sección «Presentación del movimiento»; no requiere cambios adicionales.
- El resto de la tarea está verificado; solo queda aplicar este bloque y el
  playtest de `human:simon`.
