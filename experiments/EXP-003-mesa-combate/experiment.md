---
type: Experiment
id: EXP-003
title: "Mesa de combate: números, equipo y tiempo para matar"
description: Simulador configurable de combates con armas, personajes y enemigos para elegir la tabla de REQ-010.
status: draft
experiment_status: ready
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
decision:
decided_by:
decided_at:
created_at: 2026-11-08T16:37:43Z
updated_at: 2026-11-08T16:37:43Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T16:37:43Z }
verified:
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

Rellenar después del playtest.

# Decisión

- Opción:
- Roster y valores:
- Motivo:
- Fecha:
- Decidido por:
- Semilla y número de duelos:

# Evidencia

- [ ] JSON de decisión en `results/`.
- [ ] Capturas de A/B/C/D y de la tabla personalizada.
- [ ] Notas del usuario.

# Siguientes pasos

- Actualizar `REQ-010` con los valores elegidos y pasarla a `stable`.
- Crear las tareas de implementación: motor de combate, equipo y recogida, HUD y
  feedback, E2E y QA visual.
- Archivar el experimento o dejarlo como banco de pruebas; no se importa desde
  producción.
