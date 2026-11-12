---
type: Task Brief
title: "TASK-0080: brief del intento 1"
description: Réplica visible con ataque girado, cue propio, docs y expectativas E2E actualizadas.
task: TASK-0080
attempt: 1
status: stable
brief_bytes: 2560
read_detail: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-12T21:30:00Z }
---

# Objetivo

Que la réplica se vea como reacción inmediata: ataque girado hacia el atacante,
sin texto propio y con cue/beat propio; deja la regla en glosario, diseño y ADR,
y actualiza las cinco expectativas E2E obsoletas de TASK-0079.

# No objetivos

Motor, regla ni payload de `ReplicaPerformed`; aviso/probabilidad/indicador en
el HUD; arte, audio o texto nuevos; réplica a distancia/mágica; −1; rebalanceo;
dependencias.

# Invariantes

- `ReplicaPerformed` conserva payload y orden tras `AttackPerformed`.
- La réplica **no lleva etiqueta ni número de daño**; el `Fallo` original se
  mantiene y el daño se lee en la barra de PV.
- El giro es la animación de ataque con embestida desde el defensor hacia el
  atacante; no añadas frames, sprites ni orientación.
- `prefers-reduced-motion`: estado final sin tween, mismo orden y sin cue activo.
- No borres, saltes ni relajes tests. Las cinco expectativas obsoletas se
  actualizan con comentario del motivo; el resto no se toca.
- No edites `docs/requirements/**`; las enmiendas ya están declaradas en
  `REQ-027` y verificadas en `REQ-009`/`REQ-010`. Si falta una anotación,
  regístrala como fricción.
- `package.json` y `pnpm-lock.yaml` intactos; sin imports de `experiments/`.

# Criterios de aceptación

En la ficha, sin copiar:
[criterios](../../../docs/tasks/TASK-0080-host-docs-replica-visible.md#criterios-de-aceptación).

# Contexto mínimo

- `src/host/motion.ts` (stub de beat/cue), `world-effects.ts`, `feedback.ts`,
  `feedback-events.ts`, `feedback-config.ts`, `main.ts`, `debug.ts`.
- `docs/glossary.md`, `docs/design/{turn-economy,architecture}.md`,
  `docs/decisions/` e índice.
- [REQ-027](../../../docs/requirements/REQ-027-replica-combate-cuerpo-a-cuerpo.md#requisitos-técnicos)
  T-006…T-008, [REQ-017](../../../docs/requirements/REQ-017-feedback-visual-eventos.md#matriz-evento--feedback).
- **Lee [brief-detalle.md](brief-detalle.md)**: interpretación, código, E2E y QA.

# Artefactos

`artifacts/TASK-0080/attempt-1/{report.md,verify-output.txt,logs/}`; capturas
1.280×720 y 900×700 en `tests/e2e/<spec>/screenshots/`; commit con SHA.

# Riesgos

No adelantes PV de la réplica ni rompas el fallo; las capturas deben mostrar la
secuencia real.
