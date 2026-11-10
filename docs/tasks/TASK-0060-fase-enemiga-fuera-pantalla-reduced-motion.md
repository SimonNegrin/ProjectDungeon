---
type: Task
id: TASK-0060
title: "Fase enemiga fuera de pantalla y movimiento reducido"
description: "Atajo de 150 ms para acciones enemigas fuera de pantalla sin cámara ni tween, presentación completa al cruzar el borde y modo reducido sin animación."
status: draft
task_status: done
task_type: feature
requirement: REQ-017
requirement_ids: [R-022, R-023, R-024, R-025, T-009, T-010, T-012]
depends_on: [TASK-0057, TASK-0058, TASK-0059]
unlocks: [TASK-0061]
created_at: 2026-11-10T01:00:00Z
completed_at: 2026-11-10T19:42:00Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0060/
priority: P2
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-10T01:00:00Z }
verified:
  - by: task-lead
    at: 2026-11-10T19:42:00Z
    note: >-
      Intento 1 verificado en `task/TASK-0060` (código `edf671b`). Recorrido
      fuera/fuera colapsado a 150 ms sin pasos, tween ni foco; cruce de borde
      animado 125/70 con cámara estable en el jugador; foco de cámara separado
      de las unidades animadas. Modo reducido con beats, pasos y pausas a 0,
      estado final en el evento, texto/banner/marca estáticos y sin sacudida,
      retorno ni fundido; input sin bloqueo en reducido y `F1`/`R` activos.
      `pnpm run verify` OK 818/818, docs, build y bundle; E2E TASK-0060 3/3,
      reducido existente 1/1 y enemigo fuera del viewport 1/1. Sin cambios en
      `src/game/`, dependencias ni tests debilitados.
---

# Objetivo

Que la fase enemiga no se arrastre cuando actúa fuera de la pantalla y que
`prefers-reduced-motion` elimine la animación sin perder información. Se apoya
en la política de visibilidad y foco de
[ADR-017](../decisions/ADR-017-feedback-visual-eventos.md).

# Contexto

- Reglas: REQ-017 «Input y fase enemiga» y «Lenguaje visual y legibilidad»
  (R-022, R-023, R-024, R-025).
- Punto de partida: `src/host/motion.ts` (cámara y foco), `main.ts` (bucle,
  input) y `renderer.ts`.
- Hoy la cámara sigue a la unidad animada y no hay atajo fuera de pantalla; el
  modo reducido solo afecta al movimiento.
- La visibilidad se decide en el host con cámara y viewport; el motor no conoce
  pantalla ni cámara.

# Criterios de aceptación

- [x] Un enemigo visible se presenta con su beat completo y la cámara lo sigue.
- [x] Si su recorrido empieza y termina fuera del viewport, el beat es de 150 ms,
      no hay seguimiento de cámara ni tween por tile; la nueva posición se ve al
      inicio del beat y el orden de acciones no cambia.
- [x] Si el enemigo entra o sale del viewport, se presenta el recorrido completo;
      la cámara no se mueve si el foco no es el jugador.
- [x] Con `prefers-reduced-motion: reduce` no hay tween, sacudida ni parpadeo; los
      beats se colapsan a 0, el estado final se aplica en el evento y se
      conservan texto, banner y marca estática. El orden de eventos es el mismo.
- [x] En modo reducido no hay bloqueo de input; en modo normal se bloquea y se
      descarta durante el beat, con `F1` y `R` activos.
- [x] La decisión de visibilidad y foco es del host; `src/game/` no cambia.
- [x] `pnpm run verify` pasa y no se debilitan tests.

# Plan de test

- **Unitario:** política de visibilidad (dentro, fuera, cruce de borde); foco
  suprimido; beat de 150 ms; orden de acciones; modo reducido con beats 0.
- **Integración:** input durante beats normal y reducido; `F1`/`R`; cámara del
  jugador intacta.
- **Visual:** captura de un enemigo fuera de pantalla y de un cruce de borde.
- **Regresión:** movimiento 125/70, cámara, turnos y HUD; `pnpm run verify`.
- **E2E:** las suites de feedback llegan en TASK-0061.

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0060/attempt-1/report.md`.
- [x] Salidas de `verify` y tests nuevos.
- [x] Capturas en `attempt-1/screenshots/`.
- [x] Commit SHA en la rama `task/TASK-0060`.

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm exec vitest run tests/unit/host` | 180 s |
| `pnpm run verify` | 300 s |
| `git diff --stat` | 15 s |

# Restricciones

- No cambiar reglas de turno, IA, percepción ni movimiento.
- No añadir relojes paralelos por unidad; la fase sigue siendo secuencial.
- No tocar `src/game/`, `experiments/` ni dependencias.
- No cambiar el ritmo de movimiento de REQ-006.

# No objetivos

- Efectos visuales nuevos de combate o inventario (TASK-0058 y TASK-0059).
- E2E completo y QA visual de todas las familias (TASK-0061).
- Audio, partículas o arte nuevo.
