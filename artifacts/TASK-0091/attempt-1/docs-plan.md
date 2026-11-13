---
type: Docs Plan
title: "TASK-0091: plan de actualización documental"
description: Texto exacto para turn-economy, architecture y glosario, notas de vigencia de REQ-010/014/015/025 y auditoría de ADR-023 contra el código de REQ-029.
task: TASK-0091
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T17:10:00Z }
---

# Alcance y método

- Base: rama `task/TASK-0091`, commit `cbf0cbc`.
- Fuente de verdad: `src/game/**` implementado en TASK-0085 a TASK-0090. Cada
  valor de este plan cita archivo y línea.
- No se edita `docs/**`, `src/**` ni `tests/**`. El lead aplica diseño y glosario;
  requirements-writer aplica las notas de requisito.
- Aviso de validación: `pnpm run docs:check` valida también los enlaces de este
  artefacto. Para que el plan sea copiable y el validador pase, los textos usan
  enlaces de referencia (`[texto][label]`) con definiciones relativas al archivo
  destino. Son enlaces Markdown válidos al aplicarse; los destinos están en la
  tabla de cada archivo. La cita del texto actual normaliza igual los enlaces y lo
  advierte.
- Criterio de lectura: «vigente» significa que el código lo usa; «historia» que
  solo se conserva como referencia y así está marcado.

# Discrepancias código ↔ documento

| ID | Ubicación actual | Qué dice el documento | Qué hace el código | Acción |
|---|---|---|---|---|
| D1 | `docs/design/turn-economy.md:19` | «La magia de REQ-025 sigue como referencia hasta que se implemente.» | `magic.ts` y `spells.ts` están implementados (TASK-0081 a TASK-0083). | Cambio 1a |
| D2 | `turn-economy.md:170` | «ocho atributos inherentes» y enumera sin acciones. | `UnitStats` tiene siete campos y PV/MP viven en `Unit`; acciones es el noveno (`types.ts:76-87`, `types.ts:109-115`). | Cambio 1b |
| D3 | `turn-economy.md:174-175` | «magia […] aún no está implementada». | Nivel, maná y hechizos implementados (`magic.ts`, `mana.ts`, `spells.ts`). | Cambio 1b |
| D4 | `turn-economy.md:184` | Fórmula de daño único `max(1, …)` como vigente. | El motor usa `resolvePackets` (`damage.ts:107-150`); `resolveDamage` solo es referencia histórica (`combat.ts:41-54`). | Cambio 1b |
| D5 | `turn-economy.md:185` | Resistencia = absorción que se suma a la armadura en una capa. | La resistencia es un perfil de bandas; la armadura solo entra en paquetes físicos (`damage.ts:28-38`, `damage.ts:64-66`). | Cambio 1b |
| D6 | `turn-economy.md:187` | Armadura = bonus a la resistencia. | La armadura resta al bruto de paquetes físicos; no toca mágico ni eléctrico (`damage.ts:64-66`). | Cambio 1b |
| D7 | `turn-economy.md:188` | Orden: ataque, escudo, golpe y absorción. | Ataque y escudo; si impacta, por paquete daño y resistencia en orden fijo (`combat.ts:78-111`, `damage.ts:119-148`). | Cambio 1b |
| D8 | `turn-economy.md:194-199` | Cuatro armas con columna «Daño» única. | Siete armas con `damagePackets` (`equipment.ts:67-121`). | Cambio 1b |
| D9 | `turn-economy.md:203-208` | Tabla de cuatro unidades con resistencia numérica. | Nueve arquetipos y tres enemigos con perfil de cinco bandas (`roster.ts:64-245`, `bestiary.ts:117-181`). | Cambio 1b |
| D10 | `turn-economy.md:210` | «Todos […] puntería 0 y magia vacía». | Arquero tiene puntería 3 (`roster.ts:135`); Mago/Clérigo/Guerrero mágico/Cocinero tienen magia 4/3/2/1 (`roster.ts:156,175,196,216`). | Cambio 1b |
| D11 | `turn-economy.md:215` | «El Guerrero […] añade +1 de resistencia (0 → 1)». | Perfil del Guerrero normal en los cinco tipos (`roster.ts:74`). | Cambio 1b |
| D12 | `turn-economy.md:226` | «solo existe ataque cuerpo a cuerpo». | Existen hechizos de daño, curación y resurrección (`magic.ts:97-199`); el ataque físico a distancia sigue sin implementar. | Cambio 1b |
| D13 | `architecture.md:60-63` | `combat.ts` suma resistencia y armadura en una capa; un impacto consume cuatro tiradas. | `combat.ts` resuelve impacto; el daño lo resuelve `damage.ts`, con dos tiradas por paquete (`combat.ts:78-111`). | Cambio 2a |
| D14 | `architecture.md:64-68` | Catálogo de armas sin paquetes; bestiario con «perfil» sin distinguir comportamiento y resistencia. | Siete armas con `damagePackets` (`equipment.ts:67-121`); el perfil de resistencia se deriva de familia + sobrescritura (`bestiary.ts:46-61`). | Cambio 2a |
| D15 | `architecture.md:77-78` | Solo `AttackPerformed` lleva tiradas. | `AttackPerformed`, `ReplicaPerformed` y `SpellCast` llevan `damageBreakdown` (`types.ts:271-335`). | Cambio 2a |
| D16 | `architecture.md:88-89` | «el Guerrero usa resistencia 1». | El Guerrero tiene perfil normal, no un valor 1 (`roster.ts:74`). | Cambio 2a |
| D17 | `architecture.md:96-98` | Hechizos con «poder». | Declaran `damagePacket` o `null` (`spells.ts:61-81`, `spells.ts:84-163`). | Cambio 2b |
| D18 | `architecture.md:105-107` | Daño mágico «contra resistencia + armadura» y «no hay resistencia mágica separada». | El paquete mágico ignora armadura y usa la banda mágica del perfil (`magic.ts:238-243`, `damage.ts:64-66`). | Cambio 2b |
| D19 | `docs/glossary.md:33` | «Acción: atacar, interactuar o esperar». | Esperar y terminar turno no consumen acción (`turn-economy.md:45-47`, `architecture.md:124-127`). | Cambio 3 |
| D20 | `glossary.md:55` | Magia determina maná y acceso, no menciona impacto. | El impacto mágico suma `magicLevel + spell.accuracy` (`magic.ts:221-226`). | Cambio 3 |
| D21 | `glossary.md:60` | Hechizo con «poder». | Declara `damagePacket`, efecto y objetivo (`spells.ts:61-81`). | Cambio 3 |
| D22 | `glossary.md` | No hay entrada de perfil. | `ResistanceProfile` y `bandFor` (`types.ts:41-45`, `damage.ts:35-38`). | Cambio 3 |
| D23 | `glossary.md:46` | Fuerza se suma al «daño del arma» sin acotar. | La fuerza solo entra en el paquete físico (`damage.ts:64-66`). | Cambio 3 |

No hay discrepancia de valores entre `REQ-029` y el código: armas, bandas,
perfiles de héroe, enemigos y plantillas coinciden con la hoja. La auditoría del
ADR está en el cambio 5.

# Cambio 1 — `docs/design/turn-economy.md`

## 1a. Aviso de vigencia general

- Archivo: `docs/design/turn-economy.md`
- Ancla: cabecera, tras el párrafo de propósito.
- Líneas base: 16-19.

Texto actual (cita literal; solo se normalizan los destinos de enlace a
referencias para que este artefacto pase `docs:check`):

````markdown
> **Aviso de vigencia (2026-11-12).** La sección de acción se actualiza con
> `REQ-026`: varias acciones por turno, Pícaro 3, enemigos 2/1/2 y tope 4
> provisional. La réplica de `REQ-027` ya está implementada y tiene sección
> propia. La magia de `REQ-025` sigue como referencia hasta que se implemente.
````

Reemplazo completo:

````markdown
> **Aviso de vigencia (2026-11-13).** La sección de acción se actualiza con
> `REQ-026`: varias acciones por turno, Pícaro 3, enemigos 2/1/2 y tope 4
> provisional. La réplica de `REQ-027` y la magia de `REQ-025` están
> implementadas y tienen sección propia. El combate de `REQ-029` se documenta en
> [Combate](#combate) con paquetes y bandas; el daño único queda como historia.
````

## 1b. Sección `# Combate` completa

- Archivo: `docs/design/turn-economy.md`
- Ancla: `#combate` (encabezado `# Combate`).
- Líneas base: 154-226; el bloque termina antes de `# Orden de turnos`.
- Se sustituye el bloque completo. No queda ninguna fórmula de daño único ni
  tabla antigua fuera de `## Historia`.

Texto actual (cita literal salvo destinos de enlace normalizados a referencias):

````markdown
# Combate

> **Nota de vigencia (2026-11-12).** La fórmula de daño, el catálogo de armas y
> la resistencia única quedan enmendados por
> [REQ-029][req-029] y
> [ADR-023][adr-023]: el daño se
> resuelve por paquetes con tipo y bandas. Las tablas de esta sección son
> históricas hasta que se actualicen en la tarea de implementación.

Valores aceptados en [REQ-010][req-010]
y registrados en [ADR-012][adr-012]; el
esquema de atributos y la absorción vigente están en
[REQ-014][req-014] y
[ADR-015][adr-015]. Son revisables
en playtest, pero no se cambian sin una nueva decisión.

Todo personaje comparte ocho atributos inherentes, independientes del equipo:
**habilidad**, **fuerza**, **defensa**, **resistencia**, **puntería**, **magia**,
**PV** y **MP**. El equipo no define ninguno; solo aporta bonus. Habilidad y
fuerza sustituyen a los antiguos modificadores de acierto y daño; defensa se
mantiene. Puntería sigue como slot sin efecto; magia se define en `REQ-025`
(nivel 0–4, maná y hechizos) y aún no está implementada.

| Regla | Valor |
|---|---|
| Alcance cuerpo a cuerpo | 1 casilla, incluidas las diagonales. |
| Alcance a distancia | 4 casillas, con línea de visión; futuro, no implementado. |
| Línea de visión | Bresenham sobre la rejilla; diagonales permitidas. |
| Cobertura | No existe en el primer prototipo. |
| Impacto | `habilidad + acierto del arma + 1d6 > defensa + escudo + 1d6`; el empate falla. |
| Daño | `max(1, (fuerza + daño del arma + 1d6) − (resistencia + armadura + 1d6))`. |
| Resistencia | Absorción de daño; se suma a la armadura del equipo en una sola capa. |
| Escudo | Suma a la defensa; no reduce el daño de un impacto. |
| Armadura | Bonus a la resistencia; resta al daño de un impacto, no evita el impacto. |
| Orden de tiradas | Ataque y escudo; si impacta, golpe y absorción. |
| Azar | RNG sembrado y serializable; misma semilla y comandos, misma secuencia. |
| Muerte | Al llegar a 0 PV. |

## Armas

| Arma | Acierto | Daño | Perfil |
|---|---:|---:|---|
| Espada | +3 | 3 | Equilibrada; arma inicial del Guerrero. |
| Hacha | +2 | 5 | Mucho daño; rompe armadura, pero falla más. |
| Daga | +4 | 2 | Muy fiable; supera escudos, pero sufre contra armadura. |
| Cuchillo | +4 | 1 | Muy fiable; menos dañino que la daga. Arma inicial del Cocinero. |

## Equipo y bestiario

| Unidad | Habilidad | Fuerza | Defensa | Resistencia | Arma | Escudo | Armadura | PV |
|---|---:|---:|---:|---:|---|---:|---:|---:|
| Guerrero (jugador por defecto) | +1 | +1 | +1 | +1 | Espada | 1 | 1 | 20 |
| Centinela | +0 | +0 | +0 | +0 | Espada | 1 | 0 | 6 |
| Bruto | +0 | +1 | +0 | +0 | Hacha | 0 | 2 | 8 |
| Cobarde | +1 | +0 | +1 | +0 | Daga | 1 | 0 | 5 |

Todos los personajes tienen puntería 0 y magia vacía en este corte. MP enemigo:
Centinela 5, Bruto 4, Cobarde 6. Estos valores son el **balance provisional v1**
de [REQ-010 v5][req-010] y
[REQ-009 v4][req-009]; el balance v1
de enemigos y armas no cambia. El Guerrero sustituye al jugador provisional y
añade +1 de resistencia (0 → 1). El roster de
[REQ-015][req-015] es la fuente única de
stats y equipo de los héroes.

El Guerrero empieza con la espada, el escudo y la armadura; los huecos
secundarios arrancan vacíos y el equipo inicial de cada arquetipo es la tabla de
[REQ-015][req-015]. El hacha y la daga están
en el mapa. El juego tiene ocho huecos de equipo y ocho de mochila por personaje;
el arma se cambia **solo** desde el panel abierto con `I`, cuesta 1 MP y no gasta
acción; `G` ya no existe y la recogida también se hace desde el panel
([REQ-018][req-018]). En este corte solo
existe ataque cuerpo a cuerpo; el alcance a distancia queda como valor futuro.
````

Reemplazo completo:

````markdown
# Combate

El combate vigente se resuelve con el modelo de paquetes y perfiles de
[REQ-029][req-029] y [ADR-023][adr-023]; la tirada de impacto y el escudo
conservan lo aceptado en [REQ-010][req-010] y [ADR-012][adr-012]. El esquema de
atributos vive en [REQ-014][req-014] y la absorción numérica de
[ADR-015][adr-015] queda sustituida por el perfil de bandas.

Todo personaje comparte nueve atributos inherentes, independientes del equipo:
**habilidad**, **fuerza**, **defensa**, **resistencia**, **puntería**, **magia**,
**PV**, **MP** y **acciones por turno**. El equipo no define ninguno; solo aporta
bonus. Habilidad y fuerza sustituyen a los antiguos modificadores de acierto y
daño; la fuerza se suma solo al paquete físico y defensa se mantiene. La
resistencia es un **perfil de cinco bandas**, una por tipo de daño, no un valor
plano. Puntería sigue como slot sin efecto. Magia es un nivel único 0–4
([REQ-025][req-025]): determina el maná, el acceso a hechizos y el impacto
mágico; no cambia el tipo de daño ni la resistencia.

| Regla | Valor |
|---|---|
| Alcance cuerpo a cuerpo | 1 casilla, incluidas las diagonales. |
| Alcance a distancia | 4 casillas, con línea de visión; futuro, no implementado. |
| Línea de visión | Bresenham sobre la rejilla; diagonales permitidas. |
| Cobertura | No existe en el primer prototipo. |
| Impacto | `habilidad + acierto del arma + 1d6 > defensa + escudo + 1d6`; el empate falla. |
| Impacto mágico | `nivel de magia + acierto del hechizo + 1d6 > defensa + escudo + 1d6`; el empate falla. |
| Daño por paquete físico | `bruto = cantidad + fuerza + 1d6 − (armadura + 1d6)`. |
| Daño por paquete mágico o eléctrico | `bruto = cantidad + 1d6 − 1d6`; ni fuerza ni armadura entran. |
| Banda | `bruto = max(0, bruto)`; `daño = max(0, floor(bruto × banda))`. |
| Total | `max(1, suma de daños de paquete)`; un paquete nunca resta a otro. |
| Resistencia | Perfil de cinco bandas; se aplica después de la absorción y no hay inmunidad absoluta. |
| Escudo | Suma a la defensa; decide el impacto de cualquier tipo, no reduce el daño. |
| Armadura | Resta al daño de los paquetes físicos (filo, contundente y punzante); no protege de mágico ni eléctrico. |
| Orden de tiradas | Ataque y escudo; si impacta, por paquete en el orden declarado, daño y resistencia. Un fallo consume dos tiradas. |
| Azar | RNG sembrado y serializable; misma semilla y comandos, misma secuencia. |
| Muerte | Al llegar a 0 PV. |

## Bandas de resistencia

| Banda | Multiplicador | Uso |
|---|---:|---|
| Vulnerable | ×1,5 | Debilidad clara; el paquete hace más daño. |
| Normal | ×1 | Valor por defecto; la banda ausente cuenta como normal. |
| Resistente | ×0,5 | Reduce a la mitad el daño del paquete. |
| Muy resistente | ×0,25 | Resistencia extrema y rara; nunca inmunidad. |

## Armas

| Arma | Acierto | Paquetes | Estimada v1 | Notas |
|---|---:|---|---|---|
| Espada | +3 | filo 3 | No | Equilibrada; arma inicial del Guerrero. |
| Hacha | +2 | filo 5 | No | Mucho daño; falla más. |
| Daga | +4 | punzante 2 | No | Muy fiable; sufre contra armadura. |
| Cuchillo | +4 | punzante 1 | No | Muy fiable; arma inicial del Cocinero. |
| Martillo | +2 | contundente 4 | Sí | Única arma nueva colocada en el mapa de forma determinista. |
| Espada electrizada | +3 | filo 3 + eléctrico 1 | Sí | Arma mixta; cualquier héroe puede usarla. |
| Daga arcana | +4 | punzante 2 + mágico 1 | Sí | Segunda fuente elemental; existe como dato y no se coloca en el mapa. |

El catálogo vive en `equipment.ts`. Las armas marcadas como estimadas v1 son
contenido de prueba de REQ-029 y no cambian el equipo inicial del roster: el
martillo entra en el mapa y la espada electrizada y la daga arcana existen como
datos.

## Equipo y bestiario

Atributos y equipo de los nueve arquetipos y los tres enemigos actuales. Los
perfiles se leen por tipo; `V` = vulnerable, `N` = normal, `R` = resistente y
`MR` = muy resistente.

| Unidad | Habilidad | Fuerza | Defensa | PV | MP | Arma | Escudo | Armadura |
|---|---:|---:|---:|---:|---:|---|---:|---:|
| Guerrero | +1 | +1 | +1 | 20 | 6 | Espada | 1 | 1 |
| Bárbaro | 0 | +3 | −1 | 24 | 5 | Hacha | 0 | 0 |
| Pícaro | +3 | 0 | +1 | 14 | 8 | Daga | 0 | 0 |
| Arquero | +1 | 0 | 0 | 14 | 6 | — | 0 | 0 |
| Mago | 0 | −1 | 0 | 12 | 5 | — | 0 | 0 |
| Clérigo | 0 | −1 | +3 | 18 | 5 | — | 1 | 1 |
| Guerrero mágico | +1 | 0 | +1 | 18 | 6 | — | 0 | 1 |
| Cocinero | +3 | −1 | 0 | 14 | 6 | Cuchillo | 0 | 0 |
| Agricultor | −1 | +3 | 0 | 22 | 4 | — | 1 | 0 |
| Centinela | 0 | 0 | 0 | 6 | 5 | Espada | 1 | 0 |
| Bruto | 0 | +1 | 0 | 8 | 4 | Hacha | 0 | 2 |
| Cobarde | +1 | 0 | +1 | 5 | 6 | Daga | 1 | 0 |

| Unidad | Filo | Contundente | Punzante | Mágico | Eléctrico |
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
| Centinela | N | N | N | N | N |
| Bruto | N | R | N | V | V |
| Cobarde | N | V | N | N | N |

Los perfiles de los héroes son estimados v1 del roster. Los enemigos heredan la
plantilla humanoide y sobrescriben solo algunas bandas; las seis plantillas de
familia (humanoide, constructo, no muerto, bestia, elemental y dragón) están en
`bestiary.ts` y la asignación de las 64 entradas queda para una hoja posterior.
Escudo y armadura son el valor numérico del equipo; 0 significa sin equipo.

El Guerrero empieza con la espada, el escudo y la armadura; los huecos
secundarios arrancan vacíos y el equipo inicial de cada arquetipo es la tabla de
[REQ-015][req-015]. El hacha, la daga y el martillo están en el mapa; la espada
electrizada y la daga arcana existen como datos. El juego tiene ocho huecos de
equipo y ocho de mochila por personaje; el arma se cambia **solo** desde el panel
abierto con `I`, cuesta 1 MP y no gasta acción; `G` ya no existe y la recogida
también se hace desde el panel ([REQ-018][req-018]). En este corte existen ataque
cuerpo a cuerpo y hechizos; el alcance físico a distancia queda como valor futuro.

## Historia: modelo de daño único (REQ-010/ADR-015)

> **No vigente.** Se conserva solo como historia y como referencia para el
> cross-check de `EXP-003`. El motor no usa estas fórmulas ni estas tablas; el
> modelo vigente es el de arriba ([REQ-029][req-029], [ADR-023][adr-023]).

Fórmula histórica:

```text
impacto: habilidad + acierto del arma + 1d6 > defensa + escudo + 1d6
daño:    max(1, (fuerza + daño del arma + 1d6) − (resistencia + armadura + 1d6))
```

| Arma histórica | Acierto | Daño | Perfil |
|---|---:|---:|---|
| Espada | +3 | 3 | Equilibrada; arma inicial del Guerrero. |
| Hacha | +2 | 5 | Mucho daño; rompe armadura, pero falla más. |
| Daga | +4 | 2 | Muy fiable; supera escudos, pero sufre contra armadura. |
| Cuchillo | +4 | 1 | Muy fiable; menos dañino que la daga. Arma inicial del Cocinero. |

| Unidad histórica | Habilidad | Fuerza | Defensa | Resistencia | Arma | Escudo | Armadura | PV |
|---|---:|---:|---:|---:|---|---:|---:|---:|
| Guerrero (jugador por defecto) | +1 | +1 | +1 | +1 | Espada | 1 | 1 | 20 |
| Centinela | +0 | +0 | +0 | +0 | Espada | 1 | 0 | 6 |
| Bruto | +0 | +1 | +0 | +0 | Hacha | 0 | 2 | 8 |
| Cobarde | +1 | +0 | +1 | +0 | Daga | 1 | 0 | 5 |

En el modelo histórico el Guerrero añadía +1 de resistencia (0 → 1); hoy su
perfil es normal en los cinco tipos.
````

Definiciones de enlace a añadir al final de `docs/design/turn-economy.md` (una
sola vez; las usan 1a y 1b):

````markdown
[req-009]: ../requirements/REQ-009-percepcion-alarma-huida.md
[req-010]: ../requirements/REQ-010-combate-equipo-acierto-defensa.md
[req-014]: ../requirements/REQ-014-atributos-inherentes-personajes.md
[req-015]: ../requirements/REQ-015-roster-arquetipos.md
[req-018]: ../requirements/REQ-018-inventario-equipo.md
[req-025]: ../requirements/REQ-025-magia-hechizos-mana.md
[req-029]: ../requirements/REQ-029-tipos-dano-resistencias.md
[adr-012]: ../decisions/ADR-012-combate-equipo-rng.md
[adr-015]: ../decisions/ADR-015-atributos-inherentes-absorcion.md
[adr-023]: ../decisions/ADR-023-tipos-dano-paquetes-bandas.md
````

Trazabilidad de valores del cambio 1:

| Dato | Fuente |
|---|---|
| Multiplicadores ×1,5/×1/×0,5/×0,25 | `damage.ts:28-33` |
| Fórmula física, elemental, `floor`, recorte y mínimo 1 | `damage.ts:64-73`, `damage.ts:150` |
| Orden ataque/escudo y daño/resistencia por paquete | `combat.ts:78-111`, `damage.ts:119-148` |
| Siete armas, acierto y paquetes | `equipment.ts:67-121` |
| `estimatedV1` en martillo, espada electrizada y daga arcana | `equipment.ts:94-120` |
| Armaduras 1/2 y escudo 1 | `equipment.ts:123-130` |
| Equipo inicial y stats de los nueve arquetipos | `roster.ts:64-245` |
| Perfiles de héroe | `roster.ts:70-78`, `90-98`, `110-118`, `130-138`, `150-158`, `170-178`, `190-198`, `210-218`, `230-238` |
| Perfiles de enemigo y familia | `bestiary.ts:46-61`, `117-181` |
| Martillo en el mapa | `map.ts:157-168` |
| Fórmula histórica conservada | `combat.ts:41-54` |

# Cambio 2 — `docs/design/architecture.md`

## 2a. Sección `# Combate y azar`

- Archivo: `docs/design/architecture.md`
- Ancla: `#combate-y-azar`.
- Líneas base: 51-89; termina antes de `## Magia y maná`.
- Se sustituye completa: la nota, las viñetas y el párrafo final.

Texto actual (cita literal salvo destinos de enlace normalizados a referencias):

````markdown
# Combate y azar

> **Nota de vigencia (2026-11-12).** [REQ-029][req-029]
> y [ADR-023][adr-023] sustituyen la
> capa de absorción única por paquetes con tipo y perfiles de banda. El RNG, los
> eventos, la separación motor/host y el resto de esta sección siguen vigentes.

El combate vive en `src/game/` y es puro y determinista:

- `combat.ts` resuelve impacto y daño con el esquema de `REQ-014`: habilidad y
  fuerza son los modificadores del atacante; defensa se suma al escudo y la
  resistencia a la armadura en una sola capa de absorción. Un fallo consume dos
  tiradas y un impacto cuatro, en el orden ataque, escudo, golpe y absorción.
- `equipment.ts` guarda el catálogo de armas, armaduras y escudos con IDs
  estables; `bestiary.ts` guarda por tipo los nueve atributos (habilidad, fuerza,
  defensa, resistencia, puntería, magia, PV, MP y acciones), arma, escudo,
  armadura, visión
  y perfil.
- `roster.ts` es la fuente única de los nueve arquetipos jugables de REQ-015:
  stats, equipo inicial, variantes, rol y magia de identidad. El jugador por
  defecto se crea con `createPlayerFromArchetype('warrior', ...)` en el spawn del
  mapa; `Unit.archetypeId` guarda la identidad serializable y es `null` en
  enemigos y unidades sintéticas. El HUD deriva el nombre del arquetipo del
  roster y no duplica valores.
- `rng.ts` implementa un d6 serializable. El estado guarda la semilla y el
  contador; la misma semilla y los mismos comandos dan la misma secuencia.
- Los eventos `AttackPerformed` incluyen impacto, daño, PV resultante y tiradas;
  el host no recalcula reglas.
- El jugador y los enemigos comparten el mismo resolvedor. La recogida y el
  cambio de arma son comandos del motor; desde [REQ-018][req-018]
  la tecla `G` y el cambio con `1`-`3` desaparecen y la gestión pasa por el panel
  abierto con `I`.

Ver [REQ-014][req-014],
[REQ-015][req-015] y
[ADR-015][adr-015]. El combate con
equipo y RNG de [REQ-010][req-010]
y [ADR-012][adr-012] queda como historia; el
balance v1 de enemigos y armas se conserva y el Guerrero usa resistencia 1.
````

Reemplazo completo:

````markdown
# Combate y azar

El combate vive en `src/game/` y es puro y determinista. El modelo vigente es el
de [REQ-029][req-029] y [ADR-023][adr-023], que sustituyen la absorción única de
[ADR-015][adr-015].

- `damage.ts` es el resolvedor único y puro de paquetes: por paquete, un dado de
  daño y uno de resistencia en el orden declarado; los paquetes físicos suman
  fuerza y restan armadura, y los mágicos y eléctricos ignoran ambas. La banda
  del perfil se aplica después de la absorción con `floor`, cada paquete se
  recorta a 0 y el total es `max(1, suma)`. Armas, réplicas y hechizos pasan por
  aquí; no hay una fórmula paralela en `magic.ts` ni en la IA.
- `combat.ts` resuelve el impacto con `habilidad + acierto del arma` contra
  `defensa + escudo`; el empate falla. Un fallo consume dos tiradas (ataque y
  escudo); un impacto consume dos más por paquete (daño y resistencia), en orden
  fijo. Los perfiles de resistencia viven en las unidades
  (`UnitStats.resistencia`), no en una tabla aparte.
- `equipment.ts` guarda el catálogo de siete armas con `damagePackets`, armaduras
  y escudos con IDs estables. Las armas nuevas de REQ-029 se marcan con
  `estimatedV1`; el martillo se coloca en el mapa.
- `bestiary.ts` guarda por tipo los nueve atributos, equipo, visión, alarma y
  perfil de comportamiento. El perfil de resistencia se compone de una plantilla
  de familia (humanoide, constructo, no muerto, bestia, elemental y dragón) más
  una sobrescritura parcial del enemigo.
- `roster.ts` es la fuente única de los nueve arquetipos jugables de REQ-015:
  stats (incluido el perfil de resistencia), equipo inicial, variantes, rol y
  magia de identidad. El jugador por defecto se crea con
  `createPlayerFromArchetype('warrior', ...)` en el spawn del mapa;
  `Unit.archetypeId` guarda la identidad serializable y es `null` en enemigos y
  unidades sintéticas. El HUD deriva el nombre del arquetipo del roster y no
  duplica valores.
- `rng.ts` implementa un d6 serializable. El estado guarda la semilla y el
  contador; la misma semilla y los mismos comandos dan la misma secuencia.
- Los eventos `AttackPerformed`, `ReplicaPerformed` y `SpellCast` incluyen
  impacto, daño total, PV resultante, tiradas y `damageBreakdown` por paquete:
  tipo, cantidad base, dados de daño y resistencia, bruto, banda, multiplicador y
  daño final. El host no recalcula reglas.
- El jugador y los enemigos comparten el mismo resolvedor. La recogida y el
  cambio de arma son comandos del motor; desde [REQ-018][req-018] la tecla `G` y
  el cambio con `1`-`3` desaparecen y la gestión pasa por el panel abierto con
  `I`.

Ver [REQ-014][req-014], [REQ-015][req-015], [REQ-029][req-029] y
[ADR-023][adr-023]. El combate con equipo y RNG de [REQ-010][req-010] y
[ADR-012][adr-012] queda como historia; el balance v1 de enemigos y armas se
conserva, y la resistencia numérica de [ADR-015][adr-015] se sustituye por el
perfil de bandas. La implementación se cerró en TASK-0085 a TASK-0090 y se
documenta en [turn-economy][turn-economy].
````

## 2b. Sección `## Magia y maná`

- Archivo: `docs/design/architecture.md`
- Ancla: `#magia-y-maná`.
- Líneas base: 91-115; termina antes de `## Economía de acciones`.
- Se sustituye completa para retirar «poder», la absorción de armadura y la
  «resistencia mágica separada».

Texto actual (cita literal salvo destinos de enlace normalizados a referencias):

````markdown
## Magia y maná

La magia de [REQ-025][req-025] vive en
`src/game/` y comparte el RNG y las capas de combate:

- `spells.ts` es el catálogo de hechizos: id, familia, nivel mínimo, coste,
  alcance, acierto, poder, objetivo, efecto y presentación. Es dato serializable
  y fuente única; añadir un hechizo no toca el resolvedor.
- `magic.ts` valida y resuelve hechizos con el RNG sembrado: acción, maná, nivel,
  alcance, línea de visión y objetivo. Un rechazo no consume nada.
- El comando `CastSpell` apunta a una casilla y resuelve el objetivo por facción;
  `Unit.spellsCast` cuenta los hechizos del turno (tope 2) y se reinicia con MP,
  acciones y maná. El evento `SpellCast` lleva impacto, daño, curación o PV de
  retorno para que el host no recalcule reglas.
- El ataque mágico reutiliza las capas de `combat.ts`: acierto con nivel de magia
  + acierto del hechizo contra defensa + escudo; daño con poder del hechizo contra
  resistencia + armadura. No hay una resistencia mágica separada.
- `mana.ts` implementa el recurso de este corte: `UnitStats.magicLevel` (0–4) y
  `Unit.mana { current, max }`; `max = nivel × 4` y se recarga al inicio del
  turno junto a MP y acciones. El maná no altera el MP.
- La curación y la resurrección son hechizos sin tirada de impacto; la
  resurrección conserva las condiciones de
  [REQ-021][req-021].

Ver [ADR-019][adr-019].
````

Reemplazo completo:

````markdown
## Magia y maná

La magia de [REQ-025][req-025] vive en `src/game/` y comparte el RNG y las capas
de combate:

- `spells.ts` es el catálogo de hechizos: id, familia, nivel mínimo, coste,
  alcance, acierto, `damagePacket`, objetivo, efecto y presentación. Es dato
  serializable y fuente única; añadir un hechizo no toca el resolvedor. Los
  hechizos de daño declaran un paquete eléctrico o mágico; curación y
  resurrección no declaran paquete.
- `magic.ts` valida y resuelve hechizos con el RNG sembrado: acción, maná, nivel,
  objetivo, alcance, línea de visión y tope. Un rechazo no consume nada. El daño
  de un hechizo pasa por el resolvedor de `damage.ts`, no por una fórmula
  paralela.
- El comando `CastSpell` apunta a una casilla y resuelve el objetivo por facción;
  `Unit.spellsCast` cuenta los hechizos del turno (tope 2) y se reinicia con MP,
  acciones y maná. El evento `SpellCast` de daño lleva impacto, daño, PV
  resultante, tiradas y `damageBreakdown`; curación y resurrección llevan su
  efecto para que el host no recalcule reglas.
- El ataque mágico reutiliza las capas de `combat.ts`: el impacto suma el nivel
  de magia y el acierto del hechizo contra defensa + escudo; el daño usa el
  paquete del hechizo contra el perfil de resistencia del objetivo. Mágico y
  eléctrico ignoran fuerza y armadura: la armadura no absorbe daño mágico ni
  eléctrico, aunque el escudo sí cuenta para el impacto. El nivel de magia solo
  afecta a acceso, maná e impacto; no decide el tipo ni la resistencia.
- `mana.ts` implementa el recurso de este corte: `UnitStats.magicLevel` (0–4) y
  `Unit.mana { current, max }`; `max = nivel × 4` y se recarga al inicio del
  turno junto a MP y acciones. El maná no altera el MP.
- La curación y la resurrección son hechizos sin tirada de impacto; la
  resurrección conserva las condiciones de [REQ-021][req-021].

Ver [ADR-019][adr-019] y [ADR-023][adr-023].
````

Definiciones de enlace a añadir al final de `docs/design/architecture.md` (una
sola vez; las usan 2a y 2b):

````markdown
[req-009]: ../requirements/REQ-009-percepcion-alarma-huida.md
[req-010]: ../requirements/REQ-010-combate-equipo-acierto-defensa.md
[req-014]: ../requirements/REQ-014-atributos-inherentes-personajes.md
[req-015]: ../requirements/REQ-015-roster-arquetipos.md
[req-018]: ../requirements/REQ-018-inventario-equipo.md
[req-021]: ../requirements/REQ-021-muerte-fantasma-resurreccion.md
[req-025]: ../requirements/REQ-025-magia-hechizos-mana.md
[req-029]: ../requirements/REQ-029-tipos-dano-resistencias.md
[adr-012]: ../decisions/ADR-012-combate-equipo-rng.md
[adr-015]: ../decisions/ADR-015-atributos-inherentes-absorcion.md
[adr-019]: ../decisions/ADR-019-magia-mana-hechizos.md
[adr-023]: ../decisions/ADR-023-tipos-dano-paquetes-bandas.md
[turn-economy]: turn-economy.md#combate
````

Trazabilidad de valores del cambio 2:

| Dato | Fuente |
|---|---|
| Resolvedor único y fórmula por paquete | `damage.ts:1-10`, `64-73`, `107-150` |
| Impacto, orden y dos tiradas por paquete | `combat.ts:31-39`, `67-111` |
| Siete armas y `estimatedV1` | `equipment.ts:23-36`, `67-121` |
| Perfiles por familia y sobrescritura | `bestiary.ts:42-61`, `97-115` |
| Stats y perfiles del roster | `roster.ts:21-34`, `64-245` |
| Eventos con desglose | `types.ts:255-335` |
| Hechizo tipado sin paquete en cura/resurrección | `spells.ts:61-81`, `137-162` |
| Impacto mágico y paquete contra banda | `magic.ts:209-244` |
| Maná `nivel × 4` | `mana.ts:10-22` (usado en `roster.ts:281`) |

# Cambio 3 — `docs/glossary.md`

Archivo: `docs/glossary.md`. Se añade una fila y se sustituyen tres filas. Las
entradas **Tipo de daño**, **Paquete de daño**, **Banda de resistencia**,
**Daño del arma**, **Resistencia**, **Armadura** y **Escudo** no cambian: ya
describen el código y enlazan a REQ-029.

## 3a. Nueva fila de perfil

Insertar después de la fila **Banda de resistencia** (línea base 51).

Texto de reemplazo completo (fila nueva):

````markdown
| **Perfil de resistencia** | Conjunto de bandas de una unidad, una por tipo de daño; la banda ausente es `normal`. Vive en `UnitStats.resistencia` y sustituye a la resistencia numérica única ([REQ-029][req-029]). No confundir con el perfil de comportamiento del bestiario (`brave`/`coward`, [REQ-009][req-009]). |
````

## 3b. Fila **Acción**

- Línea base: 33.
- Contradicción: incluye «esperar» como acción, pero esperar no consume el
  contador. Se documenta el comportamiento implementado; no se cambia la regla.

Texto actual:

````markdown
| **Acción** | Una intervención táctica: atacar, interactuar o esperar. |
````

Reemplazo completo:

````markdown
| **Acción** | Intervención que consume una de las acciones del turno: atacar, interactuar o lanzar hechizos. Esperar y terminar el turno son libres y no consumen acción ([REQ-026][req-026]). |
````

## 3c. Fila **Magia**

- Línea base: 55.
- Falta el impacto: el código suma el nivel de magia al acierto del hechizo.

Texto actual:

````markdown
| **Magia** | Atributo inherente de nivel entero único 0–4 (0 = sin magia). Determina el maná máximo y el acceso a hechizos; las familias son categorías de hechizo, no niveles. No confundir con el **tipo de daño mágico**, que es independiente y cualquier héroe puede usar con un arma encantada ([REQ-029][req-029]). |
````

Reemplazo completo:

````markdown
| **Magia** | Atributo inherente de nivel entero único 0–4 (0 = sin magia). Determina el maná máximo, el acceso a hechizos y el bono de impacto mágico (nivel + acierto del hechizo); las familias son categorías de hechizo, no niveles. No confundir con el **tipo de daño mágico**, que es independiente y cualquier héroe puede usar con un arma encantada ([REQ-029][req-029], [REQ-025][req-025]). |
````

## 3d. Fila **Hechizo**

- Línea base: 60.
- «Poder» ya no existe como campo; el daño es un paquete y el efecto puede ser
  curación o resurrección.

Texto actual:

````markdown
| **Hechizo** | Efecto mágico con nivel mínimo, coste base 2 × nivel, alcance, acierto y poder; consume una acción y se limita a dos por turno en el primer corte (provisional). |
````

Reemplazo completo:

````markdown
| **Hechizo** | Efecto mágico con nivel mínimo, coste de maná, alcance, acierto, objetivo y efecto; los de daño declaran un paquete mágico o eléctrico y usan el resolvedor común. Consume una acción y se limita a dos por turno en el primer corte (provisional) ([REQ-025][req-025], [REQ-029][req-029]). |
````

## 3e. Fila **Fuerza**

- Línea base: 46.
- El código suma fuerza solo al paquete físico; la definición actual dice «daño
  del arma» sin acotar.

Texto actual:

````markdown
| **Fuerza** | Atributo inherente que se suma al daño del arma; sustituye al antiguo modificador de daño. |
````

Reemplazo completo:

````markdown
| **Fuerza** | Atributo inherente que se suma solo al paquete físico del arma; los paquetes mágico y eléctrico no escalan con ella. Sustituye al antiguo modificador de daño ([REQ-029][req-029]). |
````

## 3f. Definiciones de enlace

Añadir al final de `docs/glossary.md` (una sola vez; rutas sin `../` porque el
glosario vive en `docs/`):

````markdown
[req-009]: requirements/REQ-009-percepcion-alarma-huida.md
[req-025]: requirements/REQ-025-magia-hechizos-mana.md
[req-026]: requirements/REQ-026-economia-acciones-rebalanceo.md
[req-029]: requirements/REQ-029-tipos-dano-resistencias.md
````

Trazabilidad: perfil `types.ts:41-45` y `damage.ts:35-38`; maná `types.ts:89-95`;
impacto mágico `magic.ts:221-226`; hechizo `spells.ts:61-81`; acción y espera
`turn-economy.md:45-47` y `architecture.md:124-127`.

# Cambio 4 — Notas de vigencia de requisitos

Texto mínimo para requirements-writer. No se reescribe el historial de
decisiones ni las tablas; solo se sustituye el bloque de nota de cada hoja. No se
propone tocar frontmatter: si su proceso lo exige, `updated_at` puede pasar a
`2026-11-13T00:00:00Z` sin cambiar versión.

## 4a. `docs/requirements/REQ-010-combate-equipo-acierto-defensa.md`

- Líneas base: 37-40.

Texto actual:

````markdown
> **Nota de vigencia (2026-11-12).** La fórmula de daño y el catálogo de armas
> quedan enmendados por [REQ-029][req-029]: el daño se
> resuelve por paquetes con tipo y resistencia por bandas; la tirada de impacto y
> el escudo no cambian. Las tablas de balance de esta hoja son históricas.
````

Reemplazo completo:

````markdown
> **Nota de vigencia (2026-11-13).** La fórmula de daño único, el catálogo de
> armas y las tablas de balance de esta hoja son históricos: el daño vigente se
> resuelve por paquetes con tipo y perfil de bandas en `src/game/damage.ts`, según
> [REQ-029][req-029] y [ADR-023][adr-023]. La tirada de impacto y el escudo no
> cambian. Lo implementan TASK-0085 a TASK-0090 y lo documenta TASK-0091.
````

## 4b. `docs/requirements/REQ-014-atributos-inherentes-personajes.md`

- Líneas base: 23-26.

Texto actual:

````markdown
> **Nota de vigencia (2026-11-12).** La resistencia numérica única pasa a ser un
> perfil de cinco bandas por tipo en
> [REQ-029][req-029]. Los nueve atributos se mantienen;
> la fórmula de daño de esta hoja queda enmendada.
````

Reemplazo completo:

````markdown
> **Nota de vigencia (2026-11-13).** La resistencia numérica única pasa a ser un
> perfil de cinco bandas por tipo en `UnitStats.resistencia`, según
> [REQ-029][req-029] y [ADR-023][adr-023]. Los nueve atributos se mantienen; la
> fórmula de daño de esta hoja queda enmendada y la implementación se cerró en
> TASK-0085 y TASK-0086, documentada en TASK-0091.
````

## 4c. `docs/requirements/REQ-015-roster-arquetipos.md`

- Líneas base: 31-33.

Texto actual:

````markdown
> **Nota de vigencia (2026-11-12).** Los perfiles de resistencia por arquetipo se
> añaden en [REQ-029][req-029]; la tabla de stats y el
> equipo inicial se mantienen, salvo la resistencia numérica, que pasa a perfil.
````

Reemplazo completo:

````markdown
> **Nota de vigencia (2026-11-13).** Los perfiles de resistencia por arquetipo se
> añaden en `src/game/roster.ts` según [REQ-029][req-029] y [ADR-023][adr-023]; la
> tabla de stats y el equipo inicial se mantienen, salvo la resistencia numérica,
> que pasa a perfil de cinco bandas. Lo implementan TASK-0085 y TASK-0086 y lo
> documenta TASK-0091.
````

## 4d. `docs/requirements/REQ-025-magia-hechizos-mana.md`

- Líneas base: 23-27.

Texto actual:

````markdown
> **Nota de vigencia (2026-11-12).** La fórmula mágica y el catálogo se enmendan
> por [REQ-029][req-029]: el daño se resuelve por
> paquetes con tipo, la armadura no protege de mágico/eléctrico y el nivel de
> magia solo afecta a acceso, maná e impacto. Los hechizos de fuego causan daño
> mágico hasta que exista el trait de quemadura; los eléctricos causan eléctrico.
````

Reemplazo completo:

````markdown
> **Nota de vigencia (2026-11-13).** La fórmula mágica y el catálogo se enmendan
> por [REQ-029][req-029] y [ADR-023][adr-023]: el daño se resuelve por paquetes
> con tipo en `src/game/damage.ts`, la armadura no protege de mágico/eléctrico y
> el nivel de magia solo afecta a acceso, maná e impacto. Los hechizos de fuego
> causan daño mágico hasta que exista el trait de quemadura; los eléctricos
> causan eléctrico. Lo implementan TASK-0085 a TASK-0090 y lo documenta
> TASK-0091.
````

Definiciones de enlace para las cuatro hojas (misma ruta relativa en todas;
añadir al final de cada una):

````markdown
[req-029]: REQ-029-tipos-dano-resistencias.md
[adr-023]: ../decisions/ADR-023-tipos-dano-paquetes-bandas.md
````

# Cambio 5 — Auditoría de `ADR-023`

- Archivo: `docs/decisions/ADR-023-tipos-dano-paquetes-bandas.md`.
- Enlace: el archivo existe y las cuatro hojas y el diseño lo enlazan. No se
  propone cambio de texto.

| Afirmación del ADR | Código | Veredicto |
|---|---|---|
| Cinco tipos; fuego y hielo no son tipos | `types.ts:29-33` | Coincide. |
| Mágico/eléctrico para cualquiera; nivel de magia solo acceso, maná e impacto | `equipment.ts:101-120`, `magic.ts:221-226` | Coincide. |
| Máximo un físico y uno elemental; ningún ataque supera dos paquetes | `equipment.ts:38-51`; hechizos declaran uno (`spells.ts:77`) | Coincide. |
| Fuerza solo al paquete físico | `damage.ts:64-66` | Coincide. |
| Armadura solo física; escudo suma a la defensa de todos | `damage.ts:64-66`, `combat.ts:80-85`, `magic.ts:221-226` | Coincide. |
| Bandas ×1,5/×1/×0,5/×0,25 después de la absorción, floor y mínimo 1 global | `damage.ts:28-33`, `64-73`, `150` | Coincide. |
| Perfil por tipo sustituye a la resistencia plana | `types.ts:35-45`, `types.ts:80-81` | Coincide. |
| Un resolvedor compartido por armas y hechizos | `damage.ts:107-150`, `combat.ts:98-104`, `magic.ts:239-243` | Coincide. |
| Eventos con desglose por paquete | `types.ts:271-335` | Coincide. |
| Familias reutilizables | `bestiary.ts:23-61` | Coincide. |

Matiz, no contradicción: la fórmula de «impacto» del ADR es la del ataque de
arma. El ataque mágico sustituye habilidad por nivel de magia y acierto de arma
por acierto del hechizo (`magic.ts:221-226`), tal como fija REQ-025; el ADR no
afirma lo contrario. La consecuencia «la UI gana cinco bandas y un desglose» es
una obligación de interfaz, no una regla del motor.

# Comprobaciones y límites

- `pnpm run docs:check`: ver `docs-check-output.txt`.
- `pnpm run verify`: ver `verify-output.txt`.
- Sin cambios en `src/**`, `tests/**`, `package.json` ni fuera de
  `artifacts/TASK-0091/`.
- Si requirements-writer considera que «esperar» debe consumir acción, es un
  cambio de regla y no se aplica desde este plan; el glosario solo describe el
  código actual.
