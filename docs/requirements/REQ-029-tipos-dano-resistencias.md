---
type: Requirement Sheet
id: REQ-029
title: "Tipos de daño, paquetes y resistencias por bandas"
description: "Cinco tipos de daño (filo, contundente, punzante, mágico y eléctrico), ataques con paquetes separados, fuerza solo física, armadura solo física y resistencia por bandas con multiplicador."
status: stable
version: 1
decision_owner: human:simon
review_required: true
created_at: 2026-11-12T12:00:00Z
updated_at: 2026-11-13T16:37:46Z
related_tasks: [TASK-0085, TASK-0086, TASK-0087, TASK-0088, TASK-0089, TASK-0090, TASK-0091, TASK-0092]
related_requirements: [REQ-009, REQ-010, REQ-014, REQ-015, REQ-017, REQ-023, REQ-025, REQ-026, REQ-027]
related_decisions: [ADR-023]
generated: { by: deepseek/v4.1-flash, at: 2026-11-12T12:00:00Z }
verified:
  - by: human:simon
    at: 2026-11-13T10:00:00Z
    note: >-
      Aprueba el texto de la hoja: cinco tipos, paquetes separados, fuerza y
      armadura solo físicas, bandas con multiplicador después de la absorción y
      ajuste fino aplazado a roster y bestiario completos. Las tareas se crean en
      una sesión aparte.
---

> **Cierre (2026-11-13).** Implementada y verificada en TASK-0085 a TASK-0092:
> paquetes tipados, perfiles de banda, armas nuevas, desglose de eventos, HUD y
> QA visual. El playtest de legibilidad fue confirmado por el usuario. Los
> perfiles y las armas v1 quedan como valores estimados; el ajuste fino se
> aplaza a roster y bestiario completos.

# Contexto

El combate actual reduce todo el daño a un número único. La resistencia es un
valor plano que se suma a la armadura y el arma solo aporta acierto y daño. Con
nueve arquetipos y un bestiario que aspira a usar las 64 entradas de
`monsters.png`, ese esquema no basta para que cada héroe y cada enemigo tengan una
personalidad legible: un gólem, un zombi y un bruto se distinguen por PV y
armadura, no por aquello a lo que temen.

Esta hoja define el modelo de **tipos de daño y resistencias** y el primer corte
de contenido. No define el bestiario completo, los estados alterados ni el
rebalanceo definitivo.

# Objetivos de experiencia

- Que el jugador lea por qué un arma funciona mejor contra un enemigo concreto.
- Que elegir arma y combinar héroes sea una decisión táctica, no solo numérica.
- Que cada arquetipo y cada familia de enemigo tenga una debilidad reconocible.
- Que el combate siga siendo rápido y legible: pocos dados, un desglose claro y
  ninguna inmunidad absoluta.
- Que añadir un tipo, un arma o un enemigo sea añadir datos, no rehacer el motor.
- Que el balance se pueda medir con el método de win % de `REQ-015` y `EXP-003`.

# Relación con documentos vigentes

- [REQ-010](REQ-010-combate-equipo-acierto-defensa.md): se conserva la tirada de
  impacto y el escudo; se sustituyen la fórmula de daño, el catálogo de armas y
  las tablas de balance. La tirada de impacto no cambia.
- [REQ-014](REQ-014-atributos-inherentes-personajes.md): la resistencia numérica
  única pasa a ser un **perfil de cinco bandas**. Los nueve atributos se
  mantienen; cambia el tipo del atributo, no la lista de nueve.
- [REQ-015](REQ-015-roster-arquetipos.md): se añaden perfiles de resistencia por
  arquetipo. La tabla de stats y el equipo inicial se mantienen, salvo que la
  columna de resistencia pasa a perfil.
- [REQ-025](REQ-025-magia-hechizos-mana.md): los hechizos usan el mismo resolvedor
  de paquetes. Los hechizos eléctricos causan daño eléctrico; los de fuego causan
  daño mágico hasta que exista el trait de quemadura. El nivel de magia solo
  afecta a acceso, maná e impacto; no decide el tipo ni la resistencia.
- [REQ-017](REQ-017-feedback-visual-eventos.md): el ataque muestra el total y el
  desglose por paquete; cada paquete es un beat si el ataque lo requiere.
- [REQ-023](REQ-023-hud-derecho-detalle-cursor.md): el detalle del cursor muestra
  las bandas del enemigo solo con línea de visión.
- [REQ-009](REQ-009-percepcion-alarma-huida.md): el bestiario gana perfiles de
  resistencia; la IA, la visión y la huida no cambian.
- Se registra [ADR-023](../decisions/ADR-023-tipos-dano-paquetes-bandas.md). El
  ajuste fino de los perfiles se aplaza a la definición completa de roster y
  bestiario; `EXP-005` queda cancelado por el momento.

# Requisitos creativos

| ID | Requisito | Aceptación |
|---|---|---|
| R-001 | Hay **cinco tipos de daño**: filo, contundente, punzante, mágico y eléctrico. | El estado, los catálogos y el HUD usan esos cinco; no existe «fuego» ni «hielo» como tipo de daño. |
| R-002 | **Mágico y eléctrico son para cualquiera**: no dependen de maná ni de nivel de magia. Una espada puede llevar filo +3 y eléctrico +1; usarla no exige ser lanzador. | Un héroe sin magia puede atacar con un arma que tenga paquete mágico o eléctrico; el nivel de magia no cambia el daño ni la resistencia. |
| R-003 | Un ataque es una lista de **paquetes de daño**. Cada paquete tiene tipo y cantidad. Un arma puede ser puramente física, puramente elemental o combinar un paquete físico con uno elemental. | La espada electrizada declara filo 3 + eléctrico 1; el ataque resuelve ambos paquetes. |
| R-004 | En el primer corte, un arma puede llevar **como máximo un paquete físico y uno elemental**. No hay dos paquetes físicos ni dos elementales en la misma arma. | El catálogo rechaza o no declara armas con dos físicos o dos elementales; el modelo queda preparado para ampliarlo. |
| R-005 | **La fuerza suma solo al paquete físico.** Los paquetes mágico y eléctrico no escalan con fuerza. | Subir fuerza aumenta el paquete físico y deja igual el elemental. |
| R-006 | **La armadura solo reduce los paquetes físicos** (filo, contundente y punzante). Mágico y eléctrico ignoran la armadura. El escudo sigue sumando a la defensa contra todos los ataques. | Cambiar la armadura no altera el daño mágico/eléctrico; cambiar el escudo altera el impacto de cualquier tipo. |
| R-007 | Cada unidad tiene un **perfil de resistencia** con una banda por tipo: vulnerable, normal, resistente o muy resistente. Sustituye a la resistencia numérica única. | El perfil es serializable; dos unidades con el mismo perfil reciben el mismo tratamiento; no queda una resistencia plana paralela. |
| R-008 | Las bandas se aplican **después de la absorción** y con **multiplicador**: vulnerable ×1,5; normal ×1; resistente ×0,5; muy resistente ×0,25. El redondeo es hacia abajo y el total del ataque tiene mínimo 1. | Un golpe de 5 contra un resistente hace 2; contra un muy resistente hace 1; contra un vulnerable hace 7. |
| R-009 | **No hay inmunidades absolutas.** Un impacto siempre hace al menos 1 de daño total, aunque todos los paquetes queden a 0. «Muy resistente» es raro y no equivale a inmune. | Un gólem muy resistente a filo recibe 1 con un impacto de filo; no existe un estado «inmune». |
| R-010 | El jugador puede **leer las bandas** del enemigo bajo el cursor cuando hay línea de visión, y el feedback del ataque muestra el total y el desglose por tipo. | El detalle del cursor muestra las cinco bandas con texto/icono; el ataque produce «−N» y el desglose «filo X + eléctrico Y»; no depende solo del color. |
| R-011 | **Fuego y hielo no son tipos de daño.** Quedan como traits de estado futuros (quemar/congelar), combinables con armas y objetos. | El catálogo de tipos no los incluye; ninguna arma de este corte declara fuego o hielo. |
| R-012 | El primer corte incluye **al menos un arma contundente** y **al menos una fuente de daño mágico y una eléctrica** para que los cinco tipos se puedan probar en juego. | El martillo, la espada electrizada y la daga arcana existen como datos; al menos una de las nuevas armas entra en el mapa de forma determinista. |
| R-013 | Los 64 sprites del bestiario se agrupan por **familias** con perfiles reutilizables; no se ajustan 64 tablas únicas. | Humanoide, constructo, no muerto, bestia, elemental y dragón tienen plantilla; un enemigo concreto puede sobrescribir su banda. |
| R-014 | El primer corte no rebalancea todo el juego: fija el modelo y una tabla estimada v1 que sirve para probar. | La hoja marca los perfiles y las armas nuevas como estimados; el ajuste fino se aplaza a la definición completa de roster y bestiario. |

# Fórmulas

La tirada de impacto no cambia:

```text
habilidad + acierto del arma + 1d6 > defensa + escudo + 1d6
```

Para cada paquete, con dados independientes:

```text
si es físico:
  bruto = cantidad + fuerza + 1d6 − (armadura + 1d6)
si es mágico o eléctrico:
  bruto = cantidad + 1d6 − 1d6
bruto = max(0, bruto)
daño_paquete = max(0, floor(bruto × multiplicador_banda))
total = max(1, suma de daños de paquete)
```

- La armadura solo entra en los paquetes físicos.
- La fuerza solo entra en el paquete físico.
- El `1d6` del defensor existe en todos los paquetes; en los elementales representa
  la resistencia y no la armadura.
- Un paquete nunca resta daño a otro: se recorta a 0 antes de sumar.
- El mínimo 1 es global, no por paquete.

## Ejemplo

Espada electrizada (filo 3 + eléctrico 1), atacante con fuerza +1, objetivo con
armadura 1, banda normal a filo y resistente a eléctrico. Tiradas: filo 4, armadura
2; eléctrico 3, resistencia 5.

```text
filo:       max(0, 3 + 1 + 4 − (1 + 2)) = 5;  5 × 1   = 5
eléctrico:  max(0, 1 + 3 − 5)           = 0;  0 × 0,5 = 0
total:      max(1, 5 + 0)               = 5
```

# Tabla de bandas

| Banda | Multiplicador | Uso |
|---|---:|---|
| Vulnerable | ×1,5 | Debilidad clara; el enemigo recibe más de ese tipo. |
| Normal | ×1 | Valor por defecto. |
| Resistente | ×0,5 | Reduce a la mitad el daño del paquete. |
| Muy resistente | ×0,25 | Resistencia extrema y rara; nunca inmunidad. |

# Contenido estimado v1

## Armas

| Arma | Acierto | Paquetes | Notas |
|---|---:|---|---|
| Espada | +3 | filo 3 | Actual; arma inicial del Guerrero. |
| Hacha | +2 | filo 5 | Actual; mucho daño, menos acierto. |
| Daga | +4 | punzante 2 | Actual; fiable, sufre contra armadura. |
| Cuchillo | +4 | punzante 1 | Actual; arma inicial del Cocinero. |
| Martillo | +2 | contundente 4 | Nueva, a una mano; valor estimado para probar contundente. La maza a dos manos de `REQ-019` es otra pieza. |
| Espada electrizada | +3 | filo 3 + eléctrico 1 | Nueva; ejemplo del usuario, para cualquier héroe. |
| Daga arcana | +4 | punzante 2 + mágico 1 | Nueva; segunda fuente elemental. |

Los valores de acierto y cantidad son estimados para probar; el ajuste fino se
hará con roster y bestiario completos. El martillo, la espada electrizada y la
daga arcana no cambian el equipo inicial de `REQ-015`: entran como armas del mapa
o botín. Al menos una de las nuevas debe estar colocada de forma determinista en
el mapa del primer corte.

## Perfiles de héroe

`V` = vulnerable, `N` = normal, `R` = resistente.

| Arquetipo | Filo | Contundente | Punzante | Mágico | Eléctrico |
|---|---|---|---|---|---|
| Guerrero | N | N | N | N | N |
| Bárbaro | R | R | N | V | V |
| Pícaro | N | V | R | N | N |
| Arquero | N | V | N | N | N |
| Mago | V | V | V | R | R |
| Clérigo | N | N | N | R | R |
| Guerrero mágico | N | N | N | R | N |
| Cocinero | N | N | N | N | N |
| Agricultor | N | R | N | V | V |

## Perfiles de enemigo actuales

| Enemigo | Filo | Contundente | Punzante | Mágico | Eléctrico |
|---|---|---|---|---|---|
| Centinela | N | N | N | N | N |
| Bruto | N | R | N | V | V |
| Cobarde | N | V | N | N | N |

## Plantillas de familia para el bestiario futuro

| Familia | Filo | Contundente | Punzante | Mágico | Eléctrico | Ejemplos |
|---|---|---|---|---|---|---|
| Humanoide | N | N | N | N | N | orco, goblin, centinela |
| Constructo | R | V | R | N | N | gólem de piedra |
| No muerto | V | R | R | V | N | zombi, esqueleto |
| Bestia | N | N | N | V | N | lobo, araña |
| Elemental | N | N | N | R | R | elemental |
| Dragón | R | N | V | R | R | dragón |

Las plantillas son puntos de partida; un enemigo concreto puede sobrescribir una
banda. La asignación de las 64 entradas a familias es una hoja posterior.

# Requisitos técnicos

| ID | Requisito | Aceptación |
|---|---|---|
| T-001 | El modelo de datos declara `DamageType` (filo, contundente, punzante, mágico, eléctrico), `ResistanceBand` (vulnerable, normal, resistente, muy resistente), `ResistanceProfile` y `DamagePacket { type, amount }`. Los IDs internos son estables y las etiquetas viven en el catálogo o en la UI. | El snapshot expone tipos, bandas y perfiles; cambiar una etiqueta no cambia reglas; no hay strings de tipo dispersos por el motor. |
| T-002 | El catálogo de armas declara `damagePackets` en lugar de un `damage` único. La validación del catálogo impide más de un paquete físico, más de un paquete elemental o más de dos paquetes en este corte. | La espada electrizada declara dos paquetes; un arma con dos físicos o dos elementales se rechaza en construcción o test. |
| T-003 | El perfil de resistencia vive en los stats de la unidad (roster y bestiario) y sustituye al campo numérico `resistencia`. El valor por defecto es normal en los cinco tipos. | Cambiar una banda en el catálogo cambia el combate sin tocar el resolvedor; no queda una resistencia plana usada por el daño. |
| T-004 | Hay un único resolvedor puro de paquetes, compartido por ataques de arma y hechizos. Resuelve una tirada de daño y una de resistencia por paquete, aplica armadura solo a físicos, fuerza solo al físico, banda después de la absorción, `floor` y mínimo 1 global. | Los tests comparan arma y hechizo con el mismo cálculo; no hay una fórmula paralela en `magic.ts` ni en la IA. |
| T-005 | El orden de tiradas es determinista: impacto, escudo y, si impacta, para cada paquete en orden fijo, daño y resistencia. El RNG sembrado se consume en ese orden. | Misma semilla y comandos producen la misma secuencia y el mismo desglose; un fallo no consume tiradas de paquete. |
| T-006 | Los hechizos declaran su tipo o paquete de daño. Los eléctricos causan eléctrico; los de fuego causan mágico hasta que exista el trait de quemadura; curación y resurrección no declaran paquete. El nivel de magia solo entra en acceso, maná e impacto. | Un hechizo eléctrico aplica la banda eléctrica; uno de fuego aplica la banda mágica; curar no aplica resistencia; el nivel de magia no cambia el tipo. |
| T-007 | `AttackPerformed`, `ReplicaPerformed` y `SpellCast` exponen el desglose por paquete: tipo, cantidad base, dados de daño y resistencia, bruto, banda, multiplicador y daño final. El campo de daño total se conserva. | El host no recalcula; `F1` y el snapshot permiten explicar cada paquete; los tests leen el desglose. |
| T-008 | El HUD del cursor muestra las cinco bandas del enemigo con línea de visión; `F1` muestra el perfil completo. El feedback de ataque muestra el total y el desglose por tipo. | Sin línea de visión no se muestran bandas; con línea de visión se leen las cinco; el texto no depende solo del color. |
| T-009 | Tests nuevos: cada banda, armadura solo física, fuerza solo física, paquete físico y elemental, recorte a 0, mínimo 1 global, máximo de paquetes, hechizos eléctrico/mágico, curación sin paquete, determinismo y no regresión de `REQ-010`, `REQ-014`, `REQ-025` y `REQ-027`. Los balances comprueban propiedades y leen del catálogo. | `pnpm run verify` pasa; los tests existentes conservan su intención; cambiar una banda o una cantidad no obliga a reescribir fórmulas de test. |
| T-010 | Se actualizan `docs/design/turn-economy.md`, `docs/design/architecture.md`, el glosario y las notas de vigencia de `REQ-010`, `REQ-014`, `REQ-015` y `REQ-025`; se registra `ADR-023`. | `pnpm run docs:check` pasa; no queda la fórmula de daño único como vigente; el enlace al ADR funciona. |
| T-011 | Sin dependencias nuevas, sin red y sin arte final; el motor sigue sin DOM y el host sigue siendo presentación. | `package.json` y `pnpm-lock.yaml` no cambian; `src/game/` no importa `src/host/`. |
| T-012 | El coste de un ataque con dos paquetes se mide; el objetivo de 60 fps no se degrada y el número de dados por ataque queda acotado por el máximo de paquetes. | La medición queda en el informe de la tarea; un ataque de dos paquetes no añade más de dos tiradas de daño y dos de resistencia. |

# Requisitos no funcionales

- **Rendimiento:** dos paquetes como máximo en este corte; el coste adicional es
  despreciable frente al render. Medir antes y después.
- **Accesibilidad:** las bandas se comunican con texto e icono, no solo con color;
  el desglose del daño es legible y el total sigue siendo el número principal.
- **Compatibilidad:** Chromium de escritorio; sin red ni persistencia.
- **Seguridad:** sin datos personales ni dependencias nuevas.
- **Mantenibilidad:** un resolvedor de paquetes, catálogos como fuente única y
  perfiles reutilizables por familia; añadir un enemigo no duplica fórmulas.
- **Balance:** los perfiles y las cantidades son estimados v1 para probar; el
  ajuste fino usará el método de win % de `REQ-015` cuando roster y bestiario
  estén completos.

# Fuera de alcance

- Fuego y hielo como tipos de daño; quemar, congelar y cualquier estado alterado.
- Inmunidades absolutas o daño nulo.
- Más de un paquete físico o más de un paquete elemental por arma; más de dos
  paquetes por ataque.
- Armas a distancia, arcos, ballestas y proyectiles físicos.
- Rasgos (traits) que añadan, quiten o conviertan paquetes; se definirán después
  de `REQ-019`.
- El bestiario completo de 64 entradas y la asignación definitiva de familias.
- Rebalancear todas las armas, héroes y enemigos; este corte fija el modelo y una
  tabla estimada.
- Cambiar la tirada de impacto, el escudo o la economía de acciones.
- Que la armadura proteja de mágico o eléctrico.
- Arte final de iconos de tipo o de bandas.

# Ajuste futuro (no normativo)

Con nueve arquetipos y 64 entradas de bestiario, el ajuste fino no se hará por
parejas. Cuando roster y bestiario estén cerrados se diseñará un mecanismo
iterable que asigne a cada arquetipo y familia **«frente a quién es fuerte»** y
**«frente a quién es vulnerable»**, y que permita reajustar sin rehacer tablas.
Este corte solo deja valores estimados para probar; el mecanismo se define en el
futuro.

# Preguntas abiertas

1. **Perfiles y cantidades.** La tabla v1 es una estimación para probar; el ajuste
   fino se hará cuando roster y bestiario estén completos. No bloquea el modelo.
2. **Armas nuevas.** Los valores del martillo, la espada electrizada y la daga
   arcana son estimados; la colocación exacta en el mapa se decide en la tarea.
3. **HUD.** Resuelta: el playtest del 2026-11-13 considera legible mostrar las
   cinco bandas con línea de visión. La alternativa de mostrar solo las distintas
   de normal queda descartada para este corte.
4. **Hechizos de fuego.** Se propone que causen daño mágico hasta que exista el
   trait de quemadura; confirmar al implementar el trait.
5. **Familias del bestiario.** La asignación de las 64 entradas a familias queda
   para una hoja posterior.
6. **Roster.** La hoja usa los nueve arquetipos de `REQ-015`; el usuario habló de
   seis personajes actuales. Si el alcance real es seis, confirmar cuáles y
   corregir el roster antes de generar tareas de contenido.
7. **Ajuste fino masivo.** El mecanismo iterable de fortalezas y debilidades por
   arquetipo y familia se diseñará cuando roster y bestiario estén cerrados; no
   bloquea este corte.

# Decisiones

| Fecha | Decisión | Quién | Estado |
|---|---|---|---|
| 2026-11-12 | Cinco tipos de daño: filo, contundente, punzante, mágico y eléctrico. | human:simon | aceptada |
| 2026-11-12 | Fuego y hielo no son tipos; serán traits de estado futuros. | human:simon | aceptada |
| 2026-11-12 | Bandas vulnerable ×1,5, normal ×1, resistente ×0,5 y muy resistente ×0,25; después de la absorción, floor y mínimo 1 global. | human:simon | aceptada |
| 2026-11-12 | La resistencia numérica única se sustituye por un perfil de cinco bandas. | human:simon | aceptada |
| 2026-11-12 | La armadura solo reduce los paquetes físicos; el escudo sigue evitando impactos de todos los tipos. | human:simon | aceptada |
| 2026-11-12 | Un ataque puede llevar paquetes separados; cada paquete tira daño y resistencia. | human:simon | aceptada |
| 2026-11-12 | La fuerza suma solo al paquete físico. | human:simon | aceptada |
| 2026-11-12 | Mágico y eléctrico son para cualquiera, independientes del maná y del nivel de magia. | human:simon | aceptada |
| 2026-11-12 | Primer corte de contenido: martillo, espada electrizada y daga arcana; perfiles v1 para héroes y enemigos actuales. | human:simon | aceptada; valores estimados |
| 2026-11-12 | Usar los valores estimados v1 para probar; el ajuste fino se aplaza a roster y bestiario completos, con un mecanismo iterable de fortalezas y debilidades. | human:simon | aceptada |
| 2026-11-12 | Cancelar `EXP-005` por el momento: no se construye un ajuste para pocos personajes antes del ajuste final. | human:simon | aceptada |
| 2026-11-13 | El playtest confirma el HUD con las cinco bandas y línea de visión; no se limita a las bandas distintas de normal. | human:simon | aceptada |

# Aceptación de la hoja

- [x] El usuario ha aprobado las decisiones creativas.
- [x] El usuario ha revisado el texto de la hoja.
- [x] Los requisitos son verificables.
- [x] Las dependencias están claras.
- [x] Se puede generar un grafo de tareas; las tareas se crean en una sesión aparte.
