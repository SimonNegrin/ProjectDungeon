---
type: Task Brief Detail
title: "TASK-0138: contrato del esquema v1"
description: Campos, validación estricta, manifiesto y pruebas de ida y vuelta.
task: TASK-0138
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T19:05:00Z }
---

# API

En `src/game/save.ts`, exports puros y sin host:

- `SAVE_FORMAT_VERSION = 1`.
- `buildSaveFiles(state, { gameVersion, createdAt })` →
  `{ manifest: string; save: string }`, JSON determinista (mismo estado +
  argumentos = mismo texto). `createdAt` debe ser ISO UTC terminado en `Z`.
- `parseManifest(input)` y `parseSave(input)` → resultado tipado
  `{ ok: true, value } | { ok: false, error }`; `input` puede ser
  `string | null | undefined`. Nunca mutan estado ni lanzan por datos del
  archivo.
- `readSaveFiles({ manifest?, save? })` → rechaza manifiesto ausente antes de
  interpretar la partida; `value` incluye `state` y `manifest`.
- Errores con `code` estable; sin `eval`, `Function` ni `JSON.parse` con reviver
  ejecutable.

# `partida.json`

Objeto plano, sin anidar el estado en `state`:

```json
{
  "format_version": 1,
  "seed": 1017,
  "rng": { "seed": 1017, "state": 0 },
  "grid": { "width": 40, "height": 40, "tiles": ["floor"] },
  "map": { "…": "GeneratedMap completo" },
  "phase": "player",
  "turn": 1,
  "round": 1,
  "activePlayerId": "player-1",
  "party": [{ "archetypeId": "warrior", "variant": 1, "name": "Ana" }],
  "players": ["Unit completa"],
  "enemies": ["Unit completa"],
  "groundItems": ["ItemInstance + x,y"],
  "containers": ["Container completo"],
  "status": "playing"
}
```

- `seed`, `rng.seed` y `map.seed` coinciden; `turn === round`; si no, rechazo.
- `party` sale de `state.config.players` en orden; al cargar reconstruye
  `config = { seed, players: party }`. `players[i].id` es `player-<i+1>` y el
  activo existe en `players`; `grid` coincide con `map.width/height/tiles`.
- `Unit` conserva claves exactas, incluida `ghost` solo si está presente,
  stats, PV/MP, maná, acciones, `spellsCast`, ocho huecos, mochila, IA y
  `home`/`lastKnown`/`alertTurns`/`hasShouted`.
- `ItemInstance` exige `{ id, itemId, lootable }`; `lootable` es obligatorio y
  no se recalcula al cargar. `itemId` debe existir en `ITEMS`.
- `Container` exige `{ id, x, y, capacity, items }`; `kind` solo
  `chest | corpse`; `corpseOf` solo con `kind: 'corpse'` y referencia a una
  unidad existente. `capacity >= items.length`.
- `map` se valida con las claves de `GeneratedMap` (incluidas las opcionales
  que estén presentes) y sus tipos/rangos; se rechazan claves desconocidas.
- No hay allocator de ids mutable: los ids viajan en mapa, unidades, instancias
  y contenedores. No inventes contadores nuevos ni listas paralelas; anótalo en
  el informe.

# `manifiesto.json`

```json
{
  "format_version": 1,
  "game_version": "0.1.0",
  "created_at": "2026-11-15T19:05:00Z",
  "seed": 1017,
  "summary": {
    "players": [{ "name": "Ana", "archetype": "warrior" }],
    "turn": 1,
    "round": 1,
    "phase": "player"
  }
}
```

`game_version` es texto no vacío y no bloquea la carga; `created_at` ISO UTC
válido; `seed` entero; `summary.players` 1–6 con nombre y arquetipo válidos;
`turn`, `round` enteros positivos; `phase` `player | enemy`.

# Validación

- Estricta en el nivel superior y en cada objeto del estado: claves
  desconocidas, tipos erróneos, `null` inesperado, números no finitos, índices
  fuera de rango y referencias rotas se rechazan.
- Manifiesto ausente/malformado/versión desconocida y partida corrupta se
  rechazan sin estado parcial.
- Un `format_version` distinto de 1 se rechaza; no hay migración.
- La v1 se fija con el `Container` actual (`kind`/`corpseOf` opcionales); si el
  modelo cambia antes de publicar, se sube versión. No cambiar el modelo aquí.

# Round-trip

1. `createInitialState` con 2 jugadores; aplicar comandos hasta tener fantasma,
   cadáver de jugador, cadáver de enemigo con `lootable` y contenedor, objetos
   en suelo, equipo y mochila.
2. `buildSaveFiles`; `readSaveFiles`; `buildSaveFiles` de nuevo con el mismo
   `createdAt`; `save` y `manifest` deben ser idénticos byte a byte.
3. `JSON.stringify(state)` antes y después coincide; la siguiente `rollDie`
   devuelve el mismo dado y estado.

# Tests mínimos

`tests/unit/game/save-schema.test.ts`: campos completos; `lootable` true/false y
cadáver/contenedor preservados; sin recálculo de botín; manifiesto válido,
versión desconocida, ausente, malformado, campos extra y tipos erróneos en
niveles anidados; `turn`/`round`; RNG siguiente; sin claves de presentación
(`timeline`, `camera`, `cursor`, `panel`); modelo `Container` documentado.
