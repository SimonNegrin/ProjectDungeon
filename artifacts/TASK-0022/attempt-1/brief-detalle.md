---
type: Task Brief
title: "TASK-0022: detalle del brief del intento 1"
description: Matriz de verificación en navegador, capturas, rutas y comandos.
task: TASK-0022
attempt: 1
status: stable
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T14:00:00Z }
---

# Enlaces

- [TASK-0022](../../../docs/tasks/TASK-0022-e2e-qa-damero-decoracion.md), en
  especial «Criterios de aceptación» y «Plan de test».
- [REQ-007](../../../docs/requirements/REQ-007-damero-decoracion-suelo.md):
  R-001, R-002, R-004, R-005, R-006, R-007, R-008, T-006 y T-007.
- [ADR-010](../../../docs/decisions/ADR-010-damero-decoracion-presentacion.md).
- [QA visual](../../../docs/harness/visual-qa.md).

# Diseño del spec nuevo

Crea `tests/e2e/floor-qa.spec.ts` (o nombre equivalente del dominio). No modifica
specs existentes. Usa `artifactPath`, `snapshot`, `settle`, `walkTo` y
`dispatchCommand` de `tests/e2e/support.ts`. Nada de `waitForTimeout`; espera por
estado (`window.__game`, `assetsLoaded`, rAF doble, `settle`).

Cubre, como mínimo, estos bloques en tests separados o agrupados:

1. **Snapshot y densidades.** Con `?seed=279837264`, lee `snapshot()`:
   - Cuenta tiles elegibles por área como en `src/host/floor.ts`: `floor` menos
     `doors` y `spawns`; sala = dentro de `rooms`, pasillo = fuera.
   - Verifica densidad 12-18 % en salas y 6-8 % en pasillos con la lista
     `decoration` del snapshot.
   - Verifica 0 decals en cada `doors` y en `spawns.player`/`spawns.enemy`.
   - Verifica máximo 1 decal por tile (`Set` de `x,y`).
   - Verifica que todos los `type` pertenecen a la lista blanca de familias
     planas (dirt/grass/bones/blood/mushroom); ningún tipo sólido.
   - Verifica que hay decoración en ambas áreas y que la paridad de cada tile
     `floor` es `(x + y) % 2` (damero independiente de la semilla).
   - Guarda el snapshot en `snapshot.json` con `artifactPath`.

2. **Damero en sala y pasillo.** A 1280×720, mueve la cámara con `walkTo` para
   encuadrar una sala y luego un pasillo. Captura `damero-sala.png` y
   `damero-pasillo.png` (página completa). Sobre el canvas, mide luminancia media
   de dos tiles ortogonalmente adyacentes de suelo con paridad opuesta en cada
   área y exige diferencia clara (> umbral elegido y documentado). Comprueba que
   un tile de muro adyacente no recibe el tinte del damero (no alterna con la
   misma firma que el suelo). No amplíes la captura.

3. **Escala de grises.** A partir de una captura de sala, convierte a luminancia
   (`0.2126R + 0.7152G + 0.0722B`) dentro del navegador o con canvas y guarda
   `gris.png`. Mide la diferencia de luminancia entre paridades adyacentes y
   exige que el damero siga visible. Guarda las medias en el log/JSON.

4. **Camino y cursor sobre decals.** Elige un tile decorado alcanzable y coloca
   el cursor con flechas reales para que exista camino. Captura
   `camino-sobre-decal.png`. Comprueba que `cursor` y `cursor-path` están
   visibles y por encima del canvas (orden DOM/`z-index` del overlay) y que sus
   píxeles/estilos se ven sobre el tile decorado. No basta con que exista el
   decal en el snapshot.

5. **`MoveTo` a tile decorado.** Elige un tile de `snapshot.decoration`
   alcanzable (si hace falta, `walkTo` primero para quedar a ≤ MP). Ejecuta
   `MoveTo` real con `dispatchCommand`; exige que no haya `CommandRejected`, que
   el jugador quede en ese tile y que `decoration` no cambie. `settle` después.

6. **Determinismo entre capturas.** Dos cargas de `?seed=279837264` con el mismo
   encuadre y `settle` producen buffers idénticos (compara `Buffer` de
   `page.screenshot` o `toDataURL` del canvas; documenta el método). Otra semilla
   genera `semilla-distinta.png`: al menos un decal cambia y la paridad `(x+y)%2`
   se mantiene en todo el suelo.

# Restricciones de test

- No tocar aserciones, nombres de captura ni esperas de specs existentes.
- No borrar, saltar (`test.skip`) ni relajar tests; si un criterio no se puede
  medir, devuelve `blocked`.
- El spec debe fallar si TASK-0021 se rompe; evita aserciones tautológicas o
  copiadas de la implementación. La geometría de densidades se recalcula en el
  spec desde el snapshot.
- Sin dependencias nuevas ni cambios en `playwright.config.ts` salvo que sea
  imprescindible (justifícalo).

# Rutas de artefactos

`E2E_ARTIFACTS_DIR=artifacts/TASK-0022/attempt-1`. `artifactPath` añade un
subdirectorio por spec: las capturas quedarán en
`artifacts/TASK-0022/attempt-1/floor-qa/screenshots/`. Nombres exactos:
`damero-sala.png`, `damero-pasillo.png`, `camino-sobre-decal.png`, `gris.png`,
`semilla-distinta.png`, más `snapshot.json` y logs de medición. En `attempt-1/`
deja además `report.md`, `test-e2e-output.txt` y `verify-output.txt` (usa `.txt`
porque `.gitignore` excluye `*.log`).

# Comandos y timeouts (macOS sin `timeout`)

| Comando | Timeout de la herramienta |
|---|---:|
| `E2E_ARTIFACTS_DIR=artifacts/TASK-0022/attempt-1 pnpm run test:e2e floor-qa` | 240 s |
| `pnpm run test:e2e` | 240 s |
| `pnpm run verify` | 180 s |
| `git status`, `git diff` | 15 s |

Playwright arranca y cierra Vite con `webServer`; no dejes servidores. Baseline:
381/381 unitarios y 40/40 E2E antes del spec nuevo.

# Evidencia mínima del informe

Commit SHA de `task/TASK-0022`, densidades medidas (numerador/denominador y %),
resultado de exclusiones y máximo por tile, diferencia de luminancia del damero y
en grises, método de comparación de buffers, rutas de capturas y estado de
`pnpm run test:e2e` y `pnpm run verify`.
