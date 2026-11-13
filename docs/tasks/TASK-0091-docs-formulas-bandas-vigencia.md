---
type: Task
id: TASK-0091
title: "Docs: fórmulas por paquete, bandas y vigencia de REQ-010/014/015/025"
description: "Actualizar turn-economy, architecture, glosario y las notas de vigencia de los requisitos enmendados para que el daño único deje de figurar como modelo vigente."
status: stable
task_status: done
task_type: docs
requirement: REQ-029
requirement_ids: [T-010]
depends_on: [TASK-0089, TASK-0090]
unlocks: []
created_at: 2026-11-13T12:30:00Z
completed_at: 2026-11-13T16:31:32Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0091/
priority: P1
risk: low
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T12:30:00Z }
verified:
  - by: task-lead
    at: 2026-11-13T16:31:32Z
    note: >-
      Verificación independiente en `task/TASK-0091` (auditoría `4db7ef9`,
      informe `1fe839b`, diseño y glosario `782ee4e`, verificación `cbc0d96`,
      precisión del aviso `247dd22`, notas de requisitos `e905889`). Diff
      completo revisado: solo `docs/design/turn-economy.md`,
      `docs/design/architecture.md`, `docs/glossary.md` y las cuatro notas de
      vigencia; sin tocar `src/**`, `tests/**`, dependencias ni historial de
      decisiones. Valores contrastados con `damage.ts`, `equipment.ts`,
      `roster.ts`, `bestiary.ts`, `spells.ts`, `combat.ts`, `magic.ts`, `map.ts`
      y `types.ts`: 7 armas con paquetes, 4 bandas, 9 arquetipos y 3 enemigos
      coinciden. `pnpm run docs:check` OK (447 documentos, 92 tareas) y
      `pnpm run verify` OK (86 archivos, 1189/1189) re-ejecutados tras
      `e905889`; el barrido de EXP-004 es un timeout intermitente preexistente
      bajo carga y no una regresión. Los seis criterios se cumplen.
---

# Objetivo

Que la documentación de diseño y las notas de vigencia describan el modelo
implementado —paquetes, bandas, perfiles y desglose— y que ninguna fórmula de
daño único quede presentada como vigente.

# Contexto

- Implementación cerrada en TASK-0085 a TASK-0090.
- `docs/design/turn-economy.md#combate` conserva la fórmula, las armas y la tabla
  de unidades históricas con una nota de vigencia.
- `docs/design/architecture.md` describe el combate, la magia y los eventos.
- `docs/glossary.md` ya incluye tipos, paquetes y bandas; hay que comprobar que
  no contradice el texto final.
- Notas de vigencia en `REQ-010`, `REQ-014`, `REQ-015` y `REQ-025`.
- [REQ-029](../requirements/REQ-029-tipos-dano-resistencias.md#requisitos-técnicos)
  T-010 y [ADR-023](../decisions/ADR-023-tipos-dano-paquetes-bandas.md).

# Criterios de aceptación

- [x] `turn-economy.md#combate` muestra la fórmula por paquetes, la tabla de
      bandas, el catálogo de armas con paquetes y los perfiles vigentes; la
      fórmula de daño único queda solo como historia claramente marcada.
- [x] `architecture.md` describe el resolvedor único, los perfiles en las
      unidades, el desglose de eventos y los hechizos tipados; no afirma que la
      armadura absorbe daño mágico o eléctrico.
- [x] El glosario define tipo, paquete, banda, perfil y daño del arma sin
      contradecir el código; distingue daño mágico de nivel de magia.
- [x] Las notas de vigencia de `REQ-010`, `REQ-014`, `REQ-015` y `REQ-025` apuntan
      al modelo implementado y a las tareas que lo cierran.
- [x] El enlace a `ADR-023` funciona y el ADR no contradice lo implementado.
- [x] `pnpm run docs:check` y `pnpm run verify` pasan; no se edita código de juego
      ni tests.

# Plan de test

- Unitario: no aplica.
- Integración: `pnpm run docs:check` valida frontmatter, enlaces y tablero.
- E2E / visual: no aplica.
- Manual: leer las secciones de combate y magia de arriba abajo y comprobar que
  no queda una regla antigua como vigente.

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0091/attempt-1/report.md`
- [x] Salida de `pnpm run docs:check` y de `pnpm run verify`
- [x] Commit SHA en la rama `task/TASK-0091`

# Restricciones

- No cambiar reglas ni valores; solo documentar lo implementado.
- No editar `docs/harness/**`, `docs/templates/**`, `AGENTS.md` ni `.opencode/**`.
- No reescribir el historial de decisiones de `REQ-010` o `REQ-015`.
- Sin dependencias nuevas.

# No objetivos

- QA visual y E2E (TASK-0092).
- Rebalanceo o ajuste de valores estimados.
- Bestiario completo o asignación de las 64 entradas.
