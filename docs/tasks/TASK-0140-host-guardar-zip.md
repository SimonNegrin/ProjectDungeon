---
type: Task
id: TASK-0140
title: "Host: guardar .zip"
description: "Construir el `.zip` desde el estado del motor y descargarlo con el nombre `proyectdungeon-<semilla>-<AAAAMMDD-HHmmss>.zip`, solo en fase de personajes y sin animación."
status: stable
task_status: done
task_type: feature
requirement: REQ-024
requirement_ids: [R-003, R-004, R-015, T-002, T-009]
depends_on: [TASK-0134, TASK-0137, TASK-0138, TASK-0139]
unlocks: [TASK-0144, TASK-0145, TASK-0154, TASK-0158]
created_at: 2026-11-14T23:31:45Z
completed_at: 2026-11-15T17:44:12Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0140/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T23:31:45Z }
verified:
  - by: task-lead
    at: 2026-11-15T17:44:12Z
    note: >-
      Intento 1 verificado (código `21bd30a`, tests `ed20160`, evidencia
      `fa7527f`; fusión `9294f32`). Diff revisado: `save-game.ts`, cableado del
      efecto `save` en `main.ts`, región viva `pause-save-message` y tests
      nuevos; sin cambios de esquema, contenedor, requisitos ni dependencias.
      `pnpm run verify` reejecutado: 106 archivos/1654 tests, docs/config, tsc,
      build y bundle OK; `pnpm run test:e2e` completo 243/243. El `.zip` de
      muestra abre con `unzip`, contiene solo `manifiesto.json` y
      `partida.json`, y su SHA-256 coincide. Criterios 1-6: disponibilidad y
      motivo intactos; un único zip desde el estado del motor; nombre UTC con
      semilla y dos segundos distintos; errores de serialización y zip sin
      descarga; pausa y foco sin cambios. Sin tests debilitados ni cambios de
      alcance. Evidencia en `attempt-1/`.
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

- [x] La acción Guardar solo está activa desde la pausa, en fase de personajes y
      sin animación ni paneo; fuera de ahí se desactiva con el motivo en texto.
- [x] Cada guardado produce un único `.zip` con `manifiesto.json` y
      `partida.json`; no se guarda presentación, cámara, cursor ni panel.
- [x] El nombre es `proyectdungeon-<semilla>-<AAAAMMDD-HHmmss>.zip` con fecha
      UTC y dos guardados en segundos distintos no se sobrescriben.
- [x] El archivo se construye desde el estado del motor; el host no serializa por
      su cuenta ni duplica campos.
- [x] Un error de serialización o de zip se muestra y no descarga un archivo
      parcial.
- [x] Tests de manifiesto, nombre, estados desactivados y descarga; `pnpm run
      verify` pasa.

# Plan de test

- Unitario: `tests/unit/host/save-game.test.ts` nuevo.
- Integración: guardar en fase de personajes y comprobar manifiesto y contenido.
- E2E: descarga del `.zip`; la suite completa va en TASK-0144.
- Manual: abrir el archivo descargado con un lector estándar.

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0140/attempt-1/report.md`
- [x] Salida de `pnpm run verify`
- [x] Archivo `.zip` de muestra o hash
- [x] Commit SHA

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
