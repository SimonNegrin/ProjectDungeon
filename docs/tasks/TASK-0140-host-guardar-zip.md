---
type: Task
id: TASK-0140
title: "Host: guardar .zip"
description: "Construir el `.zip` desde el estado del motor y descargarlo con el nombre `proyectdungeon-<semilla>-<AAAAMMDD-HHmmss>.zip`, solo en fase de personajes y sin animación."
status: stable
task_status: in_progress
task_type: feature
requirement: REQ-024
requirement_ids: [R-003, R-004, R-015, T-002, T-009]
depends_on: [TASK-0134, TASK-0137, TASK-0138, TASK-0139]
unlocks: [TASK-0144, TASK-0145, TASK-0154, TASK-0158]
created_at: 2026-11-14T23:31:45Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0140/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T23:31:45Z }
verified:
---

# Objetivo

Que desde la pausa se pueda descargar un único `.zip` con la partida y su
manifiesto, con nombre reconocible y solo cuando el estado lo permite.

# Contexto

TASK-0137 aporta el contenedor, TASK-0138 el esquema y TASK-0139 el menú. REQ-024
[T-009](../requirements/REQ-024-menu-pausa-guardado.md#requisitos-técnicos) fija
el nombre y la descarga; TASK-002 de la hoja exige que el host solo empaquete y
descargue. La carga es TASK-0141.

# Criterios de aceptación

- [ ] La acción Guardar solo está activa desde la pausa, en fase de personajes y
      sin animación ni paneo; fuera de ahí se desactiva con el motivo en texto.
- [ ] Cada guardado produce un único `.zip` con `manifiesto.json` y
      `partida.json`; no se guarda presentación, cámara, cursor ni panel.
- [ ] El nombre es `proyectdungeon-<semilla>-<AAAAMMDD-HHmmss>.zip` con fecha
      UTC y dos guardados en segundos distintos no se sobrescriben.
- [ ] El archivo se construye desde el estado del motor; el host no serializa por
      su cuenta ni duplica campos.
- [ ] Un error de serialización o de zip se muestra y no descarga un archivo
      parcial.
- [ ] Tests de manifiesto, nombre, estados desactivados y descarga; `pnpm run
      verify` pasa.

# Plan de test

- Unitario: `tests/unit/host/save-game.test.ts` nuevo.
- Integración: guardar en fase de personajes y comprobar manifiesto y contenido.
- E2E: descarga del `.zip`; la suite completa va en TASK-0144.
- Manual: abrir el archivo descargado con un lector estándar.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0140/attempt-1/report.md`
- [ ] Salida de `pnpm run verify`
- [ ] Archivo `.zip` de muestra o hash
- [ ] Commit SHA

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm exec vitest run tests/unit/host/save-game.test.ts` | 120 s |
| `pnpm run verify` | 240 s |

# Restricciones

- No implementar la carga, el selector ni la confirmación de reemplazo.
- No cambiar el esquema v1 ni el contenedor zip.
- No guardar después del resultado ni fuera de la pausa.
- No añadir nube, cuentas, autoguardado ni cifrado.
- Handoff: brief 1,5 KB, informe 2 KB; tope duro 4 KB.

# No objetivos

- Cargar `.zip` o `.json`.
- Varios slots por partida.
- Guardar audio, presentación o cámara.
- Reinicio rápido con la misma party y semilla.
