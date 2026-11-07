# Historial del bundle

## 2026-11-07

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
