---
type: Experiment
id: EXP-005
title: "Mesa de tipos de daño y bandas de resistencia"
description: "Cancelado por el momento: simulador propuesto para ajustar bandas y paquetes de REQ-029; los valores estimados bastan para probar y el ajuste fino se hará con roster y bestiario completos."
status: deprecated
experiment_status: archived
question: "¿Qué perfiles de banda y qué paquetes de arma hacen combates legibles y distintos sin que la armadura, la fuerza o un solo tipo dominen?"
related_requirements: [REQ-029]
related_decisions: [ADR-023]
seed: 1017
parameters:
  seed: 1017
  duels: 1000
  profileSet: media
  weaponSet: con-encantadas
  enemySet: familias
  showBreakdown: true
decision: cancelled
decided_by: human:simon
decided_at: 2026-11-12T12:00:00Z
created_at: 2026-11-12T12:00:00Z
updated_at: 2026-11-12T12:00:00Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-12T12:00:00Z }
verified:
---

> **Cancelado por el momento (2026-11-12).** El usuario decide no construirlo: los
> valores estimados de `REQ-029` bastan para probar. El ajuste fino se hará cuando
> roster y bestiario estén completos, con un mecanismo iterable de fortalezas y
> debilidades. Se conserva como referencia de la pregunta y las métricas.

# Propósito

Responder una sola pregunta: qué **perfiles de banda** y qué **paquetes de arma**
hacen que los cinco tipos de [REQ-029](../../docs/requirements/REQ-029-tipos-dano-resistencias.md)
se lean y se sientan distintos, sin que la armadura, la fuerza o un único tipo
dominen el combate.

El modelo ya está decidido en [ADR-023](../../docs/decisions/ADR-023-tipos-dano-paquetes-bandas.md):
paquetes separados, fuerza solo física, armadura solo física, bandas con
multiplicador y mínimo 1 global. Este experimento **no reabre el modelo**; ajusta
la tabla provisional y las cantidades de las armas nuevas.

No sustituye a `EXP-003`: la mesa de combate sigue siendo la referencia de
acciones, magia y réplica. `EXP-005` añade la capa de tipos y perfiles.

# Hipótesis

- Un **constructo** con filo/punzante resistente y contundente vulnerable cambia
  de forma clara el tiempo para matar según se lleve espada o martillo.
- Un **no muerto** resistente a contundente/punzante y vulnerable a filo/mágico
  hace que el orden de ataque y la elección de arma importen.
- Un **humanoide normal** sirve de referencia y evita que todos los enemigos
  tengan una identidad extrema.
- Una **espada electrizada** o una **daga arcana** son útiles para un héroe sin
  magia, pero no superan a un arma física bien elegida contra un objetivo normal.
- Las bandas extremas no deben producir una mayoría de golpes de 1: si «muy
  resistente» convierte el combate en una resta de 1, el perfil es demasiado
  duro o la banda debe reservarse a muy pocos enemigos.

# Opciones

| Variante | Perfiles | Tradeoff |
|---|---|---|
| A · Suaves | Pocas bandas distintas de normal; identidades sutiles. | Más fácil de balancear y de leer; los enemigos se parecen más. |
| B · Medios | La tabla v1 de `REQ-029`: una o dos desviaciones por familia. | Punto de partida del corte; busca identidad sin exagerar. |
| C · Fuertes | Más vulnerables/resistentes por familia, con «muy resistente» frecuente. | Identidad muy marcada; riesgo de near-immunity y de que un arma sea obligatoria. |

Variantes de armas:

| Variante | Contenido | Tradeoff |
|---|---|---|
| Base | Espada, hacha, daga y cuchillo. | Solo tipos físicos; no prueba mágico/eléctrico. |
| Con encantadas | Añade martillo, espada electrizada y daga arcana. | Prueba los cinco tipos y el caso filo + eléctrico. |
| Solo físicas + martillo | Añade la martillo, sin encantadas. | Aísla el efecto de contundente antes de introducir elementos. |

# Cómo usarlo

1. `pnpm run dev` y abrir
   `http://127.0.0.1:5173/experiments/EXP-005-mesa-tipos-dano/` cuando esté
   construido.
2. Elegir `profileSet` (suave, media, fuerte), `weaponSet` y `enemySet`.
3. Mantener semilla 1017 y 1.000 duelos por emparejamiento.
4. Comparar, para cada héroe, el TTK y el win % contra humanoide, constructo y no
   muerto con espada, martillo y arma encantada.
5. Revisar el desglose por paquete: cuánto daño aporta cada tipo y cuántos golpes
   quedan en 1 por banda.
6. Exportar la configuración y registrar la decisión.

# Métricas

- Win % del héroe por enemigo y arma, con la banda de referencia de `EXP-003`.
- TTK en impactos y en turnos, separando daño físico y elemental.
- Daño medio por paquete y porcentaje del daño reducido por banda y por armadura.
- Porcentaje de impactos con daño total 1 (indicador de near-immunity).
- Número de paquetes por ataque y dados consumidos.
- Notas de legibilidad: ¿se entiende por qué la martillo va mejor contra el constructo?
  ¿Se distingue el daño mágico del nivel de magia?

# Observaciones

Rellenar después del playtest.

# Decisión

- Opción: cancelado por el momento.
- Motivo: los valores estimados de `REQ-029` bastan para probar; no se hace un
  ajuste para pocos personajes antes del ajuste final. El ajuste fino se hará con
  roster y bestiario completos, mediante un mecanismo iterable de fortalezas y
  debilidades que se diseñará en el futuro.
- Fecha: 2026-11-12.
- Decidido por: human:simon.

# Siguientes pasos

- No se construye por el momento.
- Retomarlo solo si el ajuste fino final necesita esta mesa concreta.
- Mantener `REQ-029` con valores estimados y el ajuste futuro documentado.
