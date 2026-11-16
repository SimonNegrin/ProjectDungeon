---
type: Task Report
title: "TASK-0155: informe de ejecución"
description: ADR-029 y documentación de diseño del hotseat implementado.
task: TASK-0155
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T10:26:00Z }
artifacts: artifacts/TASK-0155/attempt-1/
verified:
---

# Estado

`success`. ADR-029 registra el modelo de turnos implementado y el diseño deja de
tratar `E` y `R` como controles vigentes.

# Cambios

- `docs/decisions/ADR-029-hotseat-local.md`: estado del turno, `N`, orden fijo,
  recursos por jugador, una fase enemiga por ronda, muerte y resurrección por
  índice, relevo y avisos del host, resultado, pausa de REQ-024 y retirada de `E`
  y `R`.
- `docs/decisions/index.md`: entrada de ADR-029.
- `docs/decisions/ADR-020-economia-acciones.md`: nota de vigencia; la tecla pasa a
  `N` y el resto de la economía sigue.
- `docs/glossary.md`: «Relevo», «Ronda» y «Jugador N de M», además de «Hotseat»,
  «Paneo de relevo» y «Fase enemiga».
- `docs/design/turn-economy.md`: aviso de vigencia, orden de turnos, recursos por
  jugador, controles `N`/`Esc`, panel del activo y resultado con Nueva y Cargar.
- `docs/design/architecture.md`: sección «Hotseat» y cierre con `N` en economía.
- Sin ediciones en `docs/requirements/**`.
- Commit SHA: `96a8bf1`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run docs:check` | OK, 755 documentos | `docs-check.txt` |
| `pnpm run verify` | 1796 tests, build y bundle OK | `verify-output.txt` |

# Evidencia visual

No aplica: tarea documental.

# Desviaciones

- «Relevo» se añade como término propio y «Paneo de relevo» conserva la cámara;
  separarlos evita duplicar la definición.
- La ficha del objeto del glosario aún dice que los traits no llevan descripción.
  No se toca: es la fricción de TASK-0162 y corresponde a T-011 de REQ-019.

# Problemas conocidos y preguntas abiertas

- ADR-024 existe desde 2026-11-13, pero la documentación de traits (glosario,
  economía y arquitectura) sigue pendiente de T-011, fuera del piloto.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| ADR-020 daba `E` como vigente y el glosario tenía términos de hotseat sin ronda ni N/M | ADR-020; glosario | Nota de vigencia y términos nuevos | Cualquier documento anterior a REQ-031 puede citar `E` | Revisión de vigencia con T-011 | Bajo | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 0 |
| `report_bytes` | 0 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
