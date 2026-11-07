---
type: Task Brief
title: "Brief — TASK-0001: motor de partida con rejilla, turnos, combate e IA"
description: Brief de ejecución para implementar el motor determinista del primer prototipo.
task: TASK-0001
attempt: 1
status: stable
created_at: 2026-11-07T15:40:00Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T15:40:00Z }
---

# Brief — TASK-0001: motor de partida con rejilla, turnos, combate e IA

## Objetivo

Implementar el motor determinista del primer prototipo en `src/game/`, sin UI
ni host: estado serializable, comandos, reducción pura que devuelve eventos,
rejilla 32×24, movimiento, combate, orden de turnos, IA básica y final de
partida. Debe quedar cubierto por tests unitarios e integración.

## Contexto mínimo

- Requisito: `docs/requirements/REQ-001-primer-prototipo-local.md` (T-001,
  R-003, R-004, R-005).
- Reglas: `docs/design/turn-economy.md`.
- Arquitectura: `docs/design/architecture.md` (motor separado de render/input,
  estado serializable, sin ECS ni motor genérico).
- Tests: `docs/quality/test-strategy.md`.
- No existe código de juego todavía; se crea `src/game/` desde cero.
- TypeScript estricto ya configurado (`strict`, `noUnusedLocals`,
  `noUnusedParameters`). Vitest incluye `src/**/*.test.ts` y
  `tests/unit/**/*.test.ts`.

## Criterios de aceptación (no cambiar)

- [ ] Existe `src/game/` con estado serializable, comandos y una función de
      reducción pura que devuelve eventos.
- [ ] La sala mide 32×24, tiene muros en el borde y suelo transitable; las
      entidades no pueden ocupar muros ni casillas ocupadas.
- [ ] El movimiento es en 8 direcciones, cuesta 1 MP por casilla (también en
      diagonal), el jugador tiene 4 MP y el enemigo 3.
- [ ] No se permite cortar esquinas: una diagonal requiere libres las dos
      casillas ortogonales adyacentes.
- [ ] Cada unidad tiene una acción por turno. El ataque básico solo funciona en
      adyacencia (incluidas diagonales), hace 5 al enemigo y 3 al jugador.
- [ ] Vida inicial: 20 del jugador y 10 del enemigo. La muerte ocurre al llegar
      a 0 y emite evento.
- [ ] `EndTurn` cierra la fase del jugador, ejecuta la fase enemiga completa y
      devuelve el control al jugador restaurando MP y acción.
- [ ] La IA elige al jugador más cercano; si está en rango, ataca; si no,
      avanza una casilla con un pathfinding simple y determinista; si no puede,
      espera.
- [ ] La partida termina en victoria si no quedan enemigos vivos y en derrota si
      no quedan jugadores vivos. `Restart` vuelve al estado inicial.
- [ ] El motor no importa DOM, Canvas, red ni teclado; no usa `Math.random` ni
      `Date.now` para reglas.
- [ ] Los tests cubren movimiento, diagonal sin corte, ocupación, MP, acción,
      combate, cambio de fase, IA, victoria, derrota y determinismo.
- [ ] `pnpm run verify` pasa y el informe incluye el commit SHA.

## Archivos y módulos relevantes

- Crear: `src/game/` (estado, tipos, rejilla, movimiento, combate, IA, turnos,
  reducción, tests).
- No tocar: `src/host/`, `src/ui/`, `experiments/`, assets, config de Vite
  salvo que sea imprescindible (no debería).
- Artefactos: `artifacts/TASK-0001/attempt-1/`.

Sugerencia de organización (no obligatoria): `types.ts`, `grid.ts`,
`movement.ts`, `combat.ts`, `ai.ts`, `turn.ts`, `engine.ts`, `index.ts` y tests
`*.test.ts` junto al código o en `tests/unit/game/`.

## Comandos y timeouts

| Comando | Timeout | Qué valida |
|---|---:|---|
| `pnpm run test` | 120 s | Unitarios e integración del motor |
| `pnpm run build` | 120 s | Typecheck estricto y build |
| `pnpm run verify` | 180 s | Docs, config, tests y build |

Todo comando debe llevar timeout explícito. No usar npm ni npx. No dejar
procesos en background.

## Restricciones

- No implementar Canvas, cámara, teclado, HUD ni overlays.
- No añadir dependencias nuevas.
- No usar ECS ni un motor genérico.
- No leer estado desde DOM ni variables globales para las reglas.
- No debilitar tests existentes.
- Mantener TypeScript estricto, sin `any` innecesario ni supresiones.
- El estado debe incluir listas de jugadores y enemigos (aunque haya uno de
  cada) para no bloquear el hotseat futuro.
- La IA debe desempatar de forma determinista (orden fijo de direcciones e
  índice de enemigo).
- El ataque no termina el turno por sí solo; el turno termina con `EndTurn`.
- El motor no puede depender de tiempo real.

## No objetivos

- Render, arte, assets, cámara, input real, sonido, animaciones.
- Balance fino, clases, objetos, progresión, persistencia.
- E2E/Playwright (no aplica a esta tarea).
- Cambiar requisitos, criterios ni alcance.

## Artefactos esperados

- `artifacts/TASK-0001/attempt-1/report.md`
- `artifacts/TASK-0001/attempt-1/test-output.txt` (salida de `pnpm run test`)
- Commit en la rama `task/TASK-0001`
- Sin capturas.

## Qué debe devolver el runner

1. Resumen de lo implementado y organización de `src/game/`.
2. Lista de archivos creados/modificados.
3. Comandos ejecutados con timeout y resultado (`test`, `build`, `verify`).
4. Commit SHA de la rama `task/TASK-0001`.
5. Cobertura de cada criterio de aceptación por test (tabla criterio → test).
6. Desviaciones, decisiones menores y preguntas abiertas.
7. Confirmación de que no ha tocado UI/host/experimentos ni debilitado tests.
