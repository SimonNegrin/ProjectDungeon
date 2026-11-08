---
type: Requirement Sheet
id: REQ-012
title: Aparición en sala protegida y reparto de enemigos
description: Los jugadores aparecen juntos en la sala más protegida, con al menos 6 huecos y sin enemigos ni línea de visión enemiga; BSP conserva 4 enemigos y el generador denso reparte 1 por sala con hasta 1 sala vacía.
status: draft
version: 1
decision_owner: human:simon
review_required: true
created_at: 2026-11-08T23:55:54Z
updated_at: 2026-11-08T23:55:54Z
related_tasks: [TASK-0040]
related_requirements: [REQ-003, REQ-009, REQ-011]
amends: [REQ-003, REQ-009]
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T23:55:54Z }
verified:
  - by: human:simon
    at: 2026-11-08T23:55:54Z
    note: >-
      Aprueba la regla para todos los generadores: grupo en la sala más
      protegida con ≥6 huecos, sin enemigos ni línea de visión inicial; BSP
      conserva 4 enemigos; el generador denso usa 1 por sala con máximo 1
      vacía y reparte su enemigo.
---

# Contexto

Hoy `REQ-003` R-007 exige que el jugador aparezca en una sala con salida y que
el enemigo esté en la sala más lejana por camino, a 12 tiles o más. `REQ-009`
R-010/T-007 exige exactamente 4 enemigos en 4 salas distintas, sin visión
inicial, con una pareja dentro del radio de alarma y un enemigo aislado.

Ese contrato funciona en un mapa BSP de 32×32, pero no encaja con el generador
denso de `REQ-011` (~22×18, 4-6 salas pegadas): no caben 12 tiles de distancia y
la exploración se organiza mejor por salas que por distancia. Además, el juego
futuro tendrá hasta 6 jugadores que deben empezar juntos y seguros.

Este corte sustituye la regla de aparición y el reparto de enemigos. No cambia
el bestiario, la percepción, la alarma ni la IA: solo dónde empiezan las
unidades y cómo se reparten las fichas.

# Objetivos de experiencia

- El grupo empieza junto, en una sala que se lee como refugio: pocos accesos y
  sitio para todos.
- La partida no empieza en combate ni con un enemigo mirando al grupo.
- El resto de la mazmorra se siente habitada: la mayoría de salas tiene al
  menos un enemigo, y de vez en cuando una sala queda en silencio.
- El jugador entiende que las salas cercanas pueden estar ocupadas y que una
  sala vacía no es un error del mapa.
- La regla funciona igual de bien en BSP y en el generador denso.

# Relación con REQ-003 y REQ-009

- Sustituye `REQ-003` R-007 completo: desaparece el enemigo en la sala más
  lejana y la distancia mínima de 12 tiles.
- Sustituye `REQ-009` R-010/T-007 en lo relativo a **exactamente** 4 enemigos,
  salas distintas obligatorias y garantía de pareja de alarma/aislado para el
  generador denso.
- Mantiene el resto de `REQ-009`: visión, línea de visión, alarma, memoria,
  huida determinista y `home`.
- `REQ-011` R-008 depende de esta hoja para la sala de spawn y el reparto.

# Requisitos creativos

| ID | Requisito | Aceptación |
|---|---|---|
| R-001 | La sala de spawn es la **más protegida**: la que tiene menos accesos (puertas más bocas de pasillo ancho). Empates: mayor superficie libre, después el `id` más bajo. Debe tener al menos 6 tiles libres. | Un validador calcula accesos y área libre por sala; la elegida tiene el mínimo de accesos; en empate gana la mayor; tiene ≥6 tiles libres. |
| R-002 | Todos los jugadores aparecen juntos en esa sala, en huecos distintos. Se reservan 6 huecos para los 6 jugadores futuros; el jugador actual usa el primero. | Hay 6 posiciones distintas de suelo, fuera de puertas y armas, dentro de la sala; `party[0]` es la posición del jugador; el motor actual sigue usando un solo jugador. |
| R-003 | La sala de spawn no contiene enemigos. | Ninguna ficha enemiga cae dentro de la máscara de la sala de spawn. |
| R-004 | Ningún enemigo empieza con línea de visión a ningún hueco de spawn. Se elimina la distancia fija de 12 tiles. | Para cada enemigo y cada hueco de spawn, la comprobación de línea de visión de `REQ-009` devuelve `false`; el test cubre muros y puertas abiertas. |
| R-005 | En BSP se mantienen **4 enemigos**: 2 centinelas, 1 bruto y 1 cobarde, en salas distintas, ninguno en la sala de spawn y ninguno con visión inicial. Se conservan la pareja de alarma y el aislado de `REQ-009`. | La semilla de referencia cumple las 4 fichas, 4 salas distintas, sin spawn, sin visión inicial, pareja ≤8 y aislado >8; otra semilla también. |
| R-006 | En el generador denso hay **1 enemigo por sala no-spawn**. El total es 3-5 según el número de salas. Puede quedar como máximo **1 sala vacía**, y solo si hay 4 o más salas no-spawn; el enemigo de esa sala se reparte a otra. Ninguna sala tiene más de 2 enemigos. | Un validador cuenta salas, enemigos y máximos; con 4-6 salas el total es 3-5; hay 0-1 salas vacías; ninguna sala supera 2 enemigos; todas las fichas están en suelo. |
| R-007 | Si hay una sala vacía, se elige de forma determinista entre las hojas (1 acceso), nunca la de spawn. Su enemigo va a la sala ocupada con menos enemigos; empate: la más lejana del spawn, después el `id` más bajo. | El test comprueba que la vacía es hoja, que el enemigo extra está en la sala con menos fichas y que el reparto es estable por semilla. |
| R-008 | Composición del generador denso: centinelas = total − 2, más 1 bruto y 1 cobarde. El cobarde va a la sala ocupada más lejana del spawn; el bruto a la siguiente; los centinelas rellenan el resto. | Con 3 enemigos: 1 centinela, 1 bruto y 1 cobarde; con 4: 2/1/1; con 5: 3/1/1. Las posiciones y tipos son deterministas. |
| R-009 | La separación mínima entre enemigos se mantiene en 2 tiles Chebyshev, también cuando dos comparten sala. | Un test con dos enemigos en la misma sala comprueba la separación; no hay dos fichas en el mismo tile. |
| R-010 | La IA sigue usando `home` como sala asignada: el enemigo vuelve a su sala tras una alerta. No cambian percepción, alarma, memoria ni huida. | Los tests de `REQ-009` siguen pasando; el `home` de cada ficha cae en su sala asignada; dos enemigos en la misma sala pueden compartir alarma. |
| R-011 | Si el mapa no puede cumplir los 6 huecos o la ausencia de línea de visión, el generador no falla: elige la sala con más huecos, relaja primero los 6 y después la línea de visión, y emite un aviso honesto. Nunca coloca unidades en muro, puerta o arma. | Un mapa stub pequeño produce un `GeneratedMap` con `warnings`, al menos 1 hueco válido y sin unidades en tiles inválidos; la partida no lanza. |
| R-012 | La sala de spawn, el número de accesos, los 6 huecos y el reparto de enemigos se exponen en el snapshot y en la capa de debug. | `F1` muestra la sala, sus accesos y los huecos; el snapshot serializa `spawnRoomId`, `party` y las fichas con su sala. |
| R-013 | La regla se aplica a todos los generadores: BSP y el generador denso. No hay una variante “antigua” para BSP. | Los tests de ambos generadores comprueban la misma sala protegida, la ausencia de enemigos y la ausencia de visión inicial. |

# Requisitos técnicos

| ID | Requisito | Aceptación |
|---|---|---|
| T-001 | La selección de spawn y el reparto de enemigos son funciones puras, deterministas y sin DOM. Derivan del mapa y de la semilla, sin relojes ni `Math.random`. | Dos llamadas con la misma semilla y mapa devuelven las mismas posiciones; se ejecutan en Vitest sin jsdom. |
| T-002 | `GeneratedMap.spawns` se amplía con `spawnRoomId` y `party` (6 posiciones). `spawns.player` se conserva como alias de `party[0]`. `spawns.enemy` deja de ser la fuente de verdad. | El modelo es serializable; los tests y el motor que leen `spawns.player` siguen funcionando; la colocación lee `party`/`spawnRoomId`. |
| T-003 | La colocación de BSP conserva las 4 fichas y sus restricciones de alarma, pero excluye la sala de spawn y exige ausencia de línea de visión. | `placeMapEnemies` o su sucesor acepta el mapa nuevo; la semilla de referencia mantiene 4 fichas, 4 salas, pareja ≤8 y aislado >8. |
| T-004 | La colocación del generador denso usa un presupuesto por sala (1 por sala, 0-1 vacía) y permite 2 fichas en una sala con separación ≥2. | Un test con 4-6 salas comprueba el reparto, los tipos y la separación; no se fuerza el cupo de 4. |
| T-005 | La comprobación de “sin línea de visión” reutiliza la función de percepción de `REQ-009` y se evalúa para todos los huecos de spawn antes de aceptar una colocación. Si no hay combinación, se aplica R-011. | Un test con un enemigo detrás de un muro y otro delante del hueco comprueba que solo el segundo invalida la colocación. |
| T-006 | Los umbrales viven en constantes documentadas: mínimo de huecos de spawn (6), máximo de salas vacías (1), máximo de enemigos por sala (2), separación mínima (2) y mínimo de salas para permitir vacía (4). | Las constantes se exportan y los tests las usan; cambiarlas no exige tocar la lógica. |
| T-007 | Hay validadores y tests para ambos generadores con la semilla de referencia y al menos 20 semillas alternativas. | Vitest cubre sala protegida, 6 huecos, sin enemigos, sin visión, reparto y fallback; no se debilitan tests de `REQ-003`/`REQ-009`. |
| T-008 | El host muestra en debug la sala de spawn, sus accesos y los huecos; el HUD no cambia en juego normal. | `F1` alterna la capa; sin `F1` no aparece información nueva; el snapshot incluye los datos. |
| T-009 | No se añaden dependencias y el coste de la colocación no bloquea el arranque. | `package.json` no cambia; la generación de 22×18 con reparto queda por debajo de 50 ms en CI. |
| T-010 | Las sustituciones de `REQ-003` R-007 y `REQ-009` R-010/T-007 se registran en esas hojas y en el glosario. | Las tres hojas enlazan entre sí y no queda una regla contradictoria sin marcar. |
| T-011 | No se borran, saltan ni debilitan tests existentes; las expectativas que cambian se justifican por esta hoja. | El diff de tests solo adapta los casos de spawn afectados; el resto se mantiene. |

# Requisitos no funcionales

- **Rendimiento:** la selección de spawn y el reparto no añaden más de 10 ms a
  la generación de 22×18; el arranque sigue sin tirones.
- **Legibilidad:** la sala de spawn se reconoce sin debug por su silueta y sus
  pocos accesos; el jugador no necesita saber el número exacto de enemigos.
- **Accesibilidad:** el debug no tapa el HUD; la información de spawn no depende
  solo del color.
- **Compatibilidad:** Chromium de escritorio; Firefox y Safari recientes como
  deseables.
- **Seguridad:** sin red, sin persistencia y sin datos personales.
- **Mantenibilidad:** selección de spawn, colocación y percepción separadas;
  constantes documentadas; sin ECS ni motor genérico.

# Dependencias

- `REQ-003` cerrada: mapa BSP, salas, puertas y `spawns` existentes.
- `REQ-009` cerrada: percepción, línea de visión, alarma, `home` y las 4 fichas.
- `REQ-011` aprobada: generador denso, sala de spawn con 6 huecos y puertas
  decorativas.
- `EXP-004` y `TASK-0040`: validan el estilo y muestran el reparto en el
  experimento antes de implementar.
- [ADR-007](../decisions/ADR-007-map-generator.md): interfaz inyectable.

# Fuera de alcance

- Implementar el cooperativo, el hotseat o los 6 jugadores; solo se reservan
  los huecos.
- Cambiar el bestiario, la percepción, la alarma, la memoria o la huida.
- Salas seguras con curación, tiendas, guardado o checkpoints.
- Puertas funcionales que bloqueen la línea de visión.
- Selector de dificultad o presupuesto de enemigos configurable por el jugador.
- Niebla de guerra, minimapa o revelado de enemigos.
- Persistencia y guardado del reparto.

# Preguntas abiertas

1. **Alarma en el generador denso:** no se garantiza una pareja ≤8 ni un
   aislado >8; la alarma se prueba con la geometría de cada mapa. Si el
   playtest echa en falta esa garantía, se añade como criterio.
2. **Sala vacía:** se prefiere una hoja con 1 acceso. Si no hay hojas, la sala
   vacía se elige por semilla entre las que no son de spawn. El experimento
   puede mostrar si una sala vacía en el centro se lee mal.
3. **Umbral de 6 huecos:** es el mínimo para 6 jugadores. Si una sala protegida
   tiene 6 pero muy apretados, el experimento dirá si conviene exigir 8.

# Decisiones

| Fecha | Decisión | Quién | Estado |
|---|---|---|---|
| 2026-11-08 | La regla de spawn se aplica a todos los generadores. | human:simon | aceptada |
| 2026-11-08 | El grupo aparece junto en la sala más protegida, con ≥6 huecos para 6 jugadores. | human:simon | aceptada |
| 2026-11-08 | La sala de spawn no tiene enemigos. | human:simon | aceptada |
| 2026-11-08 | Ningún enemigo empieza con línea de visión al spawn; se elimina la distancia de 12 tiles. | human:simon | aceptada |
| 2026-11-08 | BSP conserva 4 enemigos; el generador denso usa 1 por sala con máximo 1 vacía y reparte su enemigo. | human:simon | aceptada |
| 2026-11-08 | Composición del generador denso: centinelas = total − 2, más 1 bruto y 1 cobarde. | requirements-writer | propuesta |
| 2026-11-08 | La sala vacía se elige entre hojas y el enemigo extra va a la sala con menos fichas. | requirements-writer | propuesta |
| 2026-11-08 | El generador denso no garantiza pareja de alarma ni aislado; BSP sí los conserva. | requirements-writer | propuesta |

# Aceptación de la hoja

- [x] El usuario ha aprobado las decisiones creativas.
- [x] Los requisitos son verificables.
- [x] Está claro el fuera de alcance.
- [x] Las contradicciones con `REQ-003` y `REQ-009` están identificadas y
      sustituidas.
- [x] Las dependencias están claras.
- [x] Hay un experimento (`EXP-004`) que muestra el reparto antes de
      implementarlo.
- [x] La hoja tiene versión y fecha.
