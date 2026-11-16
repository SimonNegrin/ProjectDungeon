---
type: Task Report
title: "TASK-0172: informe de ejecución"
description: "Glosario, economía de turno, arquitectura, alcance e índice actualizados para cofres y botín progresivo."
task: TASK-0172
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T19:06:35Z }
artifacts: artifacts/TASK-0172/attempt-1/
verified:
---

# Estado

`success`. La documentación vigente describe cofres, apertura, depósito, curva de
botín y la fuente jugable de REQ-019 sin contradecir REQ-020 v5 ni ADR-033.

# Cambios

- `docs/glossary.md`: definiciones de cofre, capacidad de cofre, poder, mejora y
  botín especial; actualiza contenedor, acción, panel, zona de cadáveres y
  submenú para la fuente «Cofre».
- `docs/design/turn-economy.md`: apertura con 1 acción y adyacencia, reapertura
  gratis, transferencia y depósito gratis, 4 huecos fijos y coste del fantasma.
- `docs/design/architecture.md`: nueva sección «Cofres» (generación determinista,
  RNG derivado, colocación, contenido por umbral, pieza garantizada, contenedor,
  snapshot, panel/HUD, guardado y feedback); actualiza contenedor, panel, submenú,
  guardado y anti-CLS.
- `docs/scope.md`: cofres y traits pasan a implementados, se retiran de «fuera de
  alcance» y se corrigen estados arrastrados de hotseat y resurrección.
- `docs/requirements/index.md`: REQ-017, REQ-018, REQ-019, REQ-020, REQ-025 y
  REQ-026 reflejan la implementación y la fuente jugable.
- La matriz de REQ-017 ya tenía las filas de apertura y transferencia desde el
  cierre de TASK-0170; no se reescribe.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run docs:check` | OK: 789 documentos, 172 tareas, 6 experimentos | `docs-check.txt` |
| `pnpm run verify` | OK: 116 archivos / 1890 tests, tsc, build y bundle | `verify-output.txt` |

Sin cambios en `src/`, `tests/` ni arnés. Enlaces con ancla comprobados por
`docs:check`; lectura cruzada con REQ-020, REQ-034 y ADR-033.

# Evidencia visual

- No aplica: tarea documental.

# Desviaciones

- Se corrigieron estados de alcance no relacionados con cofres (hotseat,
  resurrección y QA de guardado) porque el mismo párrafo los contradecía y
  `docs:check` exige coherencia; no se reescriben requisitos ni historia.
- El recuento de catálogo sigue siendo 17 traits y 14 objetos en el código frente
  a 18/13 en REQ-020/ADR-033; no se edita una hoja estable del usuario. Se deja
  anotado para el cierre del hito.

# Problemas conocidos y preguntas abiertas

- Ninguno de esta tarea.

# Fricción reutilizable

Sin entradas.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 0 |
| `report_bytes` | 2540 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
