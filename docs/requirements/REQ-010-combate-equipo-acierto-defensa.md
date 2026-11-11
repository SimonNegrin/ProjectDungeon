---
type: Requirement Sheet
id: REQ-010
title: "Combate con equipo: acierto, escudo y armadura"
description: Acierto de arma + 1d6 contra escudo + 1d6; daño de arma + 1d6 menos armadura + 1d6; modificadores por habilidad, tres armas melee, equipo y recogida. Balance provisional v1.
status: stable
version: 6
decision_owner: human:simon
review_required: true
created_at: 2026-11-08T16:18:04Z
updated_at: 2026-11-11T16:15:00Z
related_tasks: [TASK-0025, TASK-0026, TASK-0027, TASK-0028, TASK-0029, TASK-0030]
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T16:37:43Z }
verified:
  - by: human:simon
    at: 2026-11-08T17:18:00.867Z
    note: >-
      Acepta la tabla A de EXP-003 (semilla 1017, 1.000 duelos): modificadores
      del jugador y de los enemigos, armas, PV, escudo y armadura. La facilidad
      en duelos 1 contra 1 se asume para este corte.
  - by: human:simon
    at: 2026-11-09T12:00:00Z
    note: >-
      Aprueba la pasada de balance provisional v1: −30 % de PV redondeando hacia
      arriba (Centinela 6, Bruto 8, Cobarde 5), −1 de daño a todas las armas
      (Espada 3, Hacha 5, Daga 2) y Centinela sin armadura. Acepta que el
      Cobarde sea frágil y que estos números se reajusten en la futura
      ampliación de bestiario y armas.
  - by: human:simon
    at: 2026-11-11T16:15:00Z
    note: >-
      Aprueba la aclaración de coherencia con REQ-027: el test de tiradas se acota
      a ataques sin réplica; un fallo con réplica añade las tiradas del defensor
      y el orden es ataque → réplica.
---

# Contexto

El combate actual es fijo: el jugador hace 5 de daño, el enemigo 3, la vida es
20/10 y no hay equipo. No hay forma de que un arma se sienta distinta ni de que
el jugador decida entre pegar fuerte o asegurar el golpe.

Este corte introduce un combate roguelike con equipo y dos capas de azar:

- **Impacto:** `mod. acierto + acierto del arma + 1d6 > mod. defensa + escudo + 1d6`.
  Si empatan, falla.
- **Daño:** `max(1, (mod. daño + daño del arma + 1d6) − (armadura + 1d6))`.
- **Escudo:** evita impactos. No reduce el daño de un golpe que entra.
- **Armadura:** reduce el daño de un golpe que entra. No evita el impacto.
- **Modificadores de personaje:** cada personaje tiene acierto, daño y defensa
  propios. El jugador empieza con +1/+1/+1; los enemigos tienen los suyos. El
  modelo deja espacio a puntería, magia y otras habilidades futuras.
- **Equipo:** arma, armadura y escudo. El jugador empieza con una espada, una
  armadura y un escudo; puede recoger un hacha y una daga.

La hoja queda en **stable**: el modelo está decidido y los valores vigentes son
el **balance provisional v1** de esta v5 (PV 6/8/5, armas 3/5/2 y centinela sin
armadura), que sustituye a la tabla A de `EXP-003` (semilla 1017, 1.000 duelos).
La facilidad observada en duelos 1 contra 1 es esperada para este corte; el
peligro se busca con varios enemigos y la alarma. No incluye críticos, ataques a
distancia, inventario completo, intercambio de objetos ni loot de enemigos. La
huida del perfil cobarde depende de esta hoja; el balance provisional fija su
probabilidad y `REQ-009` conserva el resto de su alcance. Los números se
reajustarán cuando se amplíe el bestiario y el catálogo de armas.

# Objetivos de experiencia

- Leer dos capas: el escudo decide si te dan y la armadura cuánto duele.
- Elegir arma por objetivo: el hacha rompe armadura, la daga supera escudos y la
  espada es el término medio.
- Sentir que el equipo y los modificadores del personaje cambian el combate.
- Decidir si recoger un arma y cuándo cambiar; el equipo es una decisión.
- Aceptar el azar sin sentir que el juego hace trampas: se ve el impacto o el
  fallo y el daño resultante.
- Poder reproducir una partida con la misma semilla y las mismas acciones.

# Requisitos creativos

| ID | Requisito | Aceptación |
|---|---|---|
| R-001 | El impacto se resuelve con `mod. acierto + acierto del arma + 1d6 > mod. defensa + escudo + 1d6`. Si son iguales, falla. | Tests de las 36 combinaciones; con modificadores iguales el impacto es 15/36 (41,7 %); un +1 lo sube a 21/36 (58,3 %). |
| R-002 | El daño se resuelve con `max(1, (mod. daño + daño del arma + 1d6) − (armadura + 1d6))`. El escudo no reduce daño; la armadura no evita impactos. | Un impacto del jugador con espada contra armadura 0 hace 1-10 (media 5,03); contra armadura 2 hace 1-8 (media 3,28). El escudo del objetivo no cambia el daño. |
| R-003 | Hay tres armas melee con acierto y daño propios: espada +3/3, hacha +2/5 y daga +4/2. No hay críticos en este corte. | La tabla es la única fuente de valores; el hacha hace más daño y acierta menos; la daga acierta más y hace menos daño. |
| R-004 | La armadura y el escudo son equipo separado. El escudo suma a la defensa; la armadura resta al daño recibido. El jugador empieza con armadura 1 y escudo 1; no los cambia en este corte. | La defensa del jugador es `+1 + 1 + 1d6`; su armadura es 1 + 1d6 contra daño. Quitar el escudo sube el impacto recibido; quitar la armadura sube el daño recibido. |
| R-005 | El jugador empieza con la espada. En el mapa hay un hacha y una daga, fijas por semilla, en salas distintas, alcanzables y fuera de la sala inicial. | La semilla de referencia coloca las dos armas en salas distintas; ninguna está en la sala de aparición, en una puerta o en un muro; se pueden recoger. |
| R-006 | La recogida es con `G` si el jugador está sobre el arma; cuesta 1 MP, no la acción. El arma se equipa sola. El cambio entre las armas llevadas es gratis con `1`-`3`; hay tres huecos. | `G` recoge, gasta 1 MP y equipa; con 0 MP se rechaza; `1`-`3` cambia sin gastar acción ni MP; no se puede llevar una cuarta. |
| R-007 | Los enemigos usan la misma fórmula y las mismas categorías de equipo. Cada tipo tiene arma, escudo, armadura, vida, modificadores, visión, alarma, MP y perfil. | El centinela, el bruto y el cobarde usan la tabla de bestiario; el bruto es el tanque y el cobarde huye según `REQ-009`. |
| R-008 | Un enemigo básico (centinela) muere en 1-2 impactos con la espada; el hacha es más rápida pero menos fiable y la daga es fiable pero sufre contra armadura. El bruto es el tanque. | Con el balance provisional v1, el centinela cae en ~1,75 ataques de espada, ~1,38 de hacha y ~2,00 de daga; el bruto en ~3,42, ~2,34 y ~4,17. |
| R-009 | El cobarde huye cuando un golpe le quita al menos el 40 % de su vida máxima y sobrevive; si se acorrala, lucha. No desaparece ni se rinde. | Con 5 PV, el umbral es 2 de daño. La probabilidad de huida real (sobreviviendo al golpe) es espada 41,7 %, hacha 25,0 % y daga 44,4 % contra armadura 0; el cobarde a menudo muere antes de poder huir. Acorralado, ataca. |
| R-010 | El feedback distingue impacto y fallo, y muestra el daño resultante. El HUD muestra el arma equipada, el escudo y la armadura; la vida del enemigo bajo el cursor y el resto en `F1`. | Un ataque produce "Fallo" o "−N" sobre el objetivo; el HUD refleja el equipo; en juego normal no se muestran los dados. |
| R-011 | El azar es reproducible: misma semilla y mismas acciones producen las mismas tiradas. | Dos partidas con la misma semilla y los mismos comandos dan los mismos impactos y daños; no se usa `Math.random`. |
| R-012 | La condición de victoria y derrota no cambia: no quedan enemigos vivos o no quedan jugadores vivos. | El combate nuevo no altera `evaluateStatus`; un enemigo huido sigue contando como vivo. |
| R-013 | Cada personaje tiene modificadores propios de acierto, daño y defensa. El jugador empieza con +1/+1/+1; los enemigos tienen los de la tabla. El modelo admite futuras habilidades como puntería o magia sin cambiar las fórmulas. | Cambiar un modificador cambia el combate sin tocar la fórmula; los modificadores son datos serializables; la tabla es la única fuente de valores. |

## Armas aceptadas

| Arma | Acierto | Daño | Perfil |
|---|---:|---:|---|
| Espada | +3 | 3 | Equilibrada; arma inicial del jugador. |
| Hacha | +2 | 5 | Mucho daño; rompe armadura, pero falla más. |
| Daga | +4 | 2 | Muy fiable; supera escudos, pero sufre contra armadura. |

## Curva de impacto

La probabilidad depende de `mod. acierto + acierto del arma − (mod. defensa + escudo)`:

| Diferencia | Impacto |
|---:|---:|
| −3 | 8,3 % |
| −2 | 16,7 % |
| −1 | 27,8 % |
| 0 | 41,7 % |
| +1 | 58,3 % |
| +2 | 72,2 % |
| +3 | 83,3 % |
| +4 | 91,7 % |
| +5 | 97,2 % |

## Modificadores y equipo aceptados

| Unidad | Acierto | Daño | Defensa | Arma | Acierto/Daño | Escudo | Armadura | PV |
|---|---:|---:|---:|---|---:|---:|---:|---:|
| Jugador | +1 | +1 | +1 | Espada | +3/3 | 1 | 1 | 20 |
| Centinela | +0 | +0 | +0 | Espada | +3/3 | 1 | 0 | 6 |
| Bruto | +0 | +1 | +0 | Hacha | +2/5 | 0 | 2 | 8 |
| Cobarde | +1 | +0 | +1 | Daga | +4/2 | 1 | 0 | 5 |

Totales para leer la tabla: el jugador ataca con +4 y hace +4; su defensa es +2
y su armadura 1. El centinela ataca con +3, hace +3, defiende +1 y no lleva
armadura. El bruto ataca con +2, hace +6, defiende +0 y lleva armadura 2. El
cobarde ataca con +5, hace +2, defiende +2 y no lleva armadura.

## Daño esperado por impacto

| Arma | Base de daño | vs armadura 0 | vs armadura 1 | vs armadura 2 | Rango típico |
|---|---:|---:|---:|---:|---|
| Espada (jugador) | 4 | 4,11 | 3,28 | 2,56 | 1-8 contra armadura 1 |
| Hacha (jugador) | 6 | 6,00 | 5,03 | 4,11 | 1-9 contra armadura 2 |
| Daga (jugador) | 3 | 3,28 | 2,56 | 1,97 | 1-6 contra armadura 2 |

La armadura no anula el golpe: un impacto hace siempre al menos 1. El hacha es
la mejor contra armadura; la daga es la peor. El escudo no entra en esta tabla.

## Tiempo para matar del balance provisional v1

Cada celda es `impacto · daño medio por impacto · ataques esperados`:

| Objetivo | PV | Escudo | Armadura | Espada (+4/+4) | Hacha (+3/+6) | Daga (+5/+3) |
|---|---:|---:|---:|---|---|---|
| Centinela | 6 | 1 | 0 | 83,3 % · 4,11 · ~1,75 | 72,2 % · 6,00 · ~1,38 | 91,7 % · 3,28 · ~2,00 |
| Bruto | 8 | 0 | 2 | 91,7 % · 2,56 · ~3,42 | 83,3 % · 4,11 · ~2,34 | 97,2 % · 1,97 · ~4,17 |
| Cobarde | 5 | 1 | 0 | 72,2 % · 4,11 · ~1,68 | 58,3 % · 6,00 · ~1,43 | 83,3 % · 3,28 · ~1,83 |

Los ataques esperados incluyen los fallos; los impactos son los que hacen daño.
Un enemigo aislado no mata al jugador: el bruto es el más peligroso (~9,5 ataques
para quitarle 20 PV), el cobarde ~12,2 y el centinela ~13,4. El peligro aparece
cuando la alarma junta a varios.

## Balance provisional v1

Estos números son una **pasada provisional**, no el balance definitivo. Se
reajustarán con total seguridad y, en particular, cuando llegue el requisito que
amplíe bestiario y armas. Cambiar un valor no exige una versión nueva de las
mecánicas: basta actualizar la tabla de balance y volver a medir.

Decisiones de esta pasada:

- PV: −30 % redondeando hacia arriba → Centinela 6, Bruto 8, Cobarde 5.
- Armas: −1 de daño a todas (Espada 3, Hacha 5, Daga 2), también para el jugador.
- Centinela: sin armadura; conserva el escudo. Su daño recibido no cambia
  respecto a la tabla A porque el −1 de arma y el −1 de armadura se compensan.
- El Cobarde queda muy frágil: a menudo muere antes de huir. Se acepta como
  consecuencia provisional.

### Cómo ajustar el balance

1. Los valores viven en dos catálogos y en ningún otro sitio: `bestiary.ts`
   (PV, visión, alarma, MP, modificadores y equipo por tipo) y `equipment.ts`
   (acierto y daño de armas, armadura y escudo).
2. Tras cambiar un valor, re-ejecutar `EXP-003` con el roster nuevo para leer
   impacto, daño medio y ataques esperados. La huida se mide con la fórmula de
   `combat.ts` (`daño × 5 ≥ PV máximos × 2`) exigiendo que el objetivo sobreviva.
3. Los tests de balance comprueban **propiedades** (rangos de TTK y de huida),
   no números exactos; así un retune no obliga a reescribir tests.
4. No duplicar valores en motor, IA, host ni tests: todos leen del catálogo.

# Requisitos técnicos

| ID | Requisito | Aceptación |
|---|---|---|
| T-001 | El combate vive en un módulo puro de `src/game/` que resuelve el impacto y el daño con dados. Orden de tiradas: ataque, escudo; si impacta, daño y armadura. No conoce DOM, Canvas, red ni relojes. | Tests unitarios importan el módulo sin DOM; un fallo sin réplica consume dos tiradas y un impacto cuatro; un fallo con réplica añade las tiradas del defensor en el orden ataque → réplica; el resultado incluye tiradas, impacto, daño y eventos. |
| T-002 | El estado guarda un RNG sembrado y serializable. La semilla de combate se deriva de la semilla de la partida; `window.__game.snapshot()` lo expone en solo lectura. | Misma semilla y comandos dan la misma secuencia; el snapshot no permite mutar el RNG; no se usa `Math.random`. |
| T-003 | El equipo y los modificadores son datos, no código: catálogo de armas, armaduras y escudos con IDs; el bestiario declara por tipo PV, visión, alarma, MP máximo, modificadores y equipo; cada unidad tiene equipo equipado, inventario de armas y modificadores. El modelo admite futuras habilidades y tipos nuevos. | Cambiar una estadística en el catálogo o en el bestiario cambia el combate sin tocar la fórmula; los IDs son estables; el inventario, los modificadores y el MP máximo son serializables; no hay valores de balance duplicados fuera de los catálogos. |
| T-004 | Las armas del mapa son entidades con posición e ID; `G` recoge la del tile del jugador, gasta 1 MP, la equipa y la elimina del mapa. `1`-`3` cambia de arma sin coste de acción ni MP. | Recoger dos veces la misma arma no duplica; el inventario no pasa de tres; con 0 MP se rechaza; el cambio no consume MP ni acción. |
| T-005 | La IA y los enemigos usan el mismo cálculo y el mismo catálogo. Los enemigos no cambian de arma ni recogen objetos en este corte. | El daño y el impacto de un enemigo salen de su equipo y sus modificadores; la IA no tiene una fórmula paralela. |
| T-006 | El host presenta el arma equipada, el escudo, la armadura y los modificadores en el HUD, dibuja las armas del mapa, muestra la pista de `G`, y produce feedback de impacto/fallo y daño. `F1` muestra las tiradas, el equipo y la vida de todos. | El HUD coincide con el estado; la pista aparece solo sobre un arma; el feedback no tapa el mapa; `F1` muestra los dados. |
| T-007 | La colocación de las dos armas es determinista por semilla y se deriva del mapa: salas distintas, alcanzables, fuera de la sala inicial y sin caer en muros, puertas ni apariciones. | La semilla de referencia cumple las restricciones; otra semilla también; no se usa `Math.random`. |
| T-008 | Tests nuevos: 36 combinaciones de impacto, distribución de daño con mínimo 1, secuencia condicional de tiradas, modificadores de personaje, equipo, recogida y cambio, huida del cobarde, IA, determinismo del RNG, distribución de impacto y no regresión. Los tests de balance comprueban propiedades (rangos) y leen del catálogo, no números exactos frágiles. No se borran ni debilitan tests existentes. | `pnpm run verify` pasa; los tests existentes conservan su intención; la distribución medida queda dentro de ±2 puntos de la teórica; un cambio de valor en el catálogo no obliga a reescribir los tests de propiedades. |
| T-009 | Se actualizan la sección de combate de `docs/design/turn-economy.md`, el glosario y la arquitectura; se registra `ADR-012` para el combate con equipo, modificadores y RNG sembrado. | `pnpm run docs:check` pasa; el ADR existe y está enlazado; no quedan valores fijos contradictorios. |
| T-010 | Sin dependencias nuevas, sin red y sin cambios en el arte final; el motor sigue sin DOM y el host sigue siendo presentación. | `package.json` y `pnpm-lock.yaml` no cambian; no hay imports de `src/host/` en `src/game/`. |

# Requisitos no funcionales

- **Rendimiento:** 3-4 enemigos y hasta cuatro tiradas por ataque; el coste es
  despreciable frente al render. Objetivo de 60 fps. Medir antes y después.
- **Accesibilidad:** el fallo se comunica con texto ("Fallo"), no solo con color
  o animación; el daño se muestra como número. Las tiradas completas quedan en
  `F1`.
- **Compatibilidad:** Chromium de escritorio como objetivo; Firefox y Safari
  recientes como deseables. Sin red ni persistencia.
- **Seguridad:** sin datos personales, sin red y sin nuevas dependencias.
- **Mantenibilidad:** dos fórmulas, un catálogo de equipo, una tabla de
  modificadores y un RNG sembrado; la IA y el jugador comparten el mismo cálculo.

# Dependencias

- [REQ-001](REQ-001-primer-prototipo-local.md) y
  [REQ-002](REQ-002-encuadre-16-9.md): economía de turno, acción de ataque y
  valores provisionales que este corte sustituye.
- [REQ-003](REQ-003-generacion-mapa.md): salas y apariciones para colocar las
  dos armas.
- [REQ-009](REQ-009-percepcion-alarma-huida.md): bestiario, perfiles, visión,
  alarma y umbral de huida; esta hoja fija el combate que usa esa IA.
- [ADR-006](../decisions/ADR-006-arte-placeholder-32rogues.md): sprites
  placeholder para armas y objetos.
- [ADR-007](../decisions/ADR-007-map-generator.md): `MapGenerator` y datos de
  salas.
- [ADR-008](../decisions/ADR-008-presentacion-animada.md): capas de presentación
  sobre un motor atómico.
- **EXP-003:** decidido con la tabla A (semilla 1017, 1.000 duelos); queda como
  banco de pruebas en
  [EXP-003](../../experiments/EXP-003-mesa-combate/experiment.md).
- **ADR-012 (a crear):** combate con equipo, modificadores y RNG sembrado.
- Implementación: [TASK-0026](../tasks/TASK-0026-motor-combate-equipo-modificadores.md)
  (motor), [TASK-0027](../tasks/TASK-0027-equipo-armas-mapa-recogida.md)
  (equipo y recogida), [TASK-0028](../tasks/TASK-0028-bestiario-combate-ataque-enemigo.md)
  (bestiario), [TASK-0029](../tasks/TASK-0029-host-hud-equipo-feedback.md)
  (HUD y feedback) y [TASK-0030](../tasks/TASK-0030-e2e-qa-combate-equipo.md)
  (E2E y QA visual).
- Puntos de integración previstos: `src/game/combat.ts`, `types.ts`,
  `engine.ts`, `turn.ts`, `ai.ts` y `map.ts`; `src/host/hud.ts`,
  `renderer.ts`, `feedback.ts`, `input.ts` y `debug.ts`.

# Fuera de alcance

- Críticos, fallos catastróficos, ventaja/desventaja y tiradas adicionales.
- Ataques a distancia, arcos, magia, habilidades y estados alterados. El modelo
  de modificadores deja espacio, pero no se implementan.
- Inventario completo, equipo equipado/no equipado, intercambio entre jugadores,
  comercio, crafting, durabilidad y peso.
- Loot de enemigos, cofres y objetos consumibles; las armas del mapa son las dos
  fijas de este corte.
- Más piezas de armadura (casco, guantes, botas) y escudos de varias categorías.
- Clases, progresión por niveles y crecimiento de los modificadores; el jugador
  empieza con +1/+1/+1 y no sube en este corte.
- Cambios en la economía de turno del jugador (MP, acción, orden de turnos); el
  MP enemigo por tipo vive en `REQ-009`.
- Generación del mapa más allá de las posiciones de las armas.
- Arte final de armas, armaduras y escudos.
- Hotseat, red, persistencia y guardado.

# Preguntas abiertas

No quedan preguntas abiertas de valores para el balance provisional v1. La tabla
A de `EXP-003` (semilla 1017, 1.000 duelos) queda sustituida por esta pasada; los
números se recalcularon con la misma fórmula y se volverán a ajustar cuando se
amplíe el bestiario y el catálogo de armas. El HUD de enemigos se mantiene: vida
bajo el cursor y el resto en `F1`.

# Decisiones

| Fecha | Decisión | Quién | Estado |
|---|---|---|---|
| 2026-11-08 | Impacto = mod. acierto + acierto del arma + 1d6 contra mod. defensa + escudo + 1d6; impacto si es mayor. | human:simon | aceptada |
| 2026-11-08 | Daño = max(1, (mod. daño + daño del arma + 1d6) − (armadura + 1d6)). | human:simon | aceptada |
| 2026-11-08 | El escudo evita impactos; la armadura reduce daño. | human:simon | aceptada |
| 2026-11-08 | Cada personaje tiene modificadores de acierto, daño y defensa; el modelo admite futuras habilidades. | human:simon | aceptada |
| 2026-11-08 | El jugador empieza con +1/+1/+1; los enemigos tienen los modificadores de la tabla. | human:simon | aceptada (EXP-003 A) |
| 2026-11-08 | Tres armas melee con acierto y daño; sin críticos. | human:simon | aceptada |
| 2026-11-08 | Empates con `>`: el empate falla. | human:simon | aceptada |
| 2026-11-08 | `G` recoge, cuesta 1 MP y equipa; `1`-`3` cambia gratis. | human:simon | aceptada |
| 2026-11-08 | Dos armas fijas por semilla en salas distintas; el jugador empieza con la espada. | human:simon | aceptada |
| 2026-11-08 | El jugador empieza con armadura 1 y escudo 1; no los cambia en este corte. | human:simon | aceptada |
| 2026-11-08 | Umbral de huida del cobarde: golpe ≥40 % de la vida máxima y sobrevivir. | human:simon | aceptada |
| 2026-11-08 | HUD: vida del enemigo bajo el cursor y el resto en `F1`. | human:simon | aceptada |
| 2026-11-08 | Los números se eligen en `EXP-003`, con roster y equipo configurables. | human:simon | aceptada |
| 2026-11-08 | Valores concretos de modificadores, armas, PV y equipo: tabla A de `EXP-003` (semilla 1017, 1.000 duelos). | human:simon | aceptada |
| 2026-11-08 | La tabla A se acepta para el combate singular de este corte; la facilidad en duelos 1 contra 1 es esperada. | human:simon | aceptada |
| 2026-11-08 | La fórmula anterior de daño fijo y defensa única queda sustituida. | deepseek/v4.1-flash | aceptada |
| 2026-11-09 | Pasada de balance provisional v1: −30 % de PV redondeando hacia arriba (Centinela 6, Bruto 8, Cobarde 5). | human:simon | aceptada (provisional) |
| 2026-11-09 | −1 de daño a todas las armas (Espada 3, Hacha 5, Daga 2); afecta también al jugador. | human:simon | aceptada (provisional) |
| 2026-11-09 | Centinela sin armadura; conserva el escudo. | human:simon | aceptada (provisional) |
| 2026-11-09 | El balance es provisional, se reajustará y debe ser barato de cambiar: valores solo en los catálogos y tests por propiedades. | human:simon | aceptada |
| 2026-11-11 | El test de tiradas se acota a ataques sin réplica; la réplica añade sus propias tiradas y el orden es ataque → réplica. | human:simon | aceptada |

# Aceptación de la hoja

- [x] El usuario ha aprobado la fórmula de impacto.
- [x] El usuario ha aprobado la fórmula de daño con armadura enfrentada y
      mínimo 1.
- [x] El usuario ha aprobado el modelo de modificadores por habilidad.
- [x] Los valores +1/+1/+1 del jugador y los modificadores de los enemigos están
      aprobados tras `EXP-003`.
- [x] El usuario ha aprobado los empates con `>`, el escudo como evasión y la
      armadura como reducción.
- [x] El usuario ha aprobado tres armas melee, la recogida con `G` por 1 MP, el
      cambio gratis y dos armas fijas por semilla.
- [x] El usuario ha aprobado armadura y escudo fijos, el umbral de huida del
      40 % y el HUD bajo el cursor con `F1`.
- [x] El usuario ha aprobado ajustar los números con `EXP-003`.
- [x] Los valores de la tabla están aprobados tras `EXP-003`.
- [x] `EXP-003` está construido y el usuario ha decidido.
- [x] El usuario ha aprobado la pasada de balance provisional v1 (PV, armas y
      armadura del centinela).
- [x] El usuario ha aceptado que el cobarde sea frágil y que estos números se
      reajusten en la futura ampliación de bestiario y armas.
- [x] Los requisitos son verificables en su totalidad.
