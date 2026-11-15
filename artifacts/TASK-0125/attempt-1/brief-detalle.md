---
type: Task Brief Detail
title: "TASK-0125: contrato de la ficha de arquetipo"
description: Modelo puro, tabla de 18 celdas, DOM, estilos y matriz de pruebas.
task: TASK-0125
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T09:35:00Z }
---

# Frontera

La ficha es presentación del host. No cambia el motor, no crea `GameSession`, no
toca `src/game/roster.ts` ni `src/game/config.ts` y no dibuja al jugador en el
mapa ni en el HUD.

Módulos previstos:

- `src/host/archetype-sheet.ts`: modelo puro de la ficha y tabla de 18 celdas.
  Sin DOM, sin reloj, sin estado propio.
- `src/host/player-screen-view.ts`: construye la ficha dentro de
  `[data-testid="player-archetypes"]`, la actualiza en `render()` y mueve el
  foco como hoy.
- `src/host/player-screen.ts`: se reutiliza tal cual; `setArchetype` ya devuelve
  la variante a 1 y conserva el nombre.
- `index.html` y `src/host/ui.css`: retiran la sección de variantes estática y
  dan cabida a la ficha dinámica. No se añaden assets.

# Modelo de ficha

```ts
interface SheetStat {
  readonly id:
    | 'habilidad' | 'fuerza' | 'defensa' | 'resistencia' | 'punteria'
    | 'magia' | 'pv' | 'mp' | 'acciones';
  readonly label: string;
  readonly value: string;
}
interface SheetVariant {
  readonly variant: 1 | 2;
  readonly rect: SpriteRect;      // celda de 32×32 de rogues.png
  readonly accessibleName: string; // «Guerrero, variante 1», sin género
}
interface ArchetypeSheet {
  readonly id: ArchetypeId;
  readonly name: string;
  readonly stats: readonly SheetStat[]; // exactamente 9, en el orden de arriba
  readonly weapon: string;
  readonly magicLevel: number;
  readonly variants: readonly [SheetVariant, SheetVariant];
}
export function buildArchetypeSheet(id: ArchetypeId): ArchetypeSheet;
```

Todo sale de `ROSTER[id]` en el momento de construir:

| Fila | Origen | Formato |
|---|---|---|
| Habilidad | `stats.habilidad` | con signo (`+1`, `0`, `−1`) |
| Fuerza | `stats.fuerza` | con signo |
| Defensa | `stats.defensa` | con signo |
| Resistencia | `stats.resistencia` | `profileRows()` de `damage-labels.ts`, p. ej. `filo ● · contundente ● · punzante ▲ · mágico ● · eléctrico ●` |
| Puntería | `stats.punteria` | con signo |
| Magia | `stats.magicLevel` | entero 0–4; etiqueta «Nivel de magia» |
| PV | `maxHp` | entero |
| MP | `maxMp` | entero |
| Acciones | `stats.acciones` | entero |

No copies los valores ni crees una tabla paralela: los tests deben leer
`ROSTER` y comparar. Arma temática:

- `equipment.weaponId !== null` → `ITEMS[equipment.weaponId].name` (`Espada`,
  `Hacha`, `Daga`, `Cuchillo`).
- si no, `futureWeapon !== null` → `${futureWeapon} (futura)` (`arco (futura)`,
  `bastón (futura)`, `maza (futura)`, `espada mágica (futura)`,
  `guadaña (futura)`).
- fallback `—` solo si ambos son `null` (hoy no ocurre).

No uses `createPlayerFromArchetype` ni `effectiveStats` para la ficha: el equipo
puede alterar los valores efectivos y aquí se muestran los inherentes del
arquetipo. `magicLevel` es el nivel único de REQ-025; no dupliques maná.

# Tabla de 18 celdas

Exporta `ARCHETYPE_VARIANT_CELLS: Readonly<Record<ArchetypeId, readonly [SpriteRect, SpriteRect]>>`
con `{ sx, sy, sw: 32, sh: 32 }`, exactamente la tabla de REQ-016:

| Arquetipo | Variante 1 | Variante 2 |
|---|---|---|
| warrior | (0, 32) | (64, 32) |
| barbarian | (0, 96) | (160, 96) |
| rogue | (96, 0) | (128, 0) |
| archer | (64, 0) | (32, 0) |
| mage | (32, 128) | (0, 128) |
| cleric | (96, 64) | (32, 64) |
| spellblade | (96, 96) | (128, 96) |
| cook | (96, 160) | (128, 160) |
| farmer | (0, 160) | (0, 192) |

No toques `PORTRAIT_RECTS` de `hud.ts`: el HUD sigue mostrando la variante 1
hasta TASK-0127. Esta tabla es la fuente de la ficha; TASK-0127 podrá unificar.

# DOM y accesibilidad

Estructura dentro de `[data-testid="player-archetypes"]` (el contenedor se vacía
con `replaceChildren()` en cada montaje, antes de crear nada):

```text
player-archetypes
├── [data-testid="player-archetype-options"] role="group"
│     aria-labelledby="player-archetype-label"
│     └── 9 × button[data-testid="player-archetype-<id>"] aria-pressed
└── section[data-testid="player-sheet"] aria-labelledby="player-sheet-name"
      ├── h3#player-sheet-name[data-testid="player-sheet-name"]
      ├── dl con 9 filas [data-testid="player-sheet-stat-<id>"]
      │     <dt>Etiqueta</dt><dd>Valor</dd>
      ├── p[data-testid="player-sheet-weapon"] «Arma temática: …»
      └── [data-testid="player-variants"] role="group" aria-label="Variante"
            └── 2 × button[data-testid="player-variant-1|2"]
                  aria-pressed; aria-label="<Arquetipo>, variante N"
                  ├── span.player-variant-sprite aria-hidden="true"
                  ├── span «Variante N»
                  └── span[data-testid="player-variant-selected-N"] «Seleccionada»
```

Reglas:

- Retira la sección estática `player-variants` de `index.html`: los únicos
  `player-variant-1/2` son los botones dinámicos. Así no hay testids duplicados
  al reentrar.
- Los nueve botones de arquetipo se crean una sola vez por montaje y conservan
  su comportamiento actual (clic, `aria-pressed`, foco al entrar/cambiar de
  jugador). La ficha y las miniaturas se actualizan en `render()`: no rehagas el
  contenedor al cambiar de arquetipo o se perderá el foco.
- La miniatura es la propia celda 32×32 ampliada con CSS (mismo criterio que
  `.hud-portrait`: `background-image: url("/assets/32rogues/rogues.png")`,
  `background-size` 448 px lógicos, `background-position` con `sx/sy × 2`,
  `image-rendering: pixelated`). No uses `<canvas>` ni cargues el PNG dos veces.
- «Seleccionada» es texto visible en la variante activa (no solo color) y
  `aria-pressed="true"`; la otra variante lo oculta. Sin «caballero»,
  «caballera», «maga», «sacerdote», «esgrimidor», «herrera» ni similares: solo
  «Variante 1» y «Variante 2».
- El botón de variante tiene nombre accesible con el arquetipo y el número; el
  sprite va `aria-hidden` para no duplicar el anuncio.
- La ficha va después de los nueve botones en orden de lectura. No añadas un
  tab-stop extra para texto estático: con teclado se recorren los arquetipos y
  las dos miniaturas; la ficha se lee en el orden del documento y se actualiza
  al elegir arquetipo.
- Reutiliza tokens `--ui-*`, clases `player-*`, `ui-outset`/`ui-inset` y relieve
  existente. Nada de `box-shadow` (`ui-foundations.test.ts` lo prohíbe). A
  1280×720 la ficha y las dos miniaturas deben verse sin depender del scroll;
  a 900×700 se admite scroll interno porque `.player-screen` ya lo tiene.

# Integración y reentrada

- `main.ts` no cambia salvo que el montaje lo requiera; no crees sesión ni
  resumen.
- Cancelar y volver a entrar debe dejar 9 botones de arquetipo, 1 ficha y 2
  miniaturas, sin testids duplicados. La regresión E2E de reentrada de
  TASK-0124 se adapta y sigue cubriendo esto.
- Al cambiar de jugador (`next`/`back`), la ficha muestra el arquetipo y la
  variante de ese jugador; la variante seleccionada de cada jugador se conserva.
- `?test=1` no monta la pantalla; no toques ese bypass.

# Matriz de pruebas

Unitario (`tests/unit/host/archetype-sheet.test.ts`, Vitest node):

- Los 9 arquetipos: 9 filas, ids y orden esperados; cada valor coincide con
  `ROSTER` (no con constantes del test).
- Arma: Guerrero «Espada», Bárbaro «Hacha», Pícaro «Daga», Cocinero «Cuchillo»,
  Arquero «arco (futura)», Mago «bastón (futura)».
- Magia: Mago 4, Clérigo 3, Guerrero mágico 2, Cocinero 1, resto 0.
- Variantes: dos por arquetipo, `sw`/`sh` 32, rects iguales a la tabla de 18
  celdas, nombres accesibles sin etiquetas de género.
- Tabla: 18 celdas, `sx`/`sy` múltiplos de 32 y dentro de la rejilla 7×7
  (0–192).
- Reset: `createPlayerScreen`, Mago + variante 2, cambiar a Pícaro → variante 1;
  la ficha construida para Pícaro coincide con `ROSTER.rogue`.

E2E (`tests/e2e/player-screen.spec.ts`, 1280×720 y 900×700, `/` sin `?test=1`):

- Adapta los locators de los 9 arquetipos a
  `[data-testid="player-archetype-options"]`; el resto de aserciones de
  TASK-0124 se conserva.
- Guerrero: ficha visible con 9 filas, «Espada» y nivel 0; dos miniaturas con
  nombres accesibles «Guerrero, variante 1/2»; variante 1 marcada con
  `aria-pressed` y «Seleccionada». Captura `ficha-guerrero-1280x720`.
- Clic en Mago: la ficha cambia junta (Mago, «bastón (futura)», magia 4, PV 12,
  MP 5), las miniaturas pasan a «Mago, variante 1/2» y la variante vuelve a 1.
  Clic en variante 2: `aria-pressed` y «Seleccionada» en la 2. Captura
  `ficha-mago-1280x720`.
- Teclado: desde Guerrero, `Tab` hasta otro arquetipo y `Enter` actualiza la
  ficha; `Tab` llega a las miniaturas y `Enter` selecciona la variante 2.
- Reentrada: tras cancelar y volver, 9 botones de arquetipo, 1 ficha, 2
  miniaturas y testids únicos.

Manual: a 1280×720, comprobar que las dos miniaturas se distinguen y que la
ficha se lee sin depender del color.

# Evidencia

En `artifacts/TASK-0125/attempt-1/`: `report.md`, `test-output.txt`,
`verify-output.txt`, `e2e-output.txt`, `commit.txt` y las capturas que el helper
deja en `tests/e2e/player-screen/screenshots/`. El informe enlaza este detalle y
no repite la matriz.
