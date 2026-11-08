---
type: Task
id: TASK-0018
title: "Host: animación de movimiento, cámara e input bloqueado"
description: Presentar cualquier UnitMoved como un recorrido animado tile a tile, con cámara continua a píxel entero, pausas, input bloqueado, cursor oculto, MP progresivo y feedback secuenciado, sin tocar el motor.
status: stable
task_status: review
task_type: feature
requirement: REQ-006
requirement_ids: [R-001, R-002, R-003, R-004, R-005, R-006, R-007, R-008, R-009, R-010, R-011, R-012, R-013, T-001, T-002, T-003, T-004, T-005, T-006, T-007, T-009, T-010]
depends_on: [TASK-0017]
unlocks: [TASK-0019]
created_at: 2026-11-08T10:26:00Z
completed_at:
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0018/
priority: P1
risk: high
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T10:26:00Z }
verified:
  - by: task-lead
    at: 2026-11-08T11:20:00Z
    note: >-
      Verificación independiente en task/TASK-0018 (commits e7cc7a9 y 6fa996a):
      diff de 10 archivos de producción/tests más artefactos; src/game/, docs/ de
      requisitos, experiments/, package.json y pnpm-lock.yaml intactos. pnpm run
      verify OK (101 documentos, 19 tareas, 3 experimentos; 360 tests en 29
      archivos; build de 53 módulos) y pnpm run test:e2e OK (32/32) reproducible;
      capturas revisadas (paso intermedio con sprite entre tiles, llegada con
      cursor y MP 4/6, fase enemiga con HUD Enemigo y cursor oculto, reduced
      motion instantáneo). Comprobados timeline 125/70/constante con n+1 pausas,
      diagonal recta, cámara entera con clamp, input descartado con F1/R activos,
      cursor oculto con puntos vivos, MP/HP progresivos, ataque tras la pausa de
      destino, overlay al final y advance determinista. Sin tests borrados,
      saltados o debilitados; las esperas E2E usan settle/advance y conservan la
      intención. Pendiente de playtest de human:simon para aprobar la sensación.
      La actualización de docs/design/architecture.md queda elevada a
      requirements-writer con el texto propuesto en
      artifacts/TASK-0018/attempt-1/architecture-update.md: el permiso de
      task-lead no incluye docs/design. Fusión en main d1b6cc2.
---

# Objetivo

Que el movimiento de jugador y enemigos se vea como un recorrido tile a tile con
transición animada y pausa, la cámara los siga y el input de juego se ignore
hasta terminar. El motor no cambia: la animación se construye en el host a partir
de los eventos ordenados.

Al terminar, la partida debe ser jugable de principio a fin con el nuevo
comportamiento: Moverse, acercarse y atacar, fase enemiga, fin de partida,
reinicio, debug, cursor, HUD y `prefers-reduced-motion`.

# Contexto

- Requisito: [REQ-006](../requirements/REQ-006-movimiento-animado.md) v2.
- Ritmo decidido en [EXP-002](../../experiments/EXP-002-ritmo-movimiento/experiment.md):
  125 ms por paso, 70 ms de pausa por tile (inicio, intermedios y destino) y
  diagonal a duración constante.
- Comando y eventos: `MoveTo` en `src/game/engine.ts`; `UnitMoved` con `from`,
  `to` y `mpLeft` en `src/game/types.ts`.
- Host actual: `src/host/main.ts`, `renderer.ts`, `camera.ts`, `input.ts`,
  `cursor.ts`, `cursor-view.ts`, `hud.ts`, `feedback.ts`, `debug.ts` y
  `session.ts`.
- Shell de referencia: `experiments/EXP-002-ritmo-movimiento/src/motion.ts` y
  `render.ts` (maqueta descartable; no se importa desde producción).
- Tests: `tests/unit/host/`, `tests/e2e/` y helpers de `tests/e2e/support.ts`.

# Criterios de aceptación

- [ ] `src/game/` no cambia. La timeline se construye desde los eventos de la
      acción y el estado del motor ya está en el destino; no se simula dos veces
      ni se muta la entrada.
- [ ] Todo `UnitMoved` se presenta animado: jugador, enemigos, `MoveTo`, `Move` y
      el acercamiento de Moverse sobre un enemigo. No hay teletransportes ni
      saltos de más de un tile.
- [ ] Cada paso recto dura 125 ms y cada pausa 70 ms, incluidas la inicial, las
      intermedias y la del destino. En diagonal la transición es recta y dura
      125 ms (duración constante). Los valores viven en una única configuración.
- [ ] El render interpola la posición del sprite entre centros de tiles con
      coordenadas enteras, recorta al viewport y conserva el pixel art nítido.
- [ ] La cámara sigue al personaje animado de forma continua, redondea a píxel
      entero, lo mantiene centrado salvo clamp y no se mueve al mover el cursor.
- [ ] El input de juego se ignora mientras hay animación: flechas/`WASD`,
      `Espacio`/`Enter`, `F` y `E` se descartan, no se encolan. `F1` alterna el
      debug y `R` reinicia y cancela la animación. El botón de reinicio hace lo
      mismo que `R`.
- [ ] `window.__game.dispatch` completa la animación pendiente antes de aplicar
      el comando, para que los E2E sigan siendo deterministas.
- [ ] El cursor no se dibuja durante el recorrido; los puntos del camino siguen
      visibles y se apagan al ser recorridos. Al terminar, el cursor reaparece en
      su tile y se limita al viewport.
- [ ] El MP del HUD baja paso a paso conforme a cada `mpLeft`; al terminar
      coincide con el estado del motor.
- [ ] Si el plan incluye atacar tras acercarse, el flash y el daño se presentan
      después del último paso y su pausa; el enemigo no recibe daño antes. Si
      muere, la muerte se presenta al final.
- [ ] En la fase enemiga se anima cada enemigo en orden y el cursor/turno del
      jugador aparece después de la última animación.
- [ ] El overlay de victoria o derrota espera al final de la animación en curso.
- [ ] Con `prefers-reduced-motion: reduce` el movimiento es instantáneo, sin
      tween ni pausa, con el mismo estado final y orden de eventos.
- [ ] `window.__game` expone `animating`, paso actual, posición visual y cámara,
      y ofrece un avance determinista del reloj de presentación para tests. No
      se exponen mutadores del estado vivo.
- [ ] Tests nuevos de timeline, interpolación recta y diagonal, pausas, cámara
      con clamp, input bloqueado, MP progresivo, ataque tras caminar, fase
      enemiga, fin de partida y reduced motion. Los E2E existentes siguen
      pasando con esperas explícitas si hace falta; no se debilitan.
- [ ] `ADR-008` registra la presentación animada sobre motor atómico. Se
      actualizan la economía de turno y la arquitectura. Sin dependencias nuevas.
- [ ] `pnpm run verify` y `pnpm run test:e2e` pasan.

# Plan de test

- **Unitario:** construcción de la timeline desde eventos; duración de paso y
  pausa; diagonal a duración constante; interpolación con redondeo entero;
  cámara centrada y con clamp; avance del reloj con deltas grandes; input gate;
  MP por paso; orden de ataque; reduced motion.
- **Integración:** `session.dispatch` + timeline + render/DOM; movimiento del
  jugador y del enemigo; `R` a mitad; `F1` a mitad; fin de partida.
- **E2E existentes:** ajustar esperas a `animating` o al modo instantáneo donde
  corresponda, sin cambiar las aserciones de intención.
- **Visual:** capturas de un paso intermedio, llegada, fase enemiga y reduced
  motion en `artifacts/TASK-0018/attempt-1/screenshots/`.
- **Manual:** el usuario juega una partida corta y valida la sensación.

# Comandos y timeouts

| Comando | Timeout | Qué valida |
|---|---:|---|
| `pnpm run test` | 120 s | Unitarios de host y motor |
| `pnpm run verify` | 180 s | Docs, config, tests y build |
| `pnpm run test:e2e` | 240 s | Regresiones de UI/Canvas |
| `pnpm run build` | 120 s | Build de producción |

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0018/attempt-1/report.md`
- [ ] Salida de tests en `artifacts/TASK-0018/attempt-1/test-output.txt`
- [ ] Capturas de paso intermedio, llegada, fase enemiga y reduced motion
- [ ] Commit SHA en la rama `task/TASK-0018`

# Restricciones

- No cambiar reglas, comandos, eventos, pathfinding, economía ni combate.
- No tocar `docs/requirements/`; `ADR-008` y la documentación de diseño los
  escribe el `task-lead`.
- No añadir dependencias ni importar desde `experiments/`.
- No borrar, saltar ni debilitar tests existentes.
- Los valores 125/70/duración constante no se reinterpretan; si la sensación
  falla, se escala al `requirements-writer`.

# No objetivos

- Ciclos de caminar, rebote, polvo, sonido o arte nuevo.
- Animar el cursor o la cámara al mover el cursor.
- Cambiar el viewport, el HUD o el encuadre.
- Hotseat, red o persistencia.
- Añadir la cobertura E2E nueva del movimiento (es `TASK-0019`).

# Notas

- La maqueta `EXP-002` sirve como referencia de ritmo y de timeline, pero su
  código es descartable.
- La pausa inicial forma parte del recorrido: `n` pasos producen `n + 1` pausas.
- Si una pestaña queda en segundo plano, el delta debe acotarse para no adelantar
  varios pasos de golpe.
