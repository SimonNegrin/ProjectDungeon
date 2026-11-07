---
type: ADR
title: "ADR-005: timeouts explícitos en comandos de agentes"
description: Todo comando en primer plano debe tener timeout; los procesos en background se controlan y se cierran.
status: stable
decision_status: accepted
decided_by: human:simon
decided_at: 2026-11-07T14:51:41Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T14:51:41Z }
---

# Contexto

El tool de shell de OpenCode aplica un timeout por defecto de 120 s a comandos
en primer plano, pero los comandos en background no tienen timeout por defecto.
Hasta ahora los agentes no tenían una política explícita, así que una instalación,
un test o un servidor podían quedarse esperando indefinidamente.

# Decisión

- Todo comando en primer plano debe pasar un `timeout` explícito.
- Los comandos en background solo se usan para servidores o watchers.
- Un servidor en background debe tener puerto explícito, comprobación de salud y
  cierre posterior.
- Nunca se espera indefinidamente a un proceso.
- Si se agota el timeout, se captura evidencia, se mata el proceso y se reporta.
- No se reintenta el mismo comando sin una hipótesis nueva.

La política operativa y la tabla de tiempos están en
[timeouts](../harness/timeouts.md).

# Consecuencias

- Los agentes deben indicar `timeout` en cada llamada de shell.
- Los briefs de tarea deben incluir comandos y timeouts previstos.
- Playwright usa su `webServer.timeout` para arrancar Vite.
- Los tests lentos se investigan; no se tapan subiendo el timeout sin motivo.
- Un timeout no es un fallo silencioso: se convierte en evidencia y decisión.

# Alternativas descartadas

- **Confiar en el default de 120 s**: no cubre instalaciones, E2E largos ni
  background.
- **Sin background**: los servidores de desarrollo son necesarios para revisar
  experimentos y UI.
- **Plugin que reescriba timeouts**: se puede explorar más adelante, pero la
  política explícita es suficiente para el estado actual.
