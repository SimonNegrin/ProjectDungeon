---
type: Experiment
id: EXP-003
title: "Mesa de combate: números, equipo y tiempo para matar"
description: Simulador configurable de combates con armas, personajes y enemigos para elegir la tabla de REQ-010.
status: stable
experiment_status: decided
question: ¿Qué valores de acierto, daño, escudo, armadura, PV y modificadores producen combates de 2-3 impactos, con roles de arma claros y sin que un enemigo aislado sea letal?
related_requirements: [REQ-010, REQ-009]
seed: 1017
parameters:
  - id: baseAcc
    label: Acierto base del jugador
    type: range
    min: 0
    max: 3
    default: 1
  - id: baseDmg
    label: Daño base del jugador
    type: range
    min: 0
    max: 3
    default: 1
  - id: baseDef
    label: Defensa base del jugador
    type: range
    min: 0
    max: 3
    default: 1
  - id: weaponAcc
    label: Acierto del arma
    type: range
    min: 0
    max: 6
    default: 3
  - id: weaponDmg
    label: Daño del arma
    type: range
    min: 1
    max: 10
    default: 4
  - id: shield
    label: Escudo del defensor
    type: range
    min: 0
    max: 4
    default: 1
  - id: armor
    label: Armadura del defensor
    type: range
    min: 0
    max: 4
    default: 1
  - id: hp
    label: PV del defensor
    type: range
    min: 4
    max: 30
    default: 9
  - id: simulations
    label: Duelos simulados
    type: range
    min: 100
    max: 5000
    default: 1000
decision: A
decided_by: human:simon
decided_at: 2026-11-08T17:18:00.867Z
created_at: 2026-11-08T16:37:43Z
updated_at: 2026-11-08T17:31:45Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T16:37:43Z }
verified:
  - by: human:simon
    at: 2026-11-08T17:18:00.867Z
    note: >-
      Elige la tabla A (jugador +1/+1/+1; centinela +0/+0/+0; bruto +0/+1/+0;
      cobarde +1/+0/+1; armas, escudo, armadura y PV de REQ-010) con semilla
      1017 y 1.000 duelos.
---

# Propósito

Elegir los números de [REQ-010](../../docs/requirements/REQ-010-combate-equipo-acierto-defensa.md)
antes de implementar. La fórmula ya está decidida:

- `impacto = mod. acierto + acierto del arma + 1d6 > mod. defensa + escudo + 1d6`.
- `daño = max(1, (mod. daño + daño del arma + 1d6) − (armadura + 1d6))`.

Este experimento no decide la fórmula ni el modelo de equipo. Decide **los
valores**: acierto, daño, escudo, armadura, PV y modificadores de cada personaje
y enemigo. También sirve como banco de pruebas para armas, personajes y enemigos
futuros sin tocar producción.

# Hipótesis

- La tabla propuesta (jugador +1/+1/+1; centinela +0/+0/+0; bruto +0/+1/+0;
  cobarde +1/+0/+1) deja al centinela en 2-3 impactos con la espada.
- El hacha será la mejor contra armadura y la daga la mejor contra escudos; si
  una domina todos los emparejamientos, la tabla está mal.
- El bruto será el enemigo más peligroso y el cobarde el más escurridizo.
- Sin los +1 de base, el jugador puede quedar demasiado frágil; con demasiados,
  el combate se vuelve trivial.
- La varianza del `1d6 − 1d6` hará que algunos golpes hagan 1 y otros casi maten;
  el objetivo es que se sienta roguelike, no arbitrario.

# Opciones

| Variante | Descripción | Qué se espera |
|---|---|---|
| A · Propuesta | Tabla de `REQ-010`: jugador +1/+1/+1 y los enemigos actuales. | 2-3 impactos al centinela; el bruto aguanta; el cobarde huye. |
| B · Sin base | Todos los modificadores a +0. | El equipo define todo; el jugador es más frágil y menos preciso. |
| C · Tanque | Más PV y armadura, menos daño. | Combates más largos; la huida y la alarma ganan peso. |
| D · Letal | Menos PV, más daño. | 1-2 impactos; el error se paga y el azar pesa más. |
| Personalizada | Roster y valores editables. | Probar armas, personajes y enemigos futuros. |

Además de los presets, la página permite editar el roster:

- Nombre y bando.
- PV, acierto base, daño base y defensa base.
- Arma con acierto y daño; escudo y armadura.
- Añadir, duplicar y eliminar combatientes.

# Cómo usarlo

1. Abrir `/experiments/EXP-003-mesa-combate/`.
2. Elegir un preset A/B/C/D o editar el roster.
3. Elegir atacante y defensor.
4. Comparar el cálculo de un solo ataque (impacto, daño y distribución) y el
   duelo simulado con la misma semilla.
5. Ajustar los sliders y repetir hasta que el ritmo y los roles se sientan bien.
6. Exportar el JSON con el roster, los valores y las notas.
7. Registrar la decisión en este documento y actualizar `REQ-010`.

La semilla y el número de duelos se pueden fijar; dos ejecuciones con la misma
semilla y el mismo roster dan el mismo resultado.

# Métricas

- Probabilidad de impacto y daño mínimo, medio y máximo por golpe.
- Daño esperado por ataque y ataques esperados para matar.
- Tasa de victoria en los duelos simulados.
- Turnos medios y PV medios restantes.
- Distribución de impactos necesarios (histograma).
- Comparación por arma: espada, hacha y daga contra cada enemigo.

# Criterios de decisión

- El centinela cae en 2-3 impactos con la espada.
- Un enemigo aislado no mata al jugador: aguanta al menos 6 ataques.
- El hacha es la mejor contra armadura; la daga, la mejor contra escudos; la
  espada no domina, pero tampoco sobra.
- Ninguna arma gana todos los emparejamientos por un margen amplio.
- Con 3-4 enemigos y la alarma, el jugador está en peligro real.
- El usuario puede explicar la elección en una frase: «esta tabla se siente X».

# Observaciones

Playtest del 2026-11-08 con la semilla 1017 y 1.000 duelos; opción A. El usuario
la siente «un poco fácil» en combates singulares: el jugador gana por amplio
margen aunque pierde PV. La idea de escalar la dificultad en cooperativo (más
enemigos o un multiplicador por jugador sobre las habilidades enemigas) queda
fuera de EXP-003 y de REQ-010; se anota para el corte de cooperativo. Comentario
completo y lectura en
`artifacts/TASK-0025/attempt-1/playtest.md`.

# Decisión

- Opción: **A · Propuesta** (tabla de `REQ-010`).
- Roster y valores: jugador +1/+1/+1, espada +3/4, escudo 1, armadura 1 y 20 PV;
  centinela +0/+0/+0, espada +3/4, escudo 1, armadura 1 y 9 PV; bruto +0/+1/+0,
  hacha +2/6, escudo 0, armadura 2 y 12 PV; cobarde +1/+0/+1, daga +4/3, escudo
  1, armadura 0 y 8 PV.
- Referencia medida: jugador contra centinela con la semilla 1017 y 1.000 duelos:
  30/36 de impacto, 2,63 ataques esperados para matar, 991/9 victorias y 5,65
  turnos medios.
- Motivo: se acepta la tabla de referencia. El duelo 1 contra 1 se siente algo
  fácil, pero la lectura lo atribuye a la ventaja de PV y a que es un combate
  singular; el peligro se espera con varios enemigos y la alarma. El escalado
  cooperativo queda fuera de este corte.
- Fecha: 2026-11-08T17:18:00.867Z.
- Decidido por: `human:simon`.
- Semilla y número de duelos: `1017`, 1.000.

# Evidencia

- [JSON de decisión](results/decision-2026-11-08T17-18-00Z.json).
- [Playtest y comentario de human:simon](../../artifacts/TASK-0025/attempt-1/playtest.md).
- Capturas de A/B/C/D y de la tabla personalizada en
  `artifacts/TASK-0025/attempt-1/screenshots/`.

# Siguientes pasos

- `REQ-010` v4 `stable` con la tabla A; `REQ-009` solo actualiza la probabilidad
  de huida que depende de ella.
- Tareas creadas: `TASK-0026` (motor), `TASK-0027` (equipo y recogida),
  `TASK-0028` (bestiario), `TASK-0029` (HUD y feedback) y `TASK-0030` (E2E y QA
  visual).
- El experimento queda como banco de pruebas; no se importa desde producción.
