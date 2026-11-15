---
type: Task
id: TASK-0141
title: "Host: cargar .zip/.json desde menú y pausa"
description: "Implementar un único cargador y validador para `.zip` y `.json` usado por el menú principal y la pausa, con confirmación en pausa y reconstrucción del estado."
status: stable
task_status: done
task_type: feature
requirement: REQ-024
requirement_ids: [R-005, R-006, R-008, R-009, T-005, T-006, T-015, T-016]
depends_on: [TASK-0123, TASK-0134, TASK-0137, TASK-0138, TASK-0139]
unlocks: [TASK-0142, TASK-0144, TASK-0145, TASK-0153, TASK-0154, TASK-0158]
created_at: 2026-11-14T23:31:45Z
completed_at: 2026-11-15T18:20:00Z
assignee: task-runner
attempts: 2
artifacts: artifacts/TASK-0141/
priority: P1
risk: high
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T23:31:45Z }
verified:
  - by: task-lead
    at: 2026-11-15T18:20:00Z
    note: >-
      Intento 1 e intento 2 verificados (código `a1b84d4`, `619985f`; tests
      `3c21170`, `394ee77`; evidencia `c4f9c7e`, `7fcbebd`). El primer intento
      pasó verify y E2E, pero el lead detectó que `readStats` rechazaba los stats
      inherentes negativos del roster y una partida con mago/clérigo no se podía
      recargar; el intento 2 lo corrigió con rango acotado `[-9, 9]` y round-trip
      de los nueve arquetipos. Verificación independiente: 102 unitarios
      focalizados, `pnpm run verify` 107 archivos/1678 tests + docs/config/tsc/
      build/bundle OK, `pnpm run test:e2e` 248/248. Criterios 1-7: un único
      `src/host/load-game.ts` y un único selector para menú y pausa; `.zip` y
      `.json` reales; confirmación en pausa y carga directa en menú; cierre de
      pausa, fase/ronda/activo, cámara en el activo y HUD desde el estado;
      cancelación e inválido sin tocar la partida; sin beats, avisos, panel,
      cursor ni cámara restaurados; límites y rutas de `readSaveZip` reutilizados;
      validación cruzada manifiesto↔estado. Diff limitado a host, `src/game/save.ts`
      (corrección de rango), tests, `index.html` y artefactos; sin tests
      debilitados ni cambios de alcance. Fricción de umbral de handoff elevada a
      `harness-keeper`; deuda de cámara posterior a la carga anotada para
      TASK-0150.
---

# Objetivo

Que el menú principal y la pausa usen el mismo cargador para abrir un `.zip` o un
`.json`, validarlo y reconstruir la partida sin romper la que estuviera en curso.

# Contexto

TASK-0137 lee el zip, TASK-0138 valida el estado y TASK-0139 aporta la pausa.
REQ-024
[R-005](../requirements/REQ-024-menu-pausa-guardado.md#requisitos-creativos-decididos)
y
[T-016](../requirements/REQ-024-menu-pausa-guardado.md#requisitos-técnicos)
exigen un único cargador para ambos orígenes. La pantalla de resultado de
TASK-0153 reutiliza esta carga.

# Criterios de aceptación

- [x] Un único módulo de carga y validación atiende al menú principal y a la
      pausa; no hay dos rutas ni dos validadores.
- [x] El selector acepta `.zip` y `.json`; desde el menú principal carga directo
      y desde la pausa pide confirmación antes de reemplazar.
- [x] Confirmar cierra la pausa, restaura fase, ronda y activo, centra la cámara
      en el activo y redibuja los HUD desde el estado.
- [x] Cancelar no cambia nada; un archivo inválido se rechaza con mensaje y deja
      la partida en curso intacta.
- [x] No se restauran timeline, cámara, cursor ni panel; no aparecen beats
      pendientes ni aviso de ronda al cargar.
- [x] Se aplican los límites y el rechazo de rutas y entradas extra de T-006.
- [x] Tests de carga `.zip`/`.json`, confirmación, cancelación, archivo inválido,
      activo/ronda y mismo cargador; `pnpm run verify` pasa.

# Plan de test

- Unitario: `tests/unit/host/load-game.test.ts` nuevo.
- Integración: cargar desde menú principal y desde pausa; comparar estado.
- E2E: carga real de `.zip` y `.json`; la suite completa va en TASK-0144.
- Manual: comprobar cámara y HUD tras cargar.

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0141/attempt-1/report.md`
- [x] Salida de `pnpm run verify` en `artifacts/TASK-0141/attempt-1/verify-output.txt`
- [x] Commit SHA `a1b84d4` (implementación), `3c21170` (tests), `619985f` (fix de stats), `394ee77` (tests del fix)
- [x] Verificación del lead en `artifacts/TASK-0141/lead-verify/verification.md`

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm exec vitest run tests/unit/host/load-game.test.ts tests/unit/host/session.test.ts` | 120 s |
| `pnpm run verify` | 240 s |

# Restricciones

- No implementar la descarga ni el formato; se consumen TASK-0137 y TASK-0138.
- No cambiar las reglas de pausa, guardado o resultado.
- No cargar desde la nube ni sincronizar dispositivos.
- Handoff: brief 1,5 KB, informe 2 KB; tope duro 4 KB.

# No objetivos

- Guardar partidas.
- Migrar formatos antiguos.
- Cargar después del resultado con confirmación; el resultado no tiene partida
  en curso.
- Reparar archivos inválidos.
