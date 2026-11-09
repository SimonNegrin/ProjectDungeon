---
type: ADR
title: "ADR-012: combate con equipo, modificadores y RNG sembrado"
description: Dos tiradas (impacto y daño), equipo y modificadores como datos, resolvedor compartido y azar reproducible por semilla.
status: stable
decision_status: accepted
decided_by: [human:simon]
decided_at: 2026-11-08T17:18:00.867Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T19:40:00Z }
---

# Contexto

El primer prototipo usaba daño fijo: 5 el jugador y 3 el enemigo, con 20/10 PV.
Ese modelo no permitía que un arma se sintiera distinta ni que el jugador
eligiera entre asegurar el golpe o pegar fuerte. `REQ-010` y la mesa
[EXP-003](../../experiments/EXP-003-mesa-combate/experiment.md) (semilla 1017,
1.000 duelos) fijan el modelo y los valores de la tabla A.

# Decisión

- **Dos capas de azar**: el escudo decide si el ataque impacta; la armadura
  reduce el daño del impacto. El empate en el impacto falla.
  - Impacto: `mod. acierto + acierto del arma + 1d6 > mod. defensa + escudo + 1d6`.
  - Daño: `max(1, (mod. daño + daño del arma + 1d6) − (armadura + 1d6))`.
- **Equipo como datos**: espada +3/4, hacha +2/6 y daga +4/3; escudo y armadura
  son equipo separado. El jugador empieza con espada, armadura 1, escudo 1 y 20
  PV.
- **Modificadores por personaje**: acierto, daño y defensa son datos
  serializables. El jugador empieza con +1/+1/+1; los enemigos usan la tabla del
  bestiario.
- **Resolvedor compartido**: jugador y enemigos usan el mismo cálculo y el mismo
  catálogo. La IA no tiene una fórmula paralela ni daño fijo.
- **RNG sembrado y serializable**: misma semilla y comandos producen la misma
  secuencia. El estado guarda semilla y contador; no se usa `Math.random`.
- **Equipo en el mapa**: el hacha y la daga son entidades deterministas por
  semilla; `G` recoge por 1 MP sin gastar acción y `1`-`3` cambia de arma gratis,
  con tres huecos.
- **Presentación separada**: el host lee estado y eventos (`AttackPerformed` con
  impacto, daño, PV y tiradas). No recalcula fórmulas ni duplica valores.

Ver [REQ-010](../requirements/REQ-010-combate-equipo-acierto-defensa.md) y la
economía de turno en [turn-economy](../design/turn-economy.md#combate).

> **Nota 2026-11-09:** los valores concretos cambian en
> [REQ-010 v5](../requirements/REQ-010-combate-equipo-acierto-defensa.md):
> espada +3/3, hacha +2/5, daga +4/2, PV de enemigos 6/8/5 y centinela sin
> armadura. El modelo, las fórmulas y el RNG de este ADR no cambian; el balance
> es provisional y se reajustará.

# Consecuencias

- El combate es determinista y testeable con semillas y tiradas fijas.
- Ajustar el balance es cambiar datos del catálogo o del bestiario, no fórmulas.
- La presentación puede animar sin convertirse en fuente de verdad; la
  animación sigue viviendo en el host ([ADR-008](ADR-008-presentacion-animada.md)).
- Los duelos 1 contra 1 son fáciles por diseño; el peligro llega con varios
  enemigos y la alarma de `REQ-009`.
- Quedan fuera de este corte críticos, ataques a distancia, magia, inventario
  completo, loot y durabilidad.

# Alternativas descartadas

- **Mantener daño fijo**: no expresa la diferencia entre armas ni el valor del
  equipo.
- **Una sola tirada para impacto y daño**: mezcla dos decisiones y hace opaco el
  feedback.
- **Escudo que reduce daño o armadura que evita impactos**: impide leer las dos
  capas y elegir arma por objetivo.
- **`Math.random`**: rompe la reproducibilidad y los tests deterministas.
