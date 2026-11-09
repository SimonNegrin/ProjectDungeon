---
type: ADR
title: "ADR-014: balance provisional y fuente única de datos"
description: Los valores de combate y bestiario viven en catálogos y se reajustan sin tocar lógica; MP y alarma salen del bestiario.
status: stable
decision_status: accepted
decided_by: [human:simon]
decided_at: 2026-11-09T12:00:00Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T12:00:00Z }
---

# Contexto

El desarrollo está en una fase temprana y los valores de enemigos y armas se van
a reajustar con frecuencia. Además, está previsto un requisito que amplíe de
forma notable el bestiario y el catálogo de armas. Si los números se duplican en
motor, IA, host o tests, cada ajuste se vuelve caro y frágil.

Este ADR fija cómo se guardan y se cambian los valores de balance; no cambia las
fórmulas de combate de [ADR-012](ADR-012-combate-equipo-rng.md) ni las reglas de
percepción de `REQ-009`.

# Decisión

- **Fuente única**: todo valor de balance vive en un catálogo.
  - `bestiary.ts`: PV, visión, alarma, MP máximo, modificadores y equipo por tipo.
  - `equipment.ts`: acierto y daño de armas, armadura y escudo.
- **MP por tipo**: `EnemyDefinition` declara `maxMp` y `createEnemy` lo lee. No
  hay una constante global de MP enemigo como fuente de verdad.
- **Alarma derivada**: el radio de alarma se lee del bestiario; la colocación no
  mantiene una copia propia (`ALARM_RADIUS` se deriva de la tabla).
- **Tests por propiedades**: los tests de balance comprueban rangos y relaciones
  (por ejemplo, «el centinela cae en 1-2 impactos con espada»), leen del catálogo
  y no fijan números exactos frágiles.
- **Aditivo**: añadir un enemigo o un arma es añadir datos; la IA, las fórmulas y
  el host no cambian.
- **Balance provisional**: cambiar un número no exige una versión nueva de las
  mecánicas; basta actualizar la tabla, re-ejecutar `EXP-003` y ajustar los tests
  de propiedades.

# Consecuencias

- Reajustar el balance es barato y seguro.
- Los tests que hoy fijan PV, alarma, MP o daño exactos deben migrar a
  propiedades o leer del catálogo.
- La ampliación futura de bestiario y armas es aditiva y no rompe la IA.
- La alarma y el MP dejan de tener dos fuentes de verdad.

# Alternativas descartadas

- **Valores hardcodeados en motor, IA, host o tests**: obliga a tocar varios
  sitios por cada ajuste y genera contradicciones.
- **Separar estadísticas de arma por facción**: rompe el catálogo único de
  [ADR-012](ADR-012-combate-equipo-rng.md) y duplica datos.
- **Tests de balance con números exactos**: convierten cada retune en una
  reescritura de tests.
- **Mantener `ENEMY_MAX_MP` global**: impide que el centinela y el cobarde tengan
  su propio MP sin casos especiales.
