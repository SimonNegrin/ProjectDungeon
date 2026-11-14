---
type: Task Brief Detail
title: "TASK-0105: detalle del intento 1"
description: Marcado de las tres zonas, contrato del modelo, tests y evidencia.
task: TASK-0105
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T13:05:00Z }
---

# Marcado del HUD izquierdo

`index.html`, dentro de `.hud-left` (que conserva `ui-outset` y su fondo de
panel):

```html
<section class="hud-zone ui-outset" data-testid="hud-zone-character"
         data-zone="character" aria-label="Personaje">
  <div class="hud-portrait ui-inset" data-testid="hud-portrait" aria-hidden="true"></div>
  <div class="hud-character-data">
    <p class="hud-player-name" data-testid="hud-player-name">—</p>
    <p class="hud-archetype" data-testid="hud-archetype">—</p>
    <p class="hud-condition" data-testid="hud-condition" hidden></p>
  </div>
</section>

<section class="hud-zone ui-outset" data-testid="hud-zone-weapon"
         data-zone="weapon" aria-label="Arma actual" hidden>
  <div class="hud-weapon-sprite ui-inset" data-testid="hud-weapon-sprite"
       aria-hidden="true"></div>
  <div class="hud-weapon-data">
    <p class="hud-weapon-name" data-testid="hud-weapon">—</p>
    <p class="hud-weapon-stats" data-testid="hud-weapon-stats">—</p>
  </div>
</section>

<section class="hud-zone ui-outset" data-testid="hud-zone-stats"
         data-zone="stats" aria-label="Stats y traits">
  <div class="hud-fields">
    <span class="hud-stat">PV <strong data-testid="hud-player-hp">20/20</strong></span>
    <span class="hud-stat">MP <strong data-testid="hud-player-mp">6/6</strong></span>
    <span class="hud-stat" data-testid="hud-magic-row" hidden>Magia
      <strong data-testid="hud-player-magic">0</strong></span>
    <span class="hud-stat" data-testid="hud-mana-row" hidden>Maná
      <strong data-testid="hud-player-mana">0/0</strong></span>
    <span class="hud-stat">Acciones <strong data-testid="hud-action">2/2</strong></span>
  </div>
  <p class="hud-stats" data-testid="hud-stats"></p>
  <p class="hud-traits" data-testid="hud-traits" hidden></p>
</section>
```

Después de las zonas, en este orden y sin marco ni fondo: `weapon-hint` (pista
de objeto en el suelo, ya existente), un contenedor `.hud-footer` con
`hud-keys` y `hud-suggestion`, y `hud-message`. El pie se ancla con
`margin-top: auto`; las teclas y la sugerencia conservan sus `data-testid` y su
texto.

Elimina del HUD izquierdo los nodos `hud-phase`, `hud-enemy-hp`, `hud-turn`,
`hud-status` y la regla `.hud-state-line`. `F1` sigue mostrando fase, turno,
estado y vida en `buildDebugModel`; no cambies ese overlay.

# Estilo

- `.hud-zone`: `display:flex`, `flex-direction:column`, `gap: --ui-unit*4`,
  `padding: --ui-unit*6`, `background: var(--ui-raised)`, `min-width:0`.
- Personaje en dos columnas: `display:grid;
  grid-template-columns:auto minmax(0,1fr); align-items:start`. El retrato
  conserva 64 unidades y `image-rendering: pixelated`; los datos van en columna
  y alineados arriba.
- Arma: grid de sprite + datos; el sprite usa el recorte de `items.png` con
  `background-size: calc(var(--ui-unit) * 352) calc(var(--ui-unit) * 832)` y
  `background-position` calculado desde `ITEMS[id].sprite.rect` escalado, igual
  que `inventory-panel-view.ts`. Nombre en `hud-weapon`; acierto y daño en
  `hud-weapon-stats` con signo (`+2 acierto · +6 daño`).
- Stats: reutiliza `.hud-fields` en columna; «PV» sustituye a «Vida».
- Ningún valor en px fijo, `rem` ni `clamp()`: gaps, paddings, sprite y bordes
  salen de `--ui-unit`/`--ui-line`. Sin `#hex`, `rgb()`, `color-mix()`,
  `border-radius`, `box-shadow`, `text-shadow`, degradados ni blur.
- La animación de pulso del arma debe seguir aplicándose al elemento con
  `data-testid="hud-weapon"` y clase `is-pulsing`, con una regla equivalente a
  la actual pero adaptada al nuevo nodo.

# Modelo (`src/host/hud.ts`)

- Quita de `HudModel` y de `buildHudModel` `phase`, `enemyHp`, `turn` y `status`;
  no tienen otro consumidor que el HUD retirado. `phaseLabel` y `statusLabel`
  siguen en `buildDebugModel`.
- `playerMagicVisible: boolean` = `stats.magicLevel > 0`; `playerManaVisible`
  sigue siendo `mana.max > 0`.
- `traits: string | null`; `null` cuando no hay traits. `traitsLabel` devuelve
  `null` en ese caso; no queda «Sin traits activos» en el HUD.
- `weapon` pasa a un objeto `{ name, accuracy, damage, sprite } | null` o a
  campos equivalentes (`weaponName`, `weaponAccuracy`, `weaponDamage`,
  `weaponSprite`, `weaponVisible`). `null`/`false` sin arma; no se compone el
  texto «Sin arma». `sprite` es el rect de `ITEMS[...].sprite`.
- Nombre, arquetipo, condición, PV, MP, acciones y atributos siguen derivándose
  del primer jugador; no se añade estado propio ni se inventan filas.
- La vista oculta la zona de arma con `hidden`, la fila de magia con
  `playerMagicVisible`, la de maná con `playerManaVisible` y el bloque de traits
  con `traits === null`. Los nodos ocultos no dejan hueco (`[hidden]` ya lo
  garantiza).

# Tests

Unitarios (`tests/unit/host/**`):

- `hud.test.ts`: estado inicial sin magia/maná/traits; mago con magia y maná;
  fantasma con condición; hotseat; arma con nombre/acierto/daño/sprite y sin
  arma con `weapon` nulo; sin propiedades de fase/turno/estado/PV enemigo.
- `session.test.ts`: sustituye la lectura de `enemyHp` del modelo por una
  comprobación de `buildDebugModel` que contenga la vida del enemigo.
- `equipment-integration.test.ts`, `hud-detail.test.ts` y `spell-flow.test.ts`:
  adapta las aserciones de `weapon`, `traits`, magia y maná al contrato nuevo.
- `ui-foundations.test.ts`: declara las tres zonas con `ui-outset`, el
  HUD izquierdo outset, el retrato inset, ausencia de los cuatro testids
  retirados en `hud-left` y pie posterior a las zonas. La auditoría de colores y
  vocabulario moderno debe seguir pasando sin excepciones nuevas.

E2E:

- Nueva `tests/e2e/hud-left-zones-qa.spec.ts` a 900×700 y 1280×720:
  tres zonas visibles; zona de personaje con retrato a la izquierda del texto y
  bordes superiores alineados; arma con sprite/nombre/stats; ausencia de fase,
  turno, PV enemigo y estado; teclas y sugerencia debajo de las zonas, sin
  marco; capturas de los estados con/sin arma, con/sin magia, fantasma y
  sugerencia.
- Actualiza sin retirar cobertura: `game-input-hud`, `frame-qa`,
  `generated-map-qa` (fase/turno/enemigo pasan a `F1` y se comprueba su ausencia
  en el HUD), `equipment-hud-qa` y `combat-equipment-qa` (nombre + stats del
  arma), `inventory-equipment-qa` (`Sin arma` pasa a zona oculta),
  `spell-hud-qa` (filas condicionales) y `action-counter-turn-qa` (pie).
- No debilites: cada aserción retirada se sustituye por una equivalente de
  ausencia o por la comprobación en `F1`.

# Comandos, alcance y evidencia

- `pnpm run verify` (120 s) → `verify-output.txt`.
- `pnpm run test:e2e` (180 s) → `e2e-output.txt`.
- Capturas:
  `E2E_ARTIFACTS_DIR=artifacts/TASK-0105/attempt-1/e2e pnpm run test:e2e`
  (180 s); quedan en `<spec>/screenshots/`.
- Informe `artifacts/TASK-0105/attempt-1/report.md` (≤4 KB) con commit SHA,
  comandos y timeouts, criterios y rutas.
- Escribe solo en `src/host/**`, `index.html`, `tests/**` y
  `artifacts/TASK-0105/**`. No toques `src/game/**`, `docs/**`, `package.json`
  ni `pnpm-lock.yaml`. pnpm, nunca npm/npx.
