---
type: Task Report
title: "TASK-0139: informe de ejecución"
description: Pausa global con Esc, menú de cinco acciones, mapa único de teclas y retirada de R.
task: TASK-0139
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T17:11:30Z }
artifacts: artifacts/TASK-0139/attempt-1/
verified:
---

# Estado

`success`. Pausa global que congela relojes e input; motor intacto; guardar y
cargar siguen como no-op documentados.

# Cambios

- `src/host/keymap.ts` y `input.ts`/`hud.ts`: mapa único de teclas; `R` fuera.
- `pause-menu.ts`, `pause-menu-view.ts`, `main.ts`, `start-screen-view.ts`,
  `index.html` y `ui.css`: pausa modal, cinco acciones, controles y foco.
- Tests unitarios nuevos y E2E `pause-menu.spec.ts`; `R` sustituida por
  `restart(page)` en nueve specs.
- Commits: `9a46ff3` (teclas), `1339056` (pausa) y `3b2f12f` (foco).

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| Vitest focalizado | 68/68 | `test-output.txt` |
| E2E `pause-menu.spec.ts` | 4/4 | `e2e-output.txt` |
| E2E con `R` sustituida (9 specs) | 37/37 | sesión |
| `pnpm run test` / `verify` | 1649/1649 · OK | `verify-output.txt` |

# Evidencia visual

- `tests/e2e/pause-menu/screenshots/`: raíz, controles, dos avisos, guardado
  deshabilitado en fase enemiga y pausa durante animación. Mirar orden, foco,
  motivo textual y confirmaciones.

# Desviaciones

- Añadí frontmatter OKF a `brief-detalle.md` para pasar `docs:check`;
  contenido intacto.
- `Esc` con hechizo seleccionado abre pausa en vez de deseleccionar, según el
  invariante del brief; test ajustado.
- El resultado conserva sus botones «Reiniciar»: está fuera de alcance y su
  E2E los exige. `R` sí se retiró.

# Problemas conocidos y preguntas abiertas

- Guardar (`TASK-0140`) y Cargar (`TASK-0141`) siguen sin archivo.
- ¿El resultado pierde «Reiniciar» en `TASK-0144`?

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| `docs:check` exige frontmatter OKF a todo `.md` de `artifacts/` y falla con el anexo del brief. | `verify` → «brief-detalle.md: falta frontmatter OKF». | Añadir frontmatter mínimo. | Se repite en cada intento con anexo. | Exigirlo en la plantilla o tratar el anexo como parte del brief. | Bajo. | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2621 |
| `report_bytes` | 2537 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
