---
type: Harness
title: Timeouts y procesos
description: Política de tiempos máximos, comandos en background y actuación ante bloqueos.
status: draft
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T14:51:41Z }
---

# Estado actual

El tool de shell de OpenCode tiene un timeout por defecto de **120 s** para
comandos en primer plano. Los comandos en **background no tienen timeout por
defecto**.

Eso significa que:

- un comando foreground sin `timeout` explícito no es infinito, pero puede
  quedarse 120 s;
- un servidor o watcher en background sí puede quedarse vivo indefinidamente;
- el timeout del tool no garantiza que un proceso hijo en background muera.

Por eso la política es explícita.

# Regla

**Todo comando en primer plano debe llevar un timeout explícito.** Los comandos
en background solo se usan para servidores o watchers, con puerto fijo,
comprobación de salud y cierre posterior.

# Tiempos recomendados

| Tipo de comando | Timeout |
|---|---:|
| `git status`, `git diff`, `git log`, inspección | 15 s |
| `pnpm run docs:check`, `pnpm run config:check` | 60 s |
| `pnpm test` | 120 s |
| `pnpm run build` | 120 s |
| `pnpm run test:e2e` | 180 s |
| `pnpm install` | 300 s |
| `pnpm exec playwright install chromium` | 600 s |
| `curl` de salud | 10-30 s |
| Servidor de desarrollo | background controlado |

Si un comando supera su tiempo de forma recurrente, se investiga. No se sube el
timeout para ocultar un problema.

# Background

Permitido solo para:

- `pnpm run dev`;
- watchers de test;
- tareas de larga duración que el usuario haya pedido explícitamente.

Reglas:

1. Usar un puerto explícito, por ejemplo `pnpm exec vite --port 4173 --host 127.0.0.1`.
2. Comprobar que responde con `curl` y timeout corto.
3. No quedarse esperando al proceso.
4. Cerrarlo al terminar, salvo que el usuario quiera probarlo.
5. Si el proceso se pierde, comprobar el puerto antes de reiniciar.

Con pnpm 9, `pnpm run dev -- --port ...` puede pasar el `--` literal a Vite. Para
flags de Vite, usa `pnpm exec vite ...`.

# Playwright

`playwright.config.ts` usa `webServer` con `timeout: 120000`. Eso arranca Vite de
forma controlada y lo cierra al terminar los tests. Es la forma preferida de
levantar el servidor para E2E.

# Actuación ante timeout

1. Parar el proceso si sigue vivo.
2. Guardar salida, captura o log.
3. Reportar qué comando se ejecutó, con qué timeout y qué se observó.
4. No repetir el mismo comando sin una hipótesis nueva.
5. Escalar según [escalation](escalation.md).

# Briefs y evidencias

El `task-lead` incluye en el brief los comandos previstos y su timeout. El
`task-runner` registra en el informe los comandos ejecutados, el timeout y el
resultado. Una tarea no se cierra con un comando colgado o sin evidencia de
haber terminado.
