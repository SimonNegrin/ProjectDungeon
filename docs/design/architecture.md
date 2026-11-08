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

# Combate y azar

El combate vive en `src/game/` y es puro y determinista:

- `combat.ts` resuelve impacto y daño con las fórmulas de `REQ-010`; un fallo
  consume dos tiradas y un impacto cuatro, en el orden ataque, escudo, daño y
  armadura.
- `equipment.ts` guarda el catálogo de armas, armaduras y escudos con IDs
  estables; `bestiary.ts` guarda por tipo arma, escudo, armadura, PV,
  modificadores, visión y perfil.
- `rng.ts` implementa un d6 serializable. El estado guarda la semilla y el
  contador; la misma semilla y los mismos comandos dan la misma secuencia.
- Los eventos `AttackPerformed` incluyen impacto, daño, PV resultante y tiradas;
  el host no recalcula reglas.
- El jugador y los enemigos comparten el mismo resolvedor. La recogida (`G`,
  1 MP) y el cambio de arma (`1`-`3`, gratis) son comandos del motor.

Ver [REQ-010](../requirements/REQ-010-combate-equipo-acierto-defensa.md) y
[ADR-012](../decisions/ADR-012-combate-equipo-rng.md).

# Percepción, alarma y huida

La percepción vive en `src/game/perception.ts`, es pura y no conoce DOM, Canvas,
red ni relojes:

- `visionRadius` y `canSee` aplican visión 360° con Bresenham; los muros
  bloquean y las unidades no. El bestiario es la única tabla de radios (6/4/5).
- La detección se evalúa tras cada paso aceptado de `Move`/`MoveTo` y emite
  `EnemySpotted` con el paso; no consume MP ni acción.
- `raiseAlarm` resuelve una onda de radio 8 desde el detector, sin línea de
  visión y sin cadena; los receptores comparten `lastKnown` y `hasShouted`.
- El estado de cada enemigo añade `awareness` (`dormant`/`alert`/`returning`),
  `fleeing`, `home`, `lastKnown`, `alertTurns` y `hasShouted`; todo es
  serializable y se expone en solo lectura en `window.__game.snapshot()`.
- `noteDamage` despierta al dormido y guarda la posición del atacante; la huida
  del cobarde es determinista y se decide en `planEnemyAction`.
- Los eventos `EnemySpotted`, `AlarmRaised`, `EnemyFled` y `EnemyReturned`
  permiten al host presentar el feedback sin leer estado interno.

Ver [REQ-009](../requirements/REQ-009-percepcion-alarma-huida.md).

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

# Suelo y decoración

El suelo transitable se pinta con un damero global de 1×1: paridad `(x + y) % 2`
en salas, pasillos y umbrales. Los dos colores se generan por código con un
`fillRect` por tile; no se recortan tiles de suelo del PNG. La base `#0d1519` es
común a toda la mazmorra y cada sala recibe un segundo tono de una paleta curada:
neutra, humedad, muerte/combate, ruina o vegetación. La paleta se asigna por
contraste con el ambiente, no por imitación; pasillos y umbrales usan la neutra.

Encima del damero se dibujan 33 decals planos del tileset: piedritas, hierba,
tierra, ladrillos azules y rojos, huesos, siete plantas pequeñas, setas,
cadáveres y sangre/slime. El planificador determinista asigna un ambiente
dominante por sala, con 1-3 focos locales y 20-30 % de mezcla; algunas salas son
solo dispersas. La densidad objetivo es 35 % en salas y 16 % en pasillos; como
máximo un decal por tile; nunca en apariciones ni umbrales. La decoración no se
escribe en `state.grid.tiles`, no bloquea y no añade reglas.

Ver [ADR-011](../decisions/ADR-011-suelo-programatico-ambientes.md) y
[REQ-008](../requirements/REQ-008-suelo-programatico-decoracion-ambiental.md).
El corte anterior queda en
[ADR-010](../decisions/ADR-010-damero-decoracion-presentacion.md) y
[REQ-007](../requirements/REQ-007-damero-decoracion-suelo.md).

# Render del host

- **Canvas 2D** con resolución lógica fija y escalado por `devicePixelRatio`.
- **Cámara**: sigue a la unidad activa, redondea a píxel entero y se limita al
  mapa. El HUD no se transforma con la cámara.
- **Capa**: HUD en DOM, no dibujado en Canvas; el Canvas no es accesible por sí
  solo, así que el HUD refleja vida, turno y fase con `data-testid` y `aria-live`
  para los eventos importantes. No se depende solo del color.
- **Orden de dibujo**: limpiar, base de suelo con la paleta de la sala, decals,
  camino/cursor, entidades, efectos y overlay de debug.
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
