---
type: Task Brief
title: "TASK-0054: brief del intento 1"
description: Nombres nuevos del esquema en HUD/F1, docs y ADR-015.
task: TASK-0054
attempt: 1
status: stable
brief_bytes: 2424
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T23:50:00Z }
---

# Objetivo

HUD y `F1` con `habilidad`, `fuerza`, `defensa` y `resistencia`, sin etiquetas
`acierto`/`daño`; turn-economy, glosario, arquitectura y `ADR-015` describen los
ocho atributos y la resistencia en la absorción. Sin tocar fórmulas ni balance.

# No objetivos

- Motor, catálogos o balance (cerrado en TASK-0053).
- Roster, Cuchillo, nombre, arquetipos y pantalla de inicio (REQ-015/REQ-016).
- `experiments/`, `index.html`, `public/` ni dependencias.

# Invariantes

- `unit.stats` es la única fuente; no se duplican valores.
- No se borran, saltan ni debilitan tests: se conservan las aserciones.
- Balance v1 intacto: jugador +1/+1/+1 con resistencia 0; enemigos 0.
- No se renombran claves del motor (`AttackRolls.damage`/`armor`).
- REQ-010 y ADR-012 quedan como historia; ADR-015 registra lo vigente.

# Criterios de aceptación

En `docs/tasks/TASK-0054-host-docs-esquema-adr-015.md#criterios-de-aceptación`.

# Contexto mínimo

- `src/host/hud.ts`: `modifiersLabel`, `HudModel.modifiers`, testid
  `hud-modifiers` y línea `Modificadores` de `F1`.
- Formato acordado: modelo `stats`, testid `hud-stats`, etiqueta `Atributos` y
  valor `+1 habilidad · +1 fuerza · +1 defensa · +0 resistencia`.
- `F1`: línea `Atributos ...`; en tiradas, `golpe` (daño) y `absorción`
  (armadura) para no dejar `acierto`/`daño` en los textos visibles.
- Tests: `tests/unit/host/hud.test.ts`, `tests/e2e/equipment-hud-qa.spec.ts`,
  `tests/e2e/combat-equipment-qa.spec.ts`.
- Docs: `docs/design/turn-economy.md#combate`, `docs/glossary.md` y
  `docs/design/architecture.md#combate-y-azar`.
- ADR: `docs/decisions/ADR-015-*.md` enlazado en `docs/decisions/index.md`.
- [REQ-014](../../../docs/requirements/REQ-014-atributos-inherentes-personajes.md#requisitos-técnicos),
  sobre todo T-005.

# Artefactos

`artifacts/TASK-0054/attempt-1/`: `report.md`, salidas de `docs:check`,
`verify` y E2E, `screenshots/` y commit SHA.

# Riesgos y decisiones abiertas

- «Sin etiquetas antiguas» aplica a textos de HUD/F1; comentarios y claves
  internas del motor pueden conservar `damage`/`armor`.
- Seguir el formato de ADR-014 para el ADR nuevo.
