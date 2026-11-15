---
type: Docs Proposal
title: "TASK-0143: propuesta de alcance para requirements-writer"
description: Cambios mínimos en docs/scope.md para reflejar REQ-034 sin cambiar reglas.
status: stable
task: TASK-0143
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T19:20:00Z }
---

# Motivo

`docs/scope.md` no está en la allowlist de `task-lead` (ADR-016); la propiedad
del alcance es de `requirements-writer`. El criterio 4 de TASK-0143 lo exige, así
que el lead no puede cerrarlo. Esta propuesta refleja REQ-034 v1 tal como está
implementado; no cambia reglas.

# Cambios propuestos

## 1. Alcance vigente

Después del párrafo que empieza «El dungeon crawler con teclado mantiene…»,
añadir:

> El botín de enemigos de `REQ-034` está implementado: un enemigo solo deja
> cadáver si al menos uno de sus objetos es saqueable, el cadáver se saquea
> desde el mismo tile sin coste y el guardado conserva la tirada sin repetirla.
> Las llaves y los objetos de progresión quedan reservados a su propia hoja.

## 2. Fase

Añadir al final de la tabla de fases:

```markdown
| 1.16 | Botín de enemigos y cadáver condicionado (REQ-034) | Implementada; `lootable` por instancia, 25 %/100 %, cadáver como contenedor, saqueo en el mismo tile sin coste, retirada al vaciar y guardado sin retirada; TASK-0130 a TASK-0138 y QA TASK-0142. Llaves y progresión reservadas |
```

## 3. Estado de requisitos

Añadir un guion después del bloque de tipos de daño:

```markdown
- Botín de enemigos: `REQ-034` está implementada en TASK-0130 a TASK-0138 y
  verificada en TASK-0142; el cadáver de enemigo solo existe con botín y el
  saqueo no gasta acción ni MP. `REQ-020` sigue en borrador para los cofres.
```

## 4. Decisiones confirmadas

Añadir después del guion de la resurrección:

```markdown
- Un enemigo solo deja cadáver si al menos uno de sus objetos es saqueable. La
  saqueabilidad se decide por instancia al crear al enemigo (25 % común, 100 %
  progresión) con un RNG derivado que no consume el principal; el cadáver se
  saquea desde el mismo tile sin coste (0 acción y 0 MP; el fantasma paga una
  acción por objeto) y se retira al vaciarse. El cadáver de jugador conserva
  todo su equipo y persiste. Cargar no vuelve a tirar. Las llaves y objetos de
  progresión se reservan para su hoja.
```

## 5. Fuera de alcance ahora

Sustituir el guion final «Saqueo de cadáveres: definido como objetivo de la
muerte jugable, sin implementar.» por:

```markdown
- Llaves, puertas cerradas, cofres cerrados y objetos de progresión: solo se
  reserva la regla de que los objetos necesarios para avanzar son siempre
  saqueables; su catálogo, su contenido y su hoja quedan fuera de este corte.
  Los cofres jugables siguen pendientes de `REQ-020`.
```

# Evidencia

- Requisito aprobado:
  [REQ-034](../../../docs/requirements/REQ-034-objetos-saqueables-botin-enemigos.md).
- Modelo implementado:
  [ADR-030](../../../docs/decisions/ADR-030-saqueabilidad-botin-enemigos.md).
- Verificación: `artifacts/TASK-0143/attempt-1/verify-output.txt`.
