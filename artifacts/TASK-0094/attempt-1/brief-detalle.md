---
type: Task Brief Detail
title: "TASK-0094: alcance exacto del intento 1"
description: Modelo de instancias, comandos, puente de host y matriz de test.
task: TASK-0094
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T20:10:00Z }
---

# Modelo

- Nuevo módulo puro `src/game/inventory.ts` (o equivalente) con:
  `ItemInstance { id, itemId }`, tipos de localización (`backpack`, `slot`,
  `ground`, `container`), capacidad, helpers de lectura y las cuatro operaciones
  atómicas. Debe ser reutilizable por REQ-020 sin UI.
- Una instancia está exactamente en un contenedor autoritativo. No mantengas a la
  vez una lista de IDs y una lista de instancias como verdad. Si eliges registro
  central (`GameState.items` con `location`), las unidades referencian instancias
  por ID; si eliges contención (`Unit.inventory.slots`, `Unit.equipment` por
  hueco, suelo/contenedores), mueve la misma instancia y deriva la localización.
- `Unit.inventory` (o equivalente) guarda capacidad y huecos. Capacidad por
  defecto 8, exportada como constante; `createPlayerFromArchetype` y los helpers
  permiten otra capacidad. El equipo puesto no cuenta.
- `Unit.equipment` pasa a ocho huecos con instancia o `null`. Elimina
  `Unit.weapons` y `weaponId/armorId/shieldId` como verdad. `UnitEquipment` puede
  sobrevivir solo como tipo de entrada legacy de helpers, nunca en `Unit`.
- Suelo: las instancias sustituyen a `map.weapons` como verdad. Puedes conservar
  `GeneratedMap.weapons` como dato de generación, pero el estado no debe exponer
  dos representaciones del mismo objeto. Adapta renderer/debug al estado nuevo.
- Contenedores: añade solo lo necesario para probar equipar desde contenedor con
  estado sintético (por ejemplo `GameState.containers`). Sin cofres jugables, sin
  UI, sin generación.
- Enemigos: sus objetos equipados también son instancias. No hace falta mochila
  con contenido, pero el modelo debe ser uniforme y serializable.
- IDs: deterministas y estables (por unidad/hueco o por contador serializable).
  `createInitialState` dos veces debe ser profundamente igual; mover una instancia
  no cambia su ID.

# Stats efectivos

- Un único punto, por ejemplo `effectiveStats(unit)` / `effectiveCombatStats`,
  que sume inherentes + `modifiers` de los objetos equipados + traits (vacíos).
  Incluye en ese punto los aportes de combate del equipo (acierto del arma,
  evasión del escudo y absorción de la armadura) o expón un perfil derivado
  único; evita que `combat.ts`, `magic.ts` y `hud.ts` hagan sus propias sumas.
- Combate, hechizos, IA (a través del resolvedor) y HUD leen ese punto. No cambies
  fórmulas, valores ni RNG.
- Para poder probar modificadores sin tocar el catálogo, expón una función pura
  de agregación que acepte definiciones; añade un test con un objeto sintético
  con `modifiers`.

# Comandos y costes

- Sustituye la semántica de `PickUp`/`SelectWeapon` por operaciones explícitas:
  recoger (suelo → mochila), equipar (mochila/suelo/contenedor → hueco),
  desequipar (hueco → mochila) y soltar (cualquier localización → suelo del tile).
  Nombres y formas son tuyos; documenta el mapeo en el informe.
- Todas cuestan 1 MP y 0 acciones; con 0 MP rechazan. Fase de jugador; el estado
  de alarma no influye. Un rechazo devuelve el estado original y un
  `CommandRejected` con motivo.
- Equipar desde mochila: el hueco que libera el entrante cuenta como libre; si el
  hueco destino está ocupado, el saliente ocupa exactamente ese hueco. Intercambio
  atómico aunque la mochila estuviera llena.
- Equipar desde suelo/contenedor: si el hueco destino está ocupado, el saliente
  necesita un hueco libre real; si no cabe, rechazo entero sin mover nada.
- Recoger: si la mochila está llena, rechazo sin tocar suelo ni mochila. Soltar un
  equipado: lo desequipa y lo deja en la casilla, sin pasar por mochila. Soltar de
  mochila libera hueco. No hay traspaso directo ni apilado.
- Dos manos: equipar un arma de dos manos con escudo puesto mueve el escudo a la
  mochila; si no cabe, rechazo entero. Equipar escudo con arma de dos manos puesta
  se rechaza sin desequipar el arma. Valida ambos lados.
- Categoría/hueco: cada objeto solo entra en su hueco; un anillo; los cinco
  secundarios existen aunque el catálogo aún no tenga piezas.

# Puente de host (mínimo)

- `G` recoge el objeto del tile a la mochila (1 MP), sin auto-equipar.
- `1`-`3` equipan desde los tres primeros huecos de mochila (1 MP); si el hueco
  está vacío, rechazo visible como hasta ahora.
- HUD: arma/escudo/armadura y atributos se leen del equipo efectivo. Mantén
  `data-testid` existentes; no añadas panel.
- Presentación/feedback: adapta `buildPresentationEvents` y los cues de pickup y
  select-weapon al nuevo modelo; no añadas feedback nuevo.
- Debug/snapshot: expón instancias y localización, mochila, huecos y capacidad.
  Puedes conservar campos derivados de compatibilidad para `tsc` de E2E, pero no
  como fuente de verdad ni con la semántica antigua.
- Renderer: dibuja los objetos de suelo desde la fuente nueva; conserva el sprite
  actual por `itemId` (el arte de TASK-0096 llega después).

# Tests exigidos

- Localización única e IDs únicos; ninguna instancia en dos sitios; serialización
  ida y vuelta con instancias, localización, capacidad y mochila.
- Capacidad 8 por defecto y capacidad alternativa; mochila llena.
- Equipar/desequipar desde mochila, con intercambio y con hueco libre.
- Recoger con mochila llena sin cambios; soltar equipado y soltar de mochila.
- Dos manos por ambos lados, con y sin sitio para el escudo.
- Equipar desde suelo y desde contenedor sintético, con hueco libre y ocupado;
  rechazo entero con mochila llena.
- Coste 1 MP y 0 acciones; rechazo con 0 MP; alarma alta no cambia el coste.
- Sin apilado: dos espadas iguales, dos instancias y dos huecos.
- Agregación de stats: modificadores sintéticos, arma/escudo/armadura y consumo
  por combate y HUD.
- Actualiza los tests de REQ-010 y REQ-026 al modelo nuevo: pickup a mochila,
  equipar con coste, sin auto-equipado y sin cambio gratis. No borres tests ni
  relajes aserciones; reescribe la intención donde la regla cambió.
- Adapta `tests/unit/game/helpers.ts` y `tests/e2e/support.ts` con conversión
  desde formas legacy para no tocar tests ajenos. `tsc` compila E2E; si hay
  errores de tipo, actualiza tipos/fixtures mecánicamente. No ejecutes E2E ni
  reescribas sus escenarios: TASK-0098.

# Límites del diff

- Permitido: `src/game/**`, `src/host/**` mínimo, `tests/unit/**`,
  `tests/e2e/support.ts` y specs E2E solo para typecheck, `artifacts/TASK-0094/**`.
- Prohibido: `docs/requirements/**`, `docs/harness/**`, `docs/templates/**`,
  `package.json`, `pnpm-lock.yaml`, `docs/tasks/**`, balance y arte.
- Si necesitas cambiar una regla, un criterio o una decisión de producto, para y
  devuelve `blocked` con evidencia.

# Evidencia

- `report.md` con estado, archivos, SHA, tests, desviaciones y fricción.
- `test-output.txt`, `verify-output.txt`, salidas focalizadas y `logs/`.
- `pnpm run verify` verde y `pnpm exec vitest run` de los archivos tocados.
