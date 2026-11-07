---
type: Task Report
title: "Informe de ejecución — TASK-0001: motor de rejilla, turnos, combate e IA"
description: Implementación y verificación del motor determinista del primer prototipo local.
task: TASK-0001
attempt: 1
status: stable
created_at: 2026-11-07T15:33:00Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T15:33:00Z }
---

# Resumen

Se ha implementado desde cero el motor determinista de `src/game/` sin UI ni
host. El estado es serializable, los comandos son datos y `reduce(state,
command)` es pura: devuelve un estado nuevo (o el mismo si el comando se
rechaza) más una lista de eventos.

Organización de `src/game/`:

| Módulo | Responsabilidad |
|---|---|
| `types.ts` | Tipos, comandos, eventos, estado y constantes de reglas. |
| `grid.ts` | Sala 32×24, muros de borde, consultas de casilla y ocupación. |
| `movement.ts` | Direcciones, validación de movimiento, corte de esquina y commit. |
| `combat.ts` | Adyacencia, daño por facción y resolución genérica de ataques. |
| `ai.ts` | Selección del jugador más cercano, BFS determinista y plan enemigo. |
| `turn.ts` | Restauración de fases, fase enemiga completa y final de partida. |
| `engine.ts` | Estado inicial, reducción de `Move`/`Attack`/`EndTurn`/`Restart`. |
| `index.ts` | Reexportación pública del motor. |

# Archivos

Creados:

- `src/game/types.ts`
- `src/game/grid.ts`
- `src/game/movement.ts`
- `src/game/combat.ts`
- `src/game/ai.ts`
- `src/game/turn.ts`
- `src/game/engine.ts`
- `src/game/index.ts`
- `tests/unit/game/helpers.ts`
- `tests/unit/game/movement.test.ts`
- `tests/unit/game/combat.test.ts`
- `tests/unit/game/turn.test.ts`
- `tests/unit/game/ai.test.ts`
- `tests/unit/game/engine.test.ts`
- `tests/unit/game/integration.test.ts`
- `tests/unit/game/boundaries.test.ts`
- `artifacts/TASK-0001/attempt-1/test-output.txt`
- `artifacts/TASK-0001/attempt-1/report.md`

Modificado (solo metadatos de frontmatter, sin contenido):

- `artifacts/TASK-0001/attempt-1/brief.md`

# Comandos, timeouts y resultados

| Comando | Timeout | Resultado |
|---|---:|---|
| `pnpm run test` | 120 s | OK — 8 archivos, 49 tests, 0 fallos. Salida en `test-output.txt`. |
| `pnpm run build` | 120 s | OK — `tsc --noEmit` y `vite build`. |
| `pnpm run verify` | 180 s | OK — docs, config, 49 tests y build. |

No se ejecutó `pnpm run test:e2e`: el brief indica que E2E/Playwright no aplica
porque esta tarea no toca UI, Canvas ni host.

# Commit

- Commit de implementación (código, tests y artefactos de ejecución):
  `8ec0d3feffb8753994730c5e6d528b0ba31eab53`.
- Este informe se añade en un commit posterior de artefactos para evitar la
  dependencia circular entre el SHA y el propio contenido del informe.

# Criterios de aceptación → tests

| Criterio | Test(s) |
|---|---|
| `src/game/` con estado serializable, comandos y reducción pura que devuelve eventos. | `engine.test.ts`: «es serializable y puede reducirse tras un round-trip JSON», «reduce es pura y no muta el estado de entrada»; `integration.test.ts`: secuencia completa. |
| Sala 32×24, muros en el borde, suelo transitable; no se ocupan muros ni casillas ocupadas. | `engine.test.ts`: «crea la sala 32x24…», «no coloca entidades sobre muros…»; `movement.test.ts`: «no permite ocupar una casilla…», «no permite entrar en un muro del borde». |
| Movimiento en 8 direcciones, coste 1 MP también en diagonal; jugador 4 MP y enemigo 3. | `movement.test.ts`: «mueve en las 8 direcciones y gasta 1 MP…», «permite cuatro movimientos…»; `engine.test.ts`: «coloca un jugador y un enemigo…». |
| Sin corte de esquina: la diagonal exige libres las dos ortogonales. | `movement.test.ts`: «no corta esquinas…», «permite la diagonal cuando las dos casillas ortogonales están libres». |
| Una acción por turno; ataque solo en adyacencia (incluida diagonal); 5 al enemigo y 3 al jugador. | `combat.test.ts`: «ataca en adyacencia ortogonal…», «ataca en diagonal…», «solo permite una acción por turno», «el enemigo hace 3 al jugador…». |
| Vida inicial 20/10; muerte a 0 con evento. | `engine.test.ts`: «coloca un jugador y un enemigo…»; `combat.test.ts`: «emite muerte y victoria…», «la muerte del jugador ocurre a 0…». |
| `EndTurn` cierra la fase del jugador, ejecuta la fase enemiga completa y restaura MP y acción. | `turn.test.ts`: «EndTurn ejecuta la fase enemiga…», «restaura MP y acción del enemigo…», «ejecuta la fase completa con varios enemigos…»; `integration.test.ts`. |
| IA elige al jugador más cercano; ataca en rango; avanza una casilla con pathfinding; espera si no puede. | `ai.test.ts`: los seis tests. |
| Victoria sin enemigos vivos; derrota sin jugadores vivos; `Restart` vuelve al estado inicial. | `combat.test.ts`: «emite muerte y victoria…», «la muerte del jugador ocurre a 0…», «no declara victoria mientras quede otro enemigo vivo», «no declara derrota mientras quede otro jugador vivo»; `integration.test.ts`: victoria y derrota; `engine.test.ts`: «Restart vuelve siempre al estado inicial». |
| El motor no importa DOM, Canvas, red ni teclado; no usa `Math.random` ni `Date.now`. | `boundaries.test.ts`: «no usa DOM, red, teclado, tiempo real ni aleatoriedad», «solo importa módulos relativos dentro de src/game». |
| Los tests cubren movimiento, diagonal sin corte, ocupación, MP, acción, combate, cambio de fase, IA, victoria, derrota y determinismo. | Conjunto de 8 archivos y 49 tests; la determinismo se comprueba en `integration.test.ts` y `ai.test.ts`. |
| `pnpm run verify` pasa y el informe incluye el commit SHA. | `pnpm run verify` OK; SHA de implementación en la sección «Commit». |

# Desviaciones y decisiones menores

1. **Frontmatter del brief.** `pnpm run verify` falló inicialmente en
   `docs:check` porque `artifacts/TASK-0001/attempt-1/brief.md` tenía
   `status: issued` y no incluía `title` ni `description`. Se corrigió solo el
   frontmatter (título, descripción y `status: stable`). No se modificó ninguna
   parte del objetivo, criterios, restricciones ni alcance.
2. **Orden de direcciones de la IA.** Se fijó un orden determinista con las
   cardinales primero (N, E, S, O) y luego las diagonales. No cambia reglas; solo
   resuelve empates de pathfinding de forma reproducible.
3. **MP enemigo.** El enemigo tiene 3 MP y cada movimiento cuesta 1, pero la IA
   avanza exactamente una casilla por fase según el criterio del brief. Por eso
   tras moverse conserva 2 MP. No se auto-termina el turno ni se gastan pasos
   adicionales.
4. **Fase enemiga síncrona.** `EndTurn` ejecuta toda la fase enemiga dentro de
   la misma reducción. No se expone un estado intermedio de fase enemiga; los
   eventos permiten reconstruirla. Es coherente con el brief.
5. **Commit del informe.** El informe se versiona en un commit posterior al de
   implementación porque un archivo no puede contener el SHA del commit que lo
   incluye. El SHA de implementación es el indicado arriba.

# Confirmación de alcance

- No se ha tocado `src/host/`, `src/ui/`, `experiments/`, `assets/`, Vite,
  Playwright ni `package.json`.
- No se han añadido dependencias.
- No se han borrado, saltado ni debilitado tests existentes.
- No se ha cambiado el estado de la tarea en `docs/`; eso queda para
  `task-lead`.
- El motor no usa DOM, Canvas, red, teclado, `Math.random` ni `Date.now`.

# Preguntas abiertas

Ninguna bloqueante. La única decisión de interpretación es que la IA mueve una
casilla por fase aunque el enemigo tenga 3 MP, tal como pide el criterio de
aceptación.
