---
type: Task Report
title: "TASK-0056: informe de ejecución"
description: "Guerrero por defecto, identidad en HUD/debug, tests y smoke E2E."
task: TASK-0056
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-10T00:14:00Z }
artifacts: artifacts/TASK-0056/attempt-1/
verified:
---

# Estado

`success`. El jugador por defecto es el Guerrero del roster, el host muestra
nombre y arquetipo y el ataque distingue arma de `unarmed`.

# Cambios

- `src/game/types.ts`: `Unit.archetypeId: ArchetypeId | null` (serializable).
- `src/game/roster.ts`: `createPlayerFromArchetype` rellena `archetypeId`.
- `src/game/engine.ts`: el jugador inicial sale de
  `createPlayerFromArchetype('warrior', …)` con el spawn real
  (`spawns.party[0] ?? spawns.player`); los enemigos llevan `archetypeId: null`.
  Se elimina el `Aventurero` provisional.
- `src/host/hud.ts`: `HudModel.playerName`/`archetype`, grupo `hud-identity`
  (`hud-player-name`, `hud-archetype`) y línea `Identidad` en el overlay F1.
- Tests: unitarios de roster, engine, HUD y helpers; E2E de personaje por
  defecto y expectativas actualizadas a resistencia +1 leyendo `ROSTER`.
- `artifacts/…/brief.md`: enlace roto de REQ-015 corregido a
  `../../../docs/requirements/…` para que `docs:check` no falle.
- Commit SHA: `81d45cf` (`feat(TASK-0056): Guerrero por defecto, arquetipo en HUD y tests`).

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | OK (758 unitarios, build y bundle; aviso de tamaño del brief) | `verify-output.txt` |
| `pnpm run test:e2e` | OK 77/77, 37 s | `test-output.txt` |
| E2E dirigido (`default-character-qa`, `equipment-hud-qa`, `combat-equipment-qa`, `game-input-hud`) | OK 10/10 | `logs/affected-e2e.txt`, `logs/default-character-e2e.txt` |

# Evidencia visual

- `screenshots/default-character-hud.png` (también en
  `default-character-qa/screenshots/`).
- Debe mirarse: HUD superior con **Nombre Guerrero**, **Arquetipo Guerrero**,
  Espada +3/+3 y **+1 resistencia**; el personaje aparece en el spawn del mapa.
- Estado y DOM verificados además de la captura; sin errores de consola.

# Desviaciones

- No se editaron `docs/**`: el glosario/diseño/arquitectura del criterio T-005
  quedan para el lead. Texto propuesto: glosario con «arquetipo» (entrada del
  roster con stats, equipo, variantes e identidad) y «roster» (catálogo de los
  nueve arquetipos en `src/game/roster.ts`); arquitectura con
  `Unit.archetypeId` como identidad serializable y el HUD derivando el nombre
  del arquetipo desde `ROSTER`.
- Se corrigió un enlace relativo roto del brief recibido (artefacto, no `docs/`).

# Problemas conocidos y preguntas abiertas

- El brief se recortó a 2558 B; sin aviso de tamaño.
- La documentación pendiente la aplicó `requirements-writer` (commit `e8392da`);
  el lead la verificó y re-ejecutó la suite final.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| `verify` valida también los handoffs de `artifacts/`; un enlace relativo roto en el brief del lead bloquea al runner antes de probar código | `verify-output.txt` (aviso del brief); fallo inicial reproducible al resolver `../requirements/…` desde `artifacts/TASK-0056/attempt-1/` | Corregir el enlace del brief a `../../../docs/…` | Cualquier brief generado con la ruta corta vuelve a bloquear `docs:check` en cada intento | Resolver enlaces de `artifacts/**` desde la raíz o documentar la ruta correcta en la plantilla de brief | Bajo; solo validador/plantilla | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2558 |
| `report_bytes` | 3805 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
