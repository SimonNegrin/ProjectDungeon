---
type: Experiment
id: EXP-003
title: "Mesa de combate: acciones, magia y réplica (v2.0)"
description: Simulador data-driven de duelos 1v1 con catálogos, acciones, magia/maná y réplica; mide 1.000 duelos por emparejamiento y deja el balance pendiente de aprobación.
status: stable
experiment_status: ready
question: ¿Qué valores de acciones, magia y réplica producen combates equilibrados y legibles en los escenarios del primer corte?
related_requirements: [REQ-009, REQ-010, REQ-014, REQ-015, REQ-017, REQ-021, REQ-025, REQ-026, REQ-027]
related_decisions: [ADR-012, ADR-014, ADR-015, ADR-019, ADR-020]
seed: 1017
engine_version: v2.0
catalog_version: EXP-003-v2.0.0
parameters:
  - id: seed
    label: Semilla
    type: range
    min: 0
    max: 4294967295
    default: 1017
  - id: duels
    label: Duelos por emparejamiento
    type: range
    min: 10
    max: 5000
    step: 10
    default: 1000
previous_decision:
  option: A
  decided_by: human:simon
  decided_at: 2026-11-08T17:18:00.867Z
  note: >-
    Tabla A de REQ-010, histórica; el balance v1 se sustituyó por la pasada
    provisional del 2026-11-09.
created_at: 2026-11-08T16:37:43Z
updated_at: 2026-11-11T19:30:00Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T16:37:43Z }
verified:
  - by: human:simon
    at: 2026-11-08T17:18:00.867Z
    note: >-
      v1: elige la tabla A (jugador +1/+1/+1; centinela +0/+0/+0; bruto
      +0/+1/+0; cobarde +1/+0/+1) con semilla 1017 y 1.000 duelos.
  - by: task-lead
    at: 2026-11-11T16:20:00Z
    note: >-
      v2.0: motor data-driven, 62 tests v2 y 903 tests de verify, resultados
      byte a byte estables y página/E2E 4/4. El balance no está aprobado: los
      12 emparejamientos quedan fuera de la banda 40–60 % por arriba.
---

# Propósito

La v2.0 es la **mesa de balance del combate** para el primer corte. Mide, con
catálogos data-driven y semilla fija, el efecto de las acciones por turno de
[REQ-026](../../docs/requirements/REQ-026-economia-acciones-rebalanceo.md), la
magia y el maná de
[REQ-025](../../docs/requirements/REQ-025-magia-hechizos-mana.md) y la réplica de
[REQ-027](../../docs/requirements/REQ-027-replica-combate-cuerpo-a-cuerpo.md)
sobre los escenarios 1v1 del primer pase.

La v1 midió un ataque aislado y un duelo con la fórmula de
[REQ-010](../../docs/requirements/REQ-010-combate-equipo-acierto-defensa.md). Su
decisión queda como historial al final. La v2.0 no reescribe esa historia: añade
el motor nuevo, mide los valores provisionales y deja la aprobación del balance
en manos del usuario.

# Pregunta

¿Qué valores de acciones, magia y réplica producen combates equilibrados y
legibles en los escenarios del primer corte?

La banda de aceptación es **40–60 % de victorias del héroe** (50 % ±10), con
**±2 pp de tolerancia de simulación** y **héroe con iniciativa**. La comparación
actual usa 38–62 para no confundir el error de muestreo con el objetivo; aun así
los 12 emparejamientos quedan fuera.

# Hipótesis

- El Pícaro con 3 acciones será fuerte pero no dominante si paga con PV/defensa o
  si el daño de la daga no escala.
- Centinela 2 / Bruto 1 / Cobarde 2 cambia la presión enemiga; ninguno debe matar
  a un héroe en un turno desde PV completos.
- La magia debe ser una opción, no la única; el Mago y el Clérigo deben tener rol
  sin que el ataque físico quede obsoleto.
- La réplica premia la precisión y castiga el ataque temerario; no debe crear
  bucles ni dominar el balance.
- Los grupos pequeños no se explican solo con el 1v1; la v2.1 los añade.

# Alcance v2.0

- Duelos 1v1 con acciones, magia y réplica, semilla fija, 1.000 duelos por
  emparejamiento y ±2 pp.
- Muestra de 12 emparejamientos: Guerrero, Pícaro, Mago y Clérigo contra
  Centinela, Bruto y Cobarde.
- Catálogo data-driven de héroes, enemigos, armas, hechizos y perfiles de IA.
- Escenario de pasillo abstracto 1D de 8 casillas: héroe en 0, enemigo en 7,
  héroe con iniciativa. Moverse cuesta 1 MP por casilla; atacar y lanzar un
  hechizo cuestan 1 acción.
- Sin grupos, posiciones 2D, terreno, línea de visión ni arte. Eso es v2.1.

# Cómo usarlo

1. `pnpm run dev` y abre
   `http://127.0.0.1:5173/experiments/EXP-003-mesa-combate/`.
2. Ajusta semilla y duelos por emparejamiento; por defecto 1017 y 1.000.
3. Lee la tabla de 12 emparejamientos y selecciona uno para ver acciones,
   hechizos, maná, daño, PV restantes y distribución de duración.
4. Descarga o copia el JSON. La página no decide: exporta catálogo, escenario,
   semilla y métricas.
5. Para una ejecución determinista: `?test=1&seed=1017`.
6. Reproducción por CLI:
   `pnpm exec vitest run experiments/EXP-003-mesa-combate/src/v2`.

La API de test `window.__experiment` expone `getSeed`, `setSeed`, `getDuels`,
`setDuels`, `runAll`, `getResults`, `snapshot`, `getDecision` y `reset`.

# Modelo y reglas

- **Físico:** `habilidad + acierto del arma + 1d6 > defensa + escudo + 1d6`; el
  empate falla. Daño:
  `max(1, fuerza + daño del arma + 1d6 − (resistencia + armadura + 1d6))`.
- **Mágico:** `nivel de magia + acierto del hechizo + 1d6 > defensa + escudo +
  1d6`; daño:
  `max(1, poder del hechizo + 1d6 − (resistencia + armadura + 1d6))`. Un ataque
  mágico no genera réplica.
- **Acciones:** 2 por defecto, Pícaro 3, enemigos Centinela 2 / Bruto 1 /
  Cobarde 2. Atacar y lanzar hechizo cuestan 1 acción; moverse cuesta MP. Las
  acciones y el maná se restauran al inicio del turno. Tope de 2 hechizos por
  turno.
- **Maná:** máximo `nivel de magia × 4`; se recarga completo al inicio del turno.
- **Réplica:** solo tras un ataque cuerpo a cuerpo fallido, con arma equipada y
  adyacencia. Es gratuita, inmediata, sin cadena y sin tope; usa tiradas nuevas.
  El dormido no es atacable en melé y no replica; el que regresa sí replica; el
  que huye solo replica acorralado. Una réplica letal descarta las acciones
  restantes del atacante.
- **Hechizos del catálogo:** Eléctrico I, Fuego II, Eléctrico III, Fuego IV,
  Curación III y Resurrección IV, con los valores provisionales de REQ-025. La
  curación y la resurrección no se usan en 1v1; sus validaciones están cubiertas
  por tests.

# Resultados v2.0

Semilla **1017**, **1.000 duelos** por emparejamiento, catálogo
`EXP-003-v2.0.0`, héroe con iniciativa. JSON reproducible:
[`results/v2-seed-1017-duels-1000.json`](results/v2-seed-1017-duels-1000.json).
Una segunda ejecución produce el mismo archivo byte a byte.

## Victoria y duración

W-D-L = victorias del héroe, tablas y victorias del enemigo. Δ pp se mide contra
el borde superior de la banda (60 %). TTK es el tiempo hasta la primera muerte,
en rondas (una ronda = turno del héroe + turno del enemigo). «Turnos» son
activaciones individuales.

| Héroe | Enemigo | W-D-L | Win % | Banda | Δ pp | TTK rondas | Turnos μ | Rondas μ/med |
|---|---|---:|---:|---|---:|---:|---:|---:|
| Guerrero | Centinela | 1000-0-0 | 100,0 | fuera | +40,0 | 1,22 | 1,61 | 1,22/1 |
| Guerrero | Bruto | 996-0-4 | 99,6 | fuera | +39,6 | 1,88 | 2,99 | 1,88/2 |
| Guerrero | Cobarde | 1000-0-0 | 100,0 | fuera | +40,0 | 1,38 | 1,85 | 1,38/1 |
| Pícaro | Centinela | 997-0-3 | 99,7 | fuera | +39,7 | 1,18 | 1,44 | 1,18/1 |
| Pícaro | Bruto | 963-0-37 | 96,3 | fuera | +36,3 | 1,93 | 3,04 | 1,93/2 |
| Pícaro | Cobarde | 997-0-3 | 99,7 | fuera | +39,7 | 1,16 | 1,34 | 1,16/1 |
| Mago | Centinela | 998-0-2 | 99,8 | fuera | +39,8 | 1,03 | 1,06 | 1,03/1 |
| Mago | Bruto | 999-0-1 | 99,9 | fuera | +39,9 | 1,15 | 1,31 | 1,15/1 |
| Mago | Cobarde | 1000-0-0 | 100,0 | fuera | +40,0 | 1,04 | 1,09 | 1,04/1 |
| Clérigo | Centinela | 1000-0-0 | 100,0 | fuera | +40,0 | 1,27 | 1,53 | 1,27/1 |
| Clérigo | Bruto | 1000-0-0 | 100,0 | fuera | +40,0 | 2,13 | 3,27 | 2,13/2 |
| Clérigo | Cobarde | 1000-0-0 | 100,0 | fuera | +40,0 | 1,23 | 1,45 | 1,23/1 |

**Los 12 emparejamientos quedan fuera de la banda por arriba**, entre 96,3 % y
100 %. El TTK es de **1,03–2,13 rondas**: la mayoría de duelos termina antes de
que el enemigo pueda actuar dos veces. El ganador conserva de media 10,2–18,8 PV;
el perdedor llega a 0.

## Acciones, maná, daño y réplicas

Valores **por duelo**; H/E = héroe/enemigo. «Mov» son pasos, no acciones: cada
paso cuesta 1 MP. «Maná H» es gastado/no gastado por duelo. «Répl» es
disparadas/impactos/muertes. «Huida» cuenta los disparos del Cobarde en 1.000
duelos.

| Héroe | Enemigo | Atq H/E | Hech H/E | Mov H/E | Maná H (gast/no) | Daño H/E | Répl H (dis/imp/mu) | Répl E (dis/imp/mu) | Huida |
|---|---|---:|---:|---:|---:|---:|---|---|---:|
| Guerrero | Centinela | 2,06/0,68 | 0,00/0,00 | 6,00/0,00 | 0,00/0,00 | 6,00/1,16 | 0,28/0,24/0,17 | 0,35/0,20/0,00 | 0 |
| Guerrero | Bruto | 3,40/1,12 | 0,00/0,00 | 6,00/0,00 | 0,00/0,00 | 7,98/2,16 | 0,69/0,63/0,24 | 0,31/0,11/0,00 | 0 |
| Guerrero | Cobarde | 2,27/0,89 | 0,00/0,00 | 6,00/0,00 | 0,00/0,00 | 5,00/1,97 | 0,16/0,12/0,08 | 0,63/0,52/0,00 | 492 |
| Pícaro | Centinela | 2,71/0,48 | 0,00/0,00 | 6,00/0,00 | 0,00/0,00 | 5,99/1,15 | 0,12/0,12/0,08 | 0,00/0,00/0,00 | 0 |
| Pícaro | Bruto | 4,95/1,11 | 0,00/0,00 | 6,00/0,00 | 0,00/0,00 | 7,94/3,86 | 0,47/0,47/0,14 | 0,00/0,00/0,00 | 0 |
| Pícaro | Cobarde | 2,53/0,36 | 0,00/0,00 | 6,00/0,00 | 0,00/0,00 | 5,00/1,02 | 0,03/0,03/0,02 | 0,07/0,06/0,00 | 601 |
| Mago | Centinela | 0,00/0,06 | 1,24/0,00 | 3,00/0,09 | 9,95/6,48 | 6,00/0,17 | 0,00/0,00/0,00 | 0,00/0,00/0,00 | 0 |
| Mago | Bruto | 0,00/0,15 | 1,94/0,00 | 3,00/0,46 | 15,53/2,94 | 8,00/0,65 | 0,00/0,00/0,00 | 0,00/0,00/0,00 | 0 |
| Mago | Cobarde | 0,00/0,05 | 1,29/0,00 | 3,00/0,07 | 10,35/6,34 | 5,00/0,09 | 0,00/0,00/0,00 | 0,00/0,00/0,00 | 91 |
| Clérigo | Centinela | 0,00/0,53 | 2,10/0,00 | 3,00/0,71 | 11,88/3,33 | 6,00/0,25 | 0,00/0,00/0,00 | 0,00/0,00/0,00 | 0 |
| Clérigo | Bruto | 0,00/1,14 | 3,77/0,00 | 3,00/2,50 | 19,07/6,55 | 8,00/0,63 | 0,00/0,00/0,00 | 0,00/0,00/0,00 | 0 |
| Clérigo | Cobarde | 0,00/0,13 | 1,92/0,00 | 3,00/0,17 | 11,29/3,42 | 5,00/0,12 | 0,00/0,00/0,00 | 0,00/0,00/0,00 | 486 |

Lectura rápida:

- **Réplicas:** 3.114 disparadas en 12.000 duelos, 2.497 impactos (80,2 %) y 739
  muertes (737 del héroe, 2 del enemigo). El héroe replica 1.761 veces y el
  enemigo 1.353. La regla funciona, pero el TTK tan corto hace que solo se vea una
  parte del efecto.
- **Magia:** 4.479 lanzamientos de Fuego IV, 5.553 de Eléctrico III y 2.230 de
  Fuego II. El Mago y el Clérigo no tienen arma en el catálogo, así que su única
  opción es la magia; la comparación «magia vs físico» no está en esta muestra.
- **Maná:** el Mago gasta 9,95–15,53 por duelo y deja 2,94–6,48 sin gastar; el
  Clérigo gasta 11,29–19,07 y deja 3,33–6,55. El maná importa, pero el combate
  termina antes de agotarlo.
- **Huida:** el Cobarde huye en 492/601/486 de 1.000 duelos según el héroe, pero
  casi nunca cambia el resultado. Con 5 PV y umbral del 40 % muere antes de huir
  o huye sin llegar a revertir el duelo.
- **Un turno letal:** no se observó una muerte desde PV completos en un turno en
  la muestra. Queda un riesgo teórico: el Centinela tiene 2 acciones y puede
  hacer dos impactos máximos de 8 contra el Mago (12 PV) si llega a actuar; la
  muestra no lo captura porque el Mago suele matarlo antes. La pasada de retune
  debe medirlo de forma explícita.

## Hechizos lanzados

| Héroe | Enemigo | Hechizo | Lanzados | Impactos | Daño total |
|---|---|---|---:|---:|---:|
| Mago | Centinela | Fuego IV | 1.244 | 1.150 | 5.995 |
| Mago | Bruto | Fuego IV | 1.941 | 1.873 | 7.999 |
| Mago | Cobarde | Fuego IV | 1.294 | 1.091 | 5.000 |
| Clérigo | Centinela | Eléctrico III | 1.739 | 1.691 | 5.463 |
| Clérigo | Centinela | Fuego II | 361 | 264 | 537 |
| Clérigo | Bruto | Eléctrico III | 2.000 | 2.000 | 4.814 |
| Clérigo | Bruto | Fuego II | 1.768 | 1.457 | 3.186 |
| Clérigo | Cobarde | Eléctrico III | 1.814 | 1.660 | 4.813 |
| Clérigo | Cobarde | Fuego II | 101 | 58 | 187 |

El Clérigo usa Eléctrico III como opción principal y Fuego II como alternativa;
el Mago usa Fuego IV. No se probó la variante de hechizos distintos en el mismo
turno ni un lanzador híbrido con arma.

# Criterios de decisión

| Criterio | Resultado v2.0 | Estado |
|---|---|---|
| El Pícaro 3 queda dentro de la banda y no gana todo por margen amplio. | 96,3–99,7 %; gana 11/12 con margen amplio. | **no** |
| Cada enemigo (2/1/2) queda dentro de su banda. | 96,3–100 %; los tres por encima. | **no** |
| Ningún enemigo mata a un héroe desde PV completos en un turno. | No observado; riesgo teórico Centinela vs Mago. | **pendiente de medir** |
| La magia tiene rol sin desplazar el ataque físico. | Mago/Clérigo solo usan magia; no hay híbrido en la muestra. | **no evaluable** |
| La réplica no crea bucles, no domina y premia la precisión. | Sin bucles; 739 muertes por réplica; efecto subestimado por TTK. | **parcial** |
| El grupo no está dominado por un arquetipo o una acción. | Fuera de alcance v2.0. | **no aplica** |
| Añadir un enemigo de prueba requiere cero cambios de código. | Test de catálogo con enemigo de prueba. | **sí** |

# Recomendación (propuesta, no aprobada)

**No aprobar todavía los valores provisionales de REQ-025/REQ-026/REQ-027.** La
v2.0 demuestra que el catálogo actual no cumple la banda 40–60 %: los 12
emparejamientos están 36–40 pp por encima y el TTK es de 1–2 rondas. Antes de
fijar valores, ejecutar una pasada **v2.0b** con el mismo motor y 2–3 tablas
candidatas. Estas son las palancas que propongo medir, en orden:

1. **Alargar el combate:** subir PV enemigos (×2 o +50 %) y/o defensa/escudo. El
   héroe debe necesitar 3–5 rondas, no 1–2, para que las acciones y la réplica
   se vean.
2. **Subir la presión enemiga:** +1/+2 de daño o +1 acción al Bruto. El héroe no
   debería terminar con 10–19 PV en todos los duelos.
3. **Pícaro:** mantener 3 acciones y medir su coste con la daga +4/2. Si sigue
   dominando, probar +1 escudo enemigo o bajar el acierto/daño de la daga.
4. **Magia:** Fuego IV repetido y Eléctrico III con acierto 36/36 son los
   sospechosos. Probar subir coste, bajar poder o subir defensa/resistencia
   enemiga. Añadir un híbrido (Guerrero mágico o bastón) para comparar magia y
   físico; hoy el Mago y el Clérigo no tienen arma.
5. **Réplica:** no tocar la regla todavía. Con 1–2 rondas solo se ve una parte;
   medir de nuevo con TTK de 3–5 rondas. Si domina, la penalización de −1 de
   REQ-027 R-011 es la válvula prevista.
6. **Banda:** fijar la semántica de ±2 pp como error de simulación, no como
   ampliación de la banda. La comprobación actual acepta 38–62 y aun así los 12
   quedan fuera.

Criterio de parada propuesto para v2.0b: los 12 emparejamientos dentro de
40–60 % (o 38–62 si se acepta la tolerancia), TTK de 3–5 rondas, ningún enemigo
mata a un héroe desde PV completos en un turno y la réplica no causa más del
25 % de las muertes. Son propuestas de medición; el usuario decide los valores.

# Historial v1 (2026-11-08)

La v1 midió un ataque aislado y un duelo alterno con la fórmula de REQ-010. Su
decisión fue la **opción A**:

| Unidad | Arma | PV | Acierto/Daño | Escudo | Armadura |
|---|---|---:|---:|---:|---:|
| Jugador | Espada | 20 | +3/4 | 1 | 1 |
| Centinela | Espada | 9 | +3/4 | 1 | 1 |
| Bruto | Hacha | 12 | +2/6 | 0 | 2 |
| Cobarde | Daga | 8 | +4/3 | 1 | 0 |

Referencia medida: jugador contra centinela con semilla 1017 y 1.000 duelos:
30/36 de impacto, 2,63 ataques esperados para matar, 991/9 victorias y 5,65
turnos medios. El usuario la sintió «un poco fácil» en combates singulares; la
facilidad se asumió para este corte y el escalado cooperativo quedó fuera.

La re-ejecución del 2026-11-09 para el **balance provisional v1** de REQ-010
recalculó el roster: jugador 20 PV con espada +3/3; centinela 6 PV con espada
+3/3, escudo 1 y sin armadura; bruto 8 PV con hacha +2/5 y armadura 2; cobarde
5 PV con daga +4/2 y escudo 1. La tabla de ataques esperados y la huida real
quedaron en la versión anterior de este documento y en
[REQ-010](../../docs/requirements/REQ-010-combate-equipo-acierto-defensa.md).

Evidencia v1: [JSON de decisión](results/decision-2026-11-08T17-18-00Z.json) y
[playtest de human:simon](../../artifacts/TASK-0025/attempt-1/playtest.md).

# Evidencia v2.0

- [JSON de resultados](results/v2-seed-1017-duels-1000.json) con catálogo,
  escenario, semilla y métricas.
- [Informe de TASK-0063](../../artifacts/TASK-0063/attempt-1/report.md) y
  [detalle metodológico](../../artifacts/TASK-0063/attempt-1/report-detalle.md).
- [Informe de TASK-0064](../../artifacts/TASK-0064/attempt-1/report.md) con la
  página, la API, el export y las capturas.
- Tests: 62 tests v2 y 903 tests de `pnpm run verify`; E2E de la página 4/4.
- Reproducción: `pnpm exec vitest run experiments/EXP-003-mesa-combate/src/v2`.

# Siguientes pasos

1. El usuario lee esta mesa y decide: aprobar la dirección de retune o pedir una
   tabla candidata concreta.
2. Si acepta, se ejecuta **v2.0b** con 2–3 tablas candidatas y el mismo motor.
3. Solo después se actualizan los valores de REQ-015, REQ-025, REQ-026 y REQ-027.
4. La v2.1 añade grupos 2v2, posiciones 2D y el bestiario completo; los estados
   alterados y las resistencias necesitan su propia hoja.
