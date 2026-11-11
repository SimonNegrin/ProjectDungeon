---
type: Experiment Brief
id: EXP-003-v2
title: "EXP-003 v2: mesa de combate ampliable"
description: Requisitos del simulador que medirá acciones, magia, réplica y escenarios de grupo, con catálogos data-driven para crecer a todo el bestiario sin reescribir el experimento.
status: stable
experiment_status: building
question: ¿Qué valores de acciones, magia y réplica producen combates equilibrados y legibles en los escenarios del primer corte?
related_requirements: [REQ-009, REQ-014, REQ-015, REQ-017, REQ-021, REQ-025, REQ-026, REQ-027]
related_decisions: [ADR-012, ADR-014, ADR-015, ADR-019, ADR-020]
created_at: 2026-11-11T16:10:00Z
updated_at: 2026-11-11T18:40:00Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T16:10:00Z }
verified:
  - by: human:simon
    at: 2026-11-11T18:40:00Z
    note: >-
      Aprueba el cierre de las preguntas: banda 40–60 %, resolvedor aislado con
      equivalencia, pasillo 1D de 8 casillas, IA de alerta/huida/regreso con
      hechizos genéricos, v2.0 solo 1v1 y v2.1 sin estados ni resistencias.
---

# Propósito

La v1 de [EXP-003](../../experiments/EXP-003-mesa-combate/experiment.md) mide un
ataque aislado y un duelo 1v1 con el modelo de `REQ-010`. No puede medir la
economía de acciones de [REQ-026](../requirements/REQ-026-economia-acciones-rebalanceo.md),
la magia de [REQ-025](../requirements/REQ-025-magia-hechizos-mana.md) ni la réplica
de [REQ-027](../requirements/REQ-027-replica-combate-cuerpo-a-cuerpo.md), y su
roster no representa grupos ni habilidades futuras.

La v2 debe ser la **mesa de balance del combate** durante varios cortes: medir los
valores del primer corte y crecer al bestiario completo sin reescribir el motor
del experimento. La pregunta es de balance; la extensibilidad es un requisito no
funcional.

# Pregunta

¿Qué valores de acciones, magia y réplica producen combates equilibrados y
legibles en los escenarios del primer corte?

La banda objetivo es **40–60 % de victorias del héroe** (50 % ±10 %) en todos los
emparejamientos neutros, con **±2 % de tolerancia de simulación** y **héroe con
iniciativa**, como en [REQ-015](../requirements/REQ-015-roster-arquetipos.md). El
Pícaro contra Bruto es el caso de estrés de la banda, no una excepción.

# Decisiones de cierre (2026-11-11)

| Pregunta | Decisión |
|---|---|
| Bandas | 40–60 % para todos los emparejamientos neutros; ±2 % de tolerancia; héroe con iniciativa. |
| Resolvedor | Copia aislada en el experimento con tests de equivalencia y determinismo; no se importa desde `src/`. |
| Espacio | Pasillo abstracto 1D de 8 casillas; mide acercamiento, MP, huida y alcance sin mapa ni línea de visión. |
| IA v2.0 | Perfiles deterministas de alerta, huida/regreso y hechizos genéricos; la muestra usa Centinela, Bruto y Cobarde. |
| Grupos | v2.0 solo 1v1; el 2v2 representativo pasa a v2.1 junto con las posiciones 2D. |
| v2.1 | Solo habilidades del primer corte; estados alterados y resistencias necesitan su propia hoja. |

# Hipótesis

- El Pícaro con 3 acciones será fuerte pero no dominante si paga con PV/defensa o
  si el daño de la daga no escala; el simulador debe decir cuánto.
- Centinela 2 / Bruto 1 / Cobarde 2 cambia la presión enemiga: el Bruto pega más
  por golpe, el Centinela encadena y el Cobarde amenaza o huye. Ninguno debe matar
  a un héroe en un turno desde PV completos.
- La magia debe ser una opción, no la única: el Mago y el Clérigo deben tener rol
  sin que el ataque físico quede obsoleto.
- La réplica premia la precisión y castiga el ataque temerario; no debe crear
  bucles ni dominar el balance.
- Los grupos pequeños no se explican solo con el 1v1: la suma de acciones y la
  concentración de ataques cambian el resultado.

# Alcance

## v2.0 · primer corte

- Duelos 1v1 con acciones, magia y réplica, semilla fija, 1.000 duelos por
  emparejamiento y ±2 %.
- Muestra representativa: Guerrero, Pícaro, Mago y Clérigo contra Centinela,
  Bruto y Cobarde. No todas las combinaciones.
- Catálogo data-driven de héroes, enemigos, hechizos y equipo.
- Escenario configurable: combatientes, equipo, acciones, maná, hechizos y
  condición de victoria.
- Exportación reproducible de escenario, semilla, catálogo y decisión.
- Sin sprites ni arte: el experimento mide números.

## v2.1 · bestiario completo

- Escenarios de grupo (2v2, 3v3 y party vs grupo) con posiciones y terreno.
- Todo el bestiario cuando esté definido, incluido el spritesheet de monstruos
  como referencia de arte, sin que el arte entre en el motor.
- Habilidades y estados (congelar, envenenar, asustar, teletransporte, robo de
  vida, muro) mediante un modelo genérico de efectos.
- Perfiles de IA por tipo.

## Fuera de alcance

- Implementar el juego, el host o el arte final.
- Hotseat, red, guardado y progresión.
- Balance definitivo de todo el contenido: la v2 da líneas base.
- Simular combinaciones exhaustivas de todos los héroes y enemigos.

# Modelo de datos

| Pieza | Debe contener |
|---|---|
| `Combatant` | id, nombre, bando, tipo, nueve atributos, PV, MP, maná, acciones, equipo, hechizos, traits y perfil de IA. |
| `Action` | tipo (atacar, mover, interactuar, hechizo, esperar), coste de acción, MP, maná, alcance, objetivo y efecto. |
| `Effect` | daño, curación, resurrección, estado, movimiento o interacción; parámetros y duración. |
| `Spell` | id, familia, nivel, coste, alcance, acierto, poder y objetivo (`REQ-025`). |
| `Scenario` | equipos, posiciones, terreno, iniciativa y condición de victoria. |
| `Catalog` | roster, bestiario, hechizos, objetos y traits; versión explícita. |
| `AIProfile` | prioridades y pesos deterministas; sin `Math.random`. |
| `Resolver` | puro y determinista; mismas reglas que producción o tests de equivalencia. |

# Requisitos de extensibilidad

- **R-01:** añadir un combatiente, hechizo, objeto o trait es editar datos; no se
  toca el resolvedor.
- **R-02:** el escenario no está limitado a una pareja; el 1v1 es un escenario
  más. La v2.1 añade grupos sin rehacer el motor.
- **R-03:** las habilidades se modelan como efectos con parámetros, no como
  `if` por id de enemigo.
- **R-04:** la IA es un perfil de datos determinista; añadir un tipo no cambia el
  bucle de turnos.
- **R-05:** la UI carga catálogos y escenarios; no hay listas de enemigos
  hardcodeadas.
- **R-06:** el export incluye versión de catálogo, escenario, semilla y métricas.
- **R-07:** el arte y los sprites no son dependencia del experimento.
- **R-08:** si producción implementa las reglas, el experimento comparte el
  resolvedor puro o mantiene tests de equivalencia; no se duplican fórmulas sin
  control.

# Escenarios del primer pase

| Escenario | Por qué |
|---|---|
| Guerrero vs Centinela | Línea base de `REQ-010` con el nuevo contador de acciones. |
| Pícaro vs Bruto | Prueba el Pícaro 3 contra el enemigo de un solo golpe fuerte. |
| Mago vs Cobarde | Prueba el daño mágico, el maná y la huida. |
| Clérigo vs Centinela | Prueba el lanzador de apoyo y el tanque; en 1v1 no hay aliado al que curar. |

La muestra cruza los cuatro héroes con los tres enemigos. La v2.1 amplía a todos
los tipos y a grupos con posiciones 2D; el 2v2 representativo
(Guerrero + Pícaro vs Centinela + Bruto) queda para esa versión.

# Métricas

- Tasa de victoria por bando y emparejamiento.
- Turnos medios y distribución de duración.
- Acciones gastadas por tipo (atacar, mover, hechizo, interactuar).
- Hechizos lanzados, maná gastado y maná desperdiciado.
- Daño causado/recibido, curación y muertes.
- PV restantes del ganador y del perdedor.
- Réplicas disparadas, impactos y muertes por réplica.
- En grupos: supervivientes, concentración de daño y turnos totales.

Si una métrica no cambia la decisión, se elimina.

# Criterios de decisión

- El Pícaro 3 queda dentro de la banda objetivo y no gana todos los
  emparejamientos por un margen amplio.
- Cada tipo enemigo (2/1/2) queda dentro de su banda; ninguno mata a un héroe
  desde PV completos en un turno.
- La magia tiene un rol claro sin desplazar el ataque físico; el maná importa.
- La réplica no crea bucles, no domina y premia la precisión.
- El grupo no está dominado por un solo arquetipo ni por una sola acción.
- Añadir un enemigo de prueba requiere **cero cambios de código**.

# Plan de sesiones

1. **REQ-027:** cerrar las preguntas de la réplica (aviso, estados, tope,
   presentación) para que el simulador tenga la regla completa.
2. **EXP-003 v2.0:** construir el modelo data-driven y los escenarios 1v1; tests
   de determinismo, catálogo y equivalencia.
3. **Medición:** ejecutar 1.000 duelos por emparejamiento, registrar resultados y
   decidir.
4. **Actualización:** ajustar `REQ-015`, `REQ-009` y `REQ-026` con los valores
   aprobados; cerrar EXP-003 v2.0.
5. **v2.1:** cuando el bestiario esté definido, añadir grupos, habilidades y todo
   el catálogo por datos.

# Preguntas abiertas

Ninguna bloquea la v2.0. Las seis preguntas del brief quedaron cerradas el
2026-11-11 en la tabla de decisiones de cierre. La aprobación de los valores de
balance sigue siendo del usuario tras leer `experiment.md`.

# Riesgos

- **Divergencia con producción:** el experimento y el juego usan fórmulas
  distintas. Mitigación: resolvedor compartido o tests de equivalencia.
- **Sobreajuste al 1v1:** los valores pueden funcionar en duelo y romperse en
  grupo. Mitigación: escenarios 2v2 en v2.0 y grupos en v2.1.
- **Scope creep:** querer modelar todo el bestiario antes de tiempo. Mitigación:
  muestra representativa en v2.0; el resto es data entry.
- **Complejidad de la IA:** una IA rica hace el experimento difícil de explicar.
  Mitigación: perfiles deterministas y simples; el arte va aparte.

# Entregables

- Página y API de EXP-003 v2 con escenario, catálogo y métricas.
- Catálogos de roster, bestiario, hechizos y equipo en datos.
- Export JSON reproducible y resultados en `results/`.
- `experiment.md` actualizado con la decisión de v2.0.
- Requisitos y ADR actualizados con los valores aprobados.

Ver [EXP-003 v1](../../experiments/EXP-003-mesa-combate/experiment.md),
[REQ-026](../requirements/REQ-026-economia-acciones-rebalanceo.md),
[REQ-025](../requirements/REQ-025-magia-hechizos-mana.md),
[REQ-027](../requirements/REQ-027-replica-combate-cuerpo-a-cuerpo.md),
[REQ-015](../requirements/REQ-015-roster-arquetipos.md) y
[ADR-020](../decisions/ADR-020-economia-acciones.md).
