---
type: Task Brief Detail
title: "TASK-0111: detalle del brief del intento 1"
description: Mapa de sprites, aplicación del recorte y pruebas del retrato.
task: TASK-0111
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T15:00:00Z }
---

# Mapa de sprites

`rogues.png` es una rejilla de 7×7 celdas de 32×32. `rogues.txt` documenta las
coordenadas; la fila 6 no tiene sprites y la fila 7 del texto ocupa `sy=160`.
Usa este mapa host-side (arquetipo → sprite del catálogo):

| Arquetipo | Sprite (32rogues) | sx, sy |
|---|---|---|
| warrior | 2.a knight | 0, 32 |
| barbarian | 4.a male barbarian | 0, 96 |
| rogue | 1.d rogue | 96, 0 |
| archer | 1.c ranger | 64, 0 |
| mage | 5.b male wizard | 32, 128 |
| cleric | 3.d male war cleric | 96, 64 |
| spellblade | 4.d swordsman | 96, 96 |
| cook | 7.d baker | 96, 160 |
| farmer | 7.a farmer | 0, 160 |

`warrior` conserva el recorte actual (`0,32`). Los tres arquetipos del QA
—guerrero, mago y pícaro— deben dar posiciones distintas.

# Aplicación

- Añade al modelo del HUD un `portrait: SpriteRect | null` derivado de
  `player?.archetypeId`.
- En `createHudView.update`, pinta `hud-portrait` con el mismo patrón que el
  sprite del arma: `backgroundPosition = calc(var(--ui-unit) * -sx2px)
  calc(var(--ui-unit) * -sy2px)`, con `sx2 = sx * 2` y `sy2 = sy * 2`, porque la
  hoja se pinta a 448 px sobre 224 px.
- No dupliques colores, tamaños ni el mapa en CSS. Mantén el fallback estático
  de `.hud-portrait` solo si no interfiere; el estilo inline manda.

# Pruebas

- Unitario (`tests/unit/host/hud.test.ts`): el modelo cambia el recorte entre
  guerrero, mago y pícaro; los tres son distintos; un arquetipo sin jugador da
  `null`. Cubre los nueve si el mapa es único.
- E2E nuevo (`tests/e2e/hud-portrait-qa.spec.ts` o el spec de HUD izquierdo):
  - Carga un estado con cada arquetipo y comprueba textContent de nombre,
    arquetipo y `background-position` del retrato en la misma actualización.
  - En la misma página, cambia `players[0]` con `window.__game.setup` y verifica
    que los tres valores cambian juntos sin recargar.
  - Mide cajas de retrato, nombre y zona Personaje antes y después: sin CLS ni
    saltos (tolerancia ≤1 px).
  - Captura guerrero, mago y pícaro a 900×700 y 1280×720 con
    `E2E_ARTIFACTS_DIR=artifacts/TASK-0111/attempt-1/e2e`.
- `pnpm run verify` y `pnpm run test:e2e` con timeout explícito.

# Evidencia

- `portrait-audit.json` puede seguir siendo no bloqueante en
  `qa-visual-revision-ui`; ahora debe decir «El retrato varía entre arquetipos».
- Capturas: `hud-portrait-warrior-900x700.png`,
  `hud-portrait-mage-900x700.png`, `hud-portrait-rogue-900x700.png` y las tres a
  `1280x720` (o nombres equivalentes bajo el spec).
- En el informe: commit, comandos, resultados y rutas de capturas.
