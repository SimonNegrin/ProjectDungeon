---
type: Task Brief
title: "TASK-0075: brief del intento 1"
description: Aviso de líneas de docs/log.md con formato no canónico.
task: TASK-0075
attempt: 1
status: stable
brief_bytes: 1792
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-12T13:05:00Z }
---

# Objetivo

Que `pnpm run docs:check` emita un aviso (no error) por cada línea de
`docs/log.md` que empiece por `* ` y no cumpla
`/^\* \d{4}-\d{2}-\d{2} — /`, citando `docs/log.md:<línea>` y el formato
esperado.

# No objetivos

- Ver [No objetivos](../../../docs/tasks/TASK-0075-arnes-validacion-log.md#no-objetivos).

# Invariantes

- Solo se modifica `scripts/validate-docs.mjs`.
- `LOG_LINE_MAX` y el error por longitud no cambian; solo se evalúa en líneas
  canónicas.
- Aviso, no error: el log es histórico.
- No tocar `docs/log.md` ni `docs/log-detalle.md` (salvo prueba negativa
  temporal con restauración).

# Criterios de aceptación

Viven en [la ficha](../../../docs/tasks/TASK-0075-arnes-validacion-log.md#criterios-de-aceptación).
No se copian aquí.

# Contexto mínimo

- `scripts/validate-docs.mjs:271-279`: bucle actual del log; salta las líneas no
  canónicas con `continue`.
- Línea base: `pnpm run docs:check` → 77 avisos, 0 errores, 203 entradas
  canónicas.
- Referencia de formato:
  [documentación](../../../docs/harness/documentacion.md#topes) y
  [AGENTS.md](../../../AGENTS.md).
- Plan de test: [ficha](../../../docs/tasks/TASK-0075-arnes-validacion-log.md#plan-de-test).

# Artefactos

- `artifacts/TASK-0075/attempt-1/report.md`
- `logs/docs-check.txt`, `logs/docs-check-negativo.txt`, `logs/verify.txt`
- Diff de `scripts/validate-docs.mjs`

# Riesgos y decisiones abiertas

- Ninguno abierto. Mantener el mensaje de aviso estable para la comprobación
  negativa.
