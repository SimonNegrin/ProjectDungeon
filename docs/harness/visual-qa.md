---
type: Harness
title: QA visual
description: Playwright, navegador integrado y debug hooks para verificar Canvas y UI.
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T11:46:23Z }
---

# Principio

Separar **verificación visual automática** de **juicio estético**:

- Automatizable: la página carga, el Canvas no está vacío, el HUD dice lo que
  debe, el jugador se movió, el turno cambió, no hay errores de consola.
- Humano: se ve bien, se entiende, se siente bien, la cámara es cómoda.

No se asume que el modelo interpreta imágenes con fiabilidad. La captura sirve
para el usuario, para comparar y para documentar; la verificación se apoya en
estado, DOM y aserciones.

# Tres capas

1. **Playwright + Chromium headless**: tests repetibles, teclado, capturas,
   trazas. `pnpm run test:e2e` con timeout explícito de 180 s. Playwright arranca
   y cierra Vite con su `webServer`.
2. **Navegador integrado de OpenCode**: exploración y revisión con el usuario;
   consola, red, accesibilidad, JavaScript y capturas. No sustituye a Playwright.
3. **Debug hooks**: `?test=1&seed=123`, `window.__game` o `window.__experiment`,
   paso manual, `?debug=1` y HUD DOM con `data-testid`.

El Canvas no aparece en el árbol de accesibilidad: el HUD en DOM es la interfaz
verificable.

# Qué automatizar

- La página carga sin errores de consola.
- El Canvas tiene tamaño y píxeles no vacíos.
- El HUD muestra turno y fase correctos.
- Movimiento ortogonal y diagonal; cámara que sigue y se limita al mapa.
- Ataque, cambio de fase, victoria y derrota.
- Los controles de un experimento cambian el estado.
- La generación es reproducible con la misma semilla.

# Qué dejar al humano

Sensación de juego, legibilidad, comodidad de cámara, ritmo de turnos, arte,
audio, tono y si el experimento resuelve la duda.

# Capturas y baselines

- Capturas de estados clave, no de todos los frames.
- La suite escribe capturas, JSON y logs con `artifactPath(testInfo, ...parts)`
  (`tests/e2e/artifacts.ts`). Ningún spec usa rutas fijas a `artifacts/`.
- Por defecto la base es `testInfo.outputPath(...)`, dentro de `test-results/`,
  que Playwright limpia por ejecución. Una corrida normal no modifica evidencia
  versionada.
- Para una captura explícita de tarea:

  ```bash
  E2E_ARTIFACTS_DIR=artifacts/TASK-XXXX/attempt-N pnpm run test:e2e <spec>
  ```

  La suite escribe solo en esa carpeta, con subdirectorio por spec:
  `$E2E_ARTIFACTS_DIR/<spec>/screenshots/<nombre>.png`. Briefs e informes deben
  citar esa ruta real; si una captura se copia a la raíz del intento, se
  registra la ruta final y el motivo. Con `--repeat-each=N`, la pasada 0
  conserva esa ruta y las pasadas 1..N-1 añaden `repeat-<índice>`:
  `$E2E_ARTIFACTS_DIR/<spec>/repeat-1/screenshots/<nombre>.png`. El sufijo usa
  `testInfo.repeatEachIndex`, no `testInfo.project.repeatEach`, que no refleja
  el flag de CLI. No mezclar en la misma carpeta una corrida única y una
  repetida: ambas usan la ruta de la pasada 0.
- Los artefactos de tareas cerradas son evidencia histórica inmutable: no se
  reescriben ni se revierten a mano. Si una captura histórica aparece modificada,
  la causa es una ruta fija en un spec: se corrige el spec, no el artefacto.
- Para regresión estable, `toHaveScreenshot` con tolerancia y máscaras. No
  comparar a pantalla completa escenas animadas. Actualizar baselines solo con
  aprobación humana; si una baseline es frágil, sustituirla por una aserción
  semántica.

# Herramientas

| Necesidad | Herramienta |
|---|---|
| E2E y CI | Playwright + Chromium headless |
| Exploración y revisión | Navegador integrado de OpenCode |
| Capturas | Playwright o `browser.screenshot` |
| Estado del Canvas | `window.__game` / `window.__experiment` |
| Accesibilidad | HUD DOM + snapshot |
| Rendimiento | trace/cpu del navegador |
