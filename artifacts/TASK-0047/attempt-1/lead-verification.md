---
type: Task Verification
title: "TASK-0047: verificación independiente del intento 1"
description: Re-ejecución del build, guarda positiva y negativa, dev y baseline E2E.
status: stable
task: TASK-0047
attempt: 1
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T17:20:00Z }
---

# Resultado

`pass`. El diff cumple el alcance y los seis criterios de aceptación. No se
detectan cambios de comportamiento, tests debilitados ni dependencias nuevas.
La fusión queda supeditada a registrar que el E2E sigue rojo por una deuda
preexistente de TASK-0046, no por este cambio.

# Alcance revisado

- `vite.config.ts`: única entrada `main`; sin `experiments/`.
- `vite.config.experiments.ts`: build separado en `dist-experiments/`.
- `scripts/check-bundle.mjs`: escaneo de `dist/` + grafo de imports.
- `package.json`: `build:experiments`, `check:bundle`; guarda en `verify`.
- `README.md`, `.gitignore`, `tsconfig.json` y test nuevo de la guarda.
- Artefactos del intento. Sin cambios en `src/` ni en tests existentes.

# Comandos re-ejecutados

| Comando | Resultado |
|---|---|
| `pnpm run verify` | OK (docs, config, 721 tests, build y guarda) |
| `pnpm run build` | OK; `dist/` = `index.html` + `assets/main-*.js` + assets |
| `pnpm run build:experiments` | OK; shell + 5 EXP en `dist-experiments/` |
| `pnpm run check:bundle` | OK; 10 archivos de `dist/` y 49 módulos |
| Vite en 5181/5182 | `/`, `/experiments/` y `EXP-004` → 200; cerrado |
| E2E de humo | Rojo en `main` y en la rama: deuda previa de fixtures |

# Guarda negativa fuerte

Se importó temporalmente `BspMapGenerator` en `src/host/main.ts` y se retuvo con
`Object.assign(globalThis, ...)`. El bundle pasó de 106,91 kB a 144,87 kB: BSP sí
entró. La minificación borró los literales (`BspMapGenerator`, `buildBspTree`),
pero la guarda falló por el grafo:

```text
check:bundle: FAIL — forbidden production bundle markers found:
  - BSP module in production graph at src/game/bsp.ts
```

`src/host/main.ts` se restauró byte a byte (`cmp` OK) y `git status` quedó limpio.
Detalle en `lead-guard-negative-strong.txt`.

# Criterios

- [x] `build` solo producción y sin `experiments/`.
- [x] `build:experiments` separado sin contaminar `dist/`.
- [x] Guarda falla con marcador y ubicación; escanea contenido, chunks, salida y
      grafo.
- [x] Guarda en `verify` tras `build` y documentada en README.
- [x] `pnpm run dev` sirve experimentos.
- [x] `docs:check`, `test`, `build` y guarda pasan; sin dependencias nuevas.

# E2E preexistente

`pnpm run test:e2e` da 20 pasan / 50 fallan. Los fallos vienen de fixtures que
asumen BSP 32×32 y posiciones antiguas, mientras `createInitialState()` ya usa
growth desde TASK-0046. Reproducido en `main` con `game-render` y
`game-input-hud` (`snapshot.grid.width` 22 frente a 32). No es regresión de
TASK-0047; la actualización de fixtures corresponde a TASK-0048/0049.

# Disposición de fricción

| Síntoma | Evidencia | Clasificación | Disposición |
|---|---|---|---|
| E2E con fixtures BSP 32×32 tras el default growth | `e2e-output.txt`; fallo idéntico en `main` | Deuda local de una tarea previa | `deferred` a TASK-0048/0049 |
| `pnpm run dev -- --port N` reenvía `--` literal | `dev-health.txt` | Documental/arnés | `deferred` a `requirements-writer` |
