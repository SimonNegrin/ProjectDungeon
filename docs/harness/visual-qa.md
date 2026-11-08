---
type: Harness
title: QA visual
description: Playwright, navegador integrado y debug hooks para verificar Canvas y UI.
status: draft
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T14:33:11Z }
---

# Principio

Separar **verificación visual automática** de **juicio estético**:

- Automatizable: la página carga, el Canvas no está vacío, el HUD dice lo que
  debe, el jugador se movió, el turno cambió, no hay errores de consola.
- Humano: se ve bien, se entiende, se siente bien, la cámara es cómoda.

# Tres capas

## 1. Playwright + Chromium headless

Para automatización repetible:

- abrir el juego o experimento;
- simular teclado;
- comprobar estado y DOM;
- capturar screenshots;
- guardar trazas y vídeo en fallos;
- ejecutar en CI más adelante.

Comando:

```bash
pnpm run test:e2e
```

Se ejecuta con timeout explícito (180 s recomendado). Playwright arranca Vite con
su propio `webServer.timeout` y lo cierra al terminar.

## 2. Navegador integrado de OpenCode

Para exploración y revisión con el usuario:

- abrir `localhost`;
- pulsar teclas y botones;
- inspeccionar consola y red;
- leer el árbol de accesibilidad;
- ejecutar JavaScript;
- capturar y previsualizar imágenes.

Es ideal para experimentos y para enseñar el resultado al usuario en el panel de
revisión. No sustituye a Playwright para tests repetibles.

## 3. Debug hooks

El Canvas no aparece en el árbol de accesibilidad. Por eso el juego debe exponer:

- `?test=1&seed=123`: modo determinista.
- `window.__game`: estado, jugador, enemigos, cámara, turno, celdas alcanzables.
- `window.__game.step()` y `window.__game.snapshot()`.
- `?debug=1`: overlay con rejilla, coordenadas, hitboxes y rangos.
- HUD en DOM con `data-testid` y texto accesible.

Para experimentos, el equivalente es `window.__experiment`.

# DeepSeek Flash

Puede dirigir el navegador, leer DOM, consola, red y ejecutar JavaScript. Puede
guardar capturas. **No se debe asumir que interpreta imágenes con fiabilidad.**
Si la variante es multimodal, se puede usar como primer filtro; si no, la captura
es para el usuario y para comparación automática.

La verificación estética no depende del modelo. Opcionalmente, más adelante se
puede añadir un subagente con un modelo de visión, pero no es el pilar.

# Qué automatizar

- La página carga sin errores de consola.
- El Canvas tiene tamaño y píxeles no vacíos.
- El HUD muestra el turno y la fase correctos.
- El movimiento ortogonal y diagonal cambia la posición.
- La cámara sigue al jugador.
- El ataque resta vida.
- La fase cambia de jugadores a enemigos.
- La victoria y la derrota aparecen.
- Los controles de un experimento cambian el estado.
- La generación es reproducible con la misma semilla.

# Qué dejar al humano

- Sensación de juego.
- Legibilidad.
- Comodidad de cámara.
- Ritmo de turnos.
- Arte, audio y tono.
- Si el experimento resuelve la duda.

# Capturas y baselines

- Capturas de estados clave, no de todos los frames.
- Guardar la evidencia de una tarea en `artifacts/TASK-XXXX/attempt-N/screenshots/`.
- Los artefactos de tareas cerradas son evidencia histórica inmutable. La suite
  E2E puede reescribir capturas antiguas al ejecutarse: revertir esos cambios
  (`git checkout -- artifacts/`) antes de commitear y conservar solo las capturas
  del intento actual. A medio plazo, parametrizar la carpeta de capturas de la
  suite (`E2E_ARTIFACTS_DIR` o `testInfo.outputPath`) para que no toque
  artefactos versionados.
- Para regresión estable, usar `toHaveScreenshot` con tolerancia y máscaras.
- No comparar a pantalla completa escenas animadas.
- Actualizar baselines solo con aprobación humana.
- Si una baseline es frágil, sustituirla por una aserción semántica.

# Herramientas

| Necesidad | Herramienta |
|---|---|
| E2E y CI | Playwright + Chromium headless |
| Exploración y revisión | Navegador integrado de OpenCode |
| Capturas | Playwright o `browser.screenshot` |
| Ver capturas | `browser.preview` |
| Consola y red | Navegador integrado y Playwright |
| Estado del Canvas | `window.__game` / `window.__experiment` |
| Accesibilidad | HUD DOM + snapshot/Lighthouse |
| Rendimiento | trace/cpu del navegador |

No hace falta extensión de Chrome ni plugin adicional.
