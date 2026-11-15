---
type: Task Brief
title: "TASK-0144: brief del intento 2"
description: Desbloqueo por TASK-0153 y endurecimiento del criterio 7 del resultado.
task: TASK-0144
attempt: 2
status: stable
brief_bytes: 1953
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T09:00:00Z }
---

# Objetivo

Cerrar el criterio 7 pendiente: el resultado nuevo (TASK-0153) no ofrece pausa
ni guardado, no tiene «Reiniciar» ni reinicio rápido y `Esc`/`N`/`I` no actúan.
Solo tests y artefactos; sin cambios de producción.

# No objetivos

- Cambiar reglas, UI, requisitos, arnés ni `docs/design/turn-economy.md`; no
  reescribir la QA de TASK-0153 (`host-result-qa.spec.ts`).
- Probar audio, botín, hotseat ni nube.

# Invariantes

- No borrar, saltar ni debilitar tests; el criterio 7 solo se endurece.
- pnpm y `timeout` en todo comando. E2E en serie (`--workers=1`), puerto 4173
  libre al cerrar; sin procesos huérfanos.
- Sesión nueva de `task-runner`; no reutilizar la del intento 1.

# Criterios de aceptación

Viven en `docs/tasks/TASK-0144-qa-e2e-pausa-guardado-carga.md#criterios-de-aceptación`; el 7 es el único abierto.

# Contexto mínimo

- `tests/e2e/pause-save-load-qa.spec.ts:691`: test parcial del criterio 7.
- `tests/e2e/host-result-qa.spec.ts:61`: comportamiento del resultado.
- `tests/e2e/support.ts`: falta una ruta documentada a victoria en flujo normal
  (semilla 79, un jugador). Añade `winGame`/equivalente si sale estable; si no,
  registra la fricción.
- REQ-024 R-012/T-013 y REQ-031 R-020, enlazados en la ficha.

# Artefactos

`artifacts/TASK-0144/attempt-2/`: `report.md`, salidas de test, capturas en
`pause-save-load-qa/screenshots/` (`resultado-victoria`, `resultado-derrota`).

# Riesgos y decisiones abiertas

- La suite completa en serie puede superar 180 s; usa 900 s y registra tiempos.
- Si el helper de victoria no es estable, no fuerces: conserva estado inyectado
  y deja la fricción en el informe.
