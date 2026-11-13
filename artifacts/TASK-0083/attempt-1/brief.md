---
type: Task Brief
title: "TASK-0083: brief del intento 1"
description: Selección de hechizo, HUD de magia/maná y feedback de impacto, curación, resurrección y rechazos.
task: TASK-0083
attempt: 1
status: stable
brief_bytes: 4092
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T15:10:00Z }
---

# Objetivo

El jugador elige un hechizo disponible y un objetivo solo con teclado, lo lanza
con una pulsación y ve el resultado con un beat legible. El HUD y el debug
muestran magia y maná actual/máximo; los rechazos explican el motivo sin consumir
acción, maná ni RNG.

# No objetivos

- No rediseñar el HUD lateral de `REQ-022`/`REQ-023` ni convertirlo en columnas.
- No tocar catálogo, resolvedor, fórmulas, réplica ni contador de acciones;
  el daño se presenta desde `SpellCast`.
- No IA lanzadora, arte, audio, hechizos nuevos ni resurrección jugable
  completa.

# Invariantes

- Evitar cambios en `src/game/**`; el host no recalcula daño, curación, alcance ni
  maná. Total y desglose salen de `SpellCast.damage` y `damageBreakdown`; un
  fallo no inventa daño y la magia no dispara `ReplicaPerformed`.
- Sin dependencias nuevas; no se borran, saltan ni debilitan tests existentes.

# Criterios de aceptación

Viven en [TASK-0083 § Criterios](../../../docs/tasks/TASK-0083-host-lanzamiento-hechizos-hud.md#criterios-de-aceptación);
plan en [§ Plan de test](../../../docs/tasks/TASK-0083-host-lanzamiento-hechizos-hud.md#plan-de-test).
Requisito: [REQ-025 R-011/R-013/T-004/T-008](../../../docs/requirements/REQ-025-magia-hechizos-mana.md#requisitos-creativos-decididos).

# Contexto mínimo

- `src/host/input.ts`: intenciones puras y teclas; hoy no hay hechizos.
- `src/host/hud.ts`: `buildHudModel`, `buildDebugModel`, `createHudView`.
- `src/host/notices.ts`: `NoticeCode`, `NOTICE_MESSAGES`, `noticeForRejection`;
  `src/game/types.ts`: `RejectionReason`.
- `src/host/{feedback,feedback-config,feedback-events,motion,main}.ts`: beats,
  cues, textos y `fireFeedbacks`.
- `src/game/{spells,magic}.ts` (solo lectura): catálogo, validación atómica y
  `SpellCast` con `damage`, `healing`, `targetHp` y `damageBreakdown`.
- `index.html`, `tests/unit/host/` y `tests/e2e/{game-input-hud.spec.ts,support.ts}`
  como patrón.

# Forma recomendada (decisión técnica del lead)

- Selección: `Q` abre/cierra la lista; con la lista abierta `↑/↓` o `W/S`
  navegan, `1–6` eligen, `Enter` lanza contra el cursor y `Esc` cancela sin
  consumir. Cerrada, `X` lanza el hechizo seleccionado con una pulsación y `Esc`
  lo deselecciona; `F` sigue siendo ataque.
- Lista: seis hechizos con nombre, nivel mínimo, coste y disponibilidad
  (`disponible` / `nivel` / `maná` / `tope`); el seleccionado se distingue.
- HUD: magia y maná del jugador y del enemigo bajo cursor con `data-testid`
  `hud-player-magic`, `hud-player-mana`, `hud-cursor-enemy-magic` y
  `hud-cursor-enemy-mana`; conservar los nodos actuales. Magia 0 puede mostrarse
  como `0` o `sin magia` sin romper el layout.
- Debug: magia y maná del jugador y de todas las unidades enemigas.
- Rechazos: `no-mana`, `insufficient-level`, `out-of-range`, `no-line-of-sight`,
  `spell-limit`, `unknown-spell` y `no-action` con texto propio y sin consumo.
- Feedback: un `SpellCast` de daño reutiliza `-N`/`Fallo` y el desglose con
  beat/cue propio; curación y resurrección tienen beat propio y texto legible
  (`+N`, `Vuelve N PV`) en el objetivo; sin texto de réplica.
- E2E: `?test=1` con Mago nivel 4/maná 16, aliado dañado y enemigos a distancias
  distintas; capturas 1280×720 y 900×700 vía `E2E_ARTIFACTS_DIR`.

# Artefactos

`report.md` (≤4 KB), `test-output.txt`, `verify-output.txt`, `e2e-output.txt`,
`docs-check-output.txt`, capturas y commit(s) en `task/TASK-0083` con SHA.

# Riesgos y decisiones abiertas

- El HUD actual es una barra: extenderla sin rediseñarla.
- `Enter` ya envía `MoveTo` y `1–3` cambian arma; dentro de la lista son modales.
- Curación y resurrección no declaran `damageBreakdown`: demostrar que no
  producen daño ni réplica.
