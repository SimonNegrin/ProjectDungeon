---
type: Test Strategy
title: Estrategia de tests
description: Pirámide de pruebas, determinismo, QA visual y política de artefactos.
status: draft
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T14:33:11Z }
---

# Principios

- Los tests se escriben desde los criterios de aceptación, no desde la
  implementación.
- El motor debe ser determinista: semilla fija, sin aleatoriedad oculta.
- La verificación visual automática comprueba estado e invariantes; el juicio
  estético es humano.
- Toda tarea deja evidencia reproducible en `artifacts/`.
- No se debilitan tests existentes para que una tarea pase.

# Niveles

| Nivel | Herramienta | Qué cubre |
|---|---|---|
| Unitario | Vitest | Movimiento, diagonal, colisiones, turnos, combate, IA, victoria. |
| Integración | Vitest | Input -> comando -> estado -> eventos. |
| E2E | Playwright | Partida local corta, teclado, HUD, cámara, overlays. |
| Visual | Playwright + navegador integrado | Capturas de estados clave y comparación estable. |
| Manual | Playtest del usuario | Sensación, legibilidad, diversión, cámara. |

# Determinismo

El motor debe exponer un modo de test:

- semilla fija;
- paso manual o tiempo fijo;
- animaciones desactivadas o esperadas;
- estado accesible desde `window.__game` o equivalente;
- sin `Math.random`, `Date.now` ni DOM dentro de reglas.

# Playwright

- Usar Chromium headless.
- Ejecutar contra el servidor de Vite.
- Simular teclado y comprobar estado/HUD.
- Guardar capturas de estados clave.
- Usar trazas en fallos.
- No usar diff de píxeles a pantalla completa para escenas animadas.

# QA visual

La estrategia completa está en [QA visual](../harness/visual-qa.md). Resumen:

1. Playwright para automatización repetible.
2. Navegador integrado de OpenCode para exploración y revisión con el usuario.
3. Debug hooks y HUD DOM para que el Canvas sea verificable.

# Artefactos

Cada intento de tarea guarda:

```text
artifacts/TASK-XXXX/attempt-N/
  report.md
  test-output.txt
  screenshots/
  logs/
```

El informe incluye comandos ejecutados, resultado, commit SHA, desviaciones y
preguntas abiertas. Las capturas son evidencia, no la única prueba.

# Comandos

```bash
pnpm run docs:check   # OKF, enlaces y grafo de tareas
pnpm run config:check # Agentes, skills y opencode.jsonc
pnpm test             # Vitest completo
pnpm exec vitest run <archivo> # Vitest filtrado por archivo
pnpm run test:e2e     # Playwright
pnpm run build        # Typecheck + build
pnpm run verify       # Docs + config + unitarios + build
```

`pnpm test -- <archivo>` no filtra: pnpm reenvía el separador y Vitest ejecuta
todos los archivos. Para un subconjunto, usa `pnpm exec vitest run <archivo>`.

`pnpm run verify` es el mínimo antes de cerrar una tarea técnica. `pnpm run
test:e2e` se ejecuta cuando la tarea toca UI, Canvas o flujo jugable.

# Timeouts

Todo comando en primer plano se ejecuta con un timeout explícito. Los servidores
en background se controlan y se cierran. La política y la tabla de tiempos están
en [workflow](../harness/workflow.md#timeouts-y-procesos).

# Baseline visual

- Solo para estados estables y deterministas.
- Guardar en `tests/e2e/__screenshots__/` o en el artefacto de la tarea.
- Actualizar una baseline requiere revisión humana.
- Enmascarar relojes, animaciones y datos variables.
- Si una baseline es frágil, convertirla en aserción semántica.

# Tests que no se escriben

- Tests de “esto es divertido”.
- Tests de estética.
- Tests que dependen del tiempo real o de animaciones no deterministas.
- Tests que copian la implementación en lugar de comprobar el comportamiento.
