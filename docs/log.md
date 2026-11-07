# Historial del bundle

## 2026-11-07

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
