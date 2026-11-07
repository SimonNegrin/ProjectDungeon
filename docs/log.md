# Historial del bundle

## 2026-11-07

* **Requirement**: El usuario aprueba `REQ-002` v2: sala 20×20, jugador (4,4) / enemigo (15,15), 6 MP de jugador y 4 de enemigo, HUD fuera del marco y render de respaldo 2048×1152 (3×) para 16:9 exacto.
* **Task**: Se crean `TASK-0004` (motor: sala y MP), `TASK-0005` (host: encuadre 16:9 y viewport 12×12) y `TASK-0006` (E2E y QA visual), secuenciales.
* **Design**: Se actualiza la economía de turno provisional con sala 20×20, posiciones iniciales, viewport 12×12 y MP 6/4.
* **Milestone**: La fase 1 se cierra tras el playtest de `REQ-001`. El usuario aprueba el HUD, el feedback de ataque y el loop de turnos; pide un encuadre 16:9 con mapa cuadrado de 12×12, laterales negros, sala más pequeña y más movimiento por turno.
* **Requirement**: Se crea `REQ-002` en borrador con el encuadre 16:9, el sub-viewport 12×12, la altura lógica de 384 px y los ajustes pendientes de sala/MP. No genera tareas hasta su aprobación.
* **Task**: `TASK-0003` completada y verificada: teclado (`WASD`/flechas, `Espacio`/`Enter`, `E`, `R`, `F1`), HUD DOM, overlays de victoria/derrota, feedback de ataque con flash y daño, `window.__game.dispatch()` y E2E determinista del loop completo. `pnpm run verify` y `pnpm run test:e2e` OK; el test del loop se repitió 5 veces. Commit de implementación `366782f`; capturas en `artifacts/TASK-0003/attempt-1/screenshots/`.
* **Task**: `TASK-0002` completada y verificada: host Canvas 2D en `src/host/` con sala 32×24, tiles y sprites de 32rogues, cámara con clamp, `window.__game`, 19 tests nuevos y E2E de render. `pnpm run verify` y `pnpm run test:e2e` OK. Commit de implementación `317f0f0`; captura en `artifacts/TASK-0002/attempt-1/screenshots/room.png`.
* **Task**: `TASK-0001` completada y verificada: motor determinista en `src/game/` (rejilla 32×24, movimiento, combate, turnos, IA, victoria/derrota), 49 tests, `pnpm run verify` OK. Commit de implementación `8ec0d3f`.
* **Requirement**: Se aprueba `REQ-001` para el primer prototipo local: sala 32×24, un jugador, un enemigo, teclado, cámara y turnos con la economía provisional.
* **Decision**: Se adopta el pack 32rogues como arte placeholder y se registra su licencia y crédito en ADR-006.
* **Planning**: Se crean `TASK-0001` (motor), `TASK-0002` (host y cámara) y `TASK-0003` (teclado, HUD y E2E), secuenciales.
* **Initialization**: Se crea el bundle OKF v0.2 con visión, alcance, glosario, arquitectura, calidad y arnés.
* **Creation**: Se documentan los agentes `requirements-writer`, `task-lead` y `task-runner`.
* **Creation**: Se añaden las skills de requisitos, tareas, experimentos, arquitectura y QA visual.
* **Creation**: Se implementa el shell de experimentos y el experimento de humo `EXP-000`.
* **Decision**: Se adopta un enfoque local-first: primero un jugador con teclado, después hotseat y al final servidor/QR.
* **Validation**: `npm run verify`, `npm run test:e2e` y `npm audit` pasan. La captura del shell está en `artifacts/EXP-000-shell-demo/shell-smoke.png`.
* **Decision**: `EXP-000` queda validado y decidido por `human:simon`. La opción `random` es una selección de prueba, no una decisión de diseño.
* **Migration**: Se adopta pnpm 9.15.0, se añade `pnpm-lock.yaml` y se retira `package-lock.json` (ADR-004).
* **Decision**: Se adopta una política de timeouts explícitos y control de procesos en background (ADR-005).
* **Validation**: `pnpm run verify`, `pnpm run test:e2e` y `pnpm audit` pasan con la migración a pnpm.
* **Migration**: Se actualiza pnpm de 9.15.0 a 12.18.0 en `packageManager` y se regenera `pnpm-lock.yaml`. La política de antigüedad mínima de pnpm 12 retiene `rollup` en 4.67.5 (4.68.0 tenía menos de 24 h); se añade `pnpm-workspace.yaml` para permitir el build de `esbuild` (ADR-004).
