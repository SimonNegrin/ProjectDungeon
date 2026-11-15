---
type: Docs Proposal
title: "TASK-0145: propuesta de visión y alcance para requirements-writer"
description: Correcciones factuales en docs/vision.md, docs/scope.md y el ejemplo de manifiesto de REQ-024; sin cambios de reglas.
status: stable
task: TASK-0145
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T18:50:00Z }
---

# Motivo

`docs/vision.md` y `docs/scope.md` no están en la allowlist de `task-lead`
(`.opencode/agents/task-lead.md`, [ADR-016](../../../docs/decisions/ADR-016-permisos-docs-diseno-glosario.md));
su dueño es `requirements-writer`. El criterio 3 de TASK-0145 ya se cumple:
visión y alcance describen la persistencia local por archivo y la carga `.zip`/`.json`.
Lo que sigue son correcciones factuales, no reglas ni alcance nuevo, y no
bloquean el cierre.

# Cambios propuestos

## 1. `docs/vision.md`, interfaz

Sustituir «ofrece reanudar, guardar, cargar y controles» por:

> ofrece, en este orden, reanudar, nueva partida, cargar partida, guardar partida
> y controles.

El resto del párrafo y la persistencia local ya coinciden con REQ-024 v3.

## 2. `docs/scope.md`, alcance vigente

Sustituir «la carga efectiva de `REQ-024` sigue pendiente» por:

> la carga está implementada desde TASK-0141; queda el QA de pausa y guardado.

## 3. `docs/scope.md`, estado de requisitos

Sustituir «el hotseat jugable, la pausa y el guardado siguen pendientes» por:

> el hotseat jugable y el QA de pausa y guardado siguen pendientes; pausa,
> guardado y carga están implementados en TASK-0139 a TASK-0141.

## 4. `REQ-024`, ejemplo de manifiesto

El ejemplo escribe `"phase": "players"`, pero el esquema implementado usa el
enum del motor, `"player"` o `"enemy"` (`PHASES` en `src/game/save.ts`). Alinear
el ejemplo con el enum o declarar que es ilustrativo; T-004 no fija el literal.

# Evidencia

- Formato implementado:
  [ADR-028](../../../docs/decisions/ADR-028-formato-guardado-v1.md).
- Código: `src/game/save.ts`, `src/host/save-zip.ts`, `src/host/load-game.ts`.
- Verificación: `artifacts/TASK-0145/attempt-1/verify-output.txt`.
