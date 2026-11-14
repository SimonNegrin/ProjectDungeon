---
type: Task Verification
title: "TASK-0111: verificación independiente del lead"
description: Reejecución de verify y E2E, revisión de capturas, criterios y disposición de fricción.
task: TASK-0111
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T14:55:00Z }
---

# Comandos reejecutados

| Comando | Timeout | Resultado | Evidencia |
|---|---:|---|---|
| `pnpm run verify` | 300 s | OK: docs:check, config:check, 93 archivos, 1319/1319 tests, `tsc`, build y bundle | `lead-verify-output.txt` |
| `pnpm run test:e2e` | 360 s | OK: 187/187 en 1,3 min | `lead-e2e-output.txt` |

# Diff y alcance

- Rama `task/TASK-0111` fusionada en `main` como `315533c`.
- Cambios revisados: `src/host/hud.ts` (modelo y pintado del retrato),
  `src/host/hud-detail.ts` (guarda de arquetipo fuera del roster), tests nuevos
  `tests/e2e/hud-portrait-qa.spec.ts` y `tests/unit/host/hud.test.ts`, más
  brief, informe, capturas y logs.
- Sin cambios en `src/game/**`, `index.html`, `docs/requirements/**`,
  `docs/harness/**`, plantillas, `package.json`, `pnpm-lock.yaml` ni en el
  render del mapa.
- Sin `test.skip`, `test.only`, `describe.skip` ni aserciones retiradas.

# Criterios comprobados

1. **Miniatura del jugador activo:** `HudModel.portrait` se deriva de
   `state.players[0].archetypeId`; la vista pinta `hud-portrait` con
   `background-position` inline.
2. **Cambio conjunto:** E2E llama a `window.__game.setup` en la misma página y
   lee nombre, arquetipo y posición de la hoja de forma síncrona; los tres
   cambian sin recargar.
3. **Tres arquetipos:** guerrero `0,32`, mago `32,128` y pícaro `96,0`; las
   capturas muestran caballero, mago azul y pícaro distintos.
4. **Sprite existente y escala:** hoja local `rogues.png`, `image-rendering:
   pixelated`, `background-size` lógico 448 y retrato 64×64 a la escala del
   marco; sin tokens, paleta, radios ni medidas nuevas.
5. **Sin huecos ni CLS:** retrato, nombre y zona Personaje mantienen caja
   idéntica (±1 px) entre los tres jugadores a 900×700 y 1280×720.
6. **Sin cambios de dominio:** `src/game/**`, estado, inventario, navegación y
   snapshot intactos; la suite completa sigue verde.

# Evidencia visual revisada

- `e2e/hud-portrait-qa/screenshots/`: `hud-portrait-{warrior,mage,rogue}-900x700.png`
  y `…-1280x720.png`.
- Los logs `hud-portrait-900x700.json` y `hud-portrait-1280x720.json` repiten
  las mismas cajas para los tres personajes y posiciones de recorte distintas.
- `portrait-audit.json` de TASK-0111: `identical: false`, «El retrato varía
  entre arquetipos».

# Fricción

El brief propuso `calc(var(--ui-unit) * -sx2px)`, pero `--ui-unit` ya es una
longitud; el runner usó `calc(var(--ui-scale) * Npx)`, igual que el sprite del
arma. Es un **error local del brief**, no una carencia de arnés o plantilla: la
plantilla no fija fórmulas. Disposición `rejected`; sin dueño pendiente y sin
cambio de plantilla.

# Veredicto

Pasa. Los seis criterios quedan cubiertos y la corrección no altera la
disposición, escala, paleta, reglas ni navegación del corte.
