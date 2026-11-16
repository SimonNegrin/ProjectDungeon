import { describe, expect, it } from 'vitest';
import {
  ALWAYS_ALLOWED,
  SCOPE_ROOTS,
  TYPE_SCOPE,
  allowedFor,
  isInScope,
  normalizeScope,
  resolveScope,
  sameScope,
  unknownScopeEntries,
} from '../../scripts/lib/scope.mjs';

describe('resolveScope', () => {
  it('docs sin scope declarado hereda docs/ y scripts/, no tests/', () => {
    const scope = resolveScope({ task_type: 'docs' });

    expect(scope).toContain('docs/');
    expect(scope).toContain('scripts/');
    expect(scope).not.toContain('tests/');
  });

  it('un tipo de código puede declarar tests/ y docs/ a la vez (TASK-0163)', () => {
    const scope = resolveScope({ task_type: 'test', scope: ['tests/', 'docs/'] });

    expect(scope).toHaveLength(2);
    expect([...scope].sort()).toEqual(['docs/', 'tests/']);
  });

  it('feature cubre src/, tests/ e index.html, sin docs/', () => {
    const scope = resolveScope({ task_type: 'feature' });

    expect(scope).toContain('src/');
    expect(scope).toContain('tests/');
    expect(scope).toContain('index.html');
    expect(scope).not.toContain('docs/');
  });

  it('un task_type desconocido cae en el alcance de código', () => {
    const scope = resolveScope({ task_type: 'tipo-que-no-existe' });

    expect(scope).toEqual([...TYPE_SCOPE.feature]);
    expect(scope).toContain('src/');
  });
});

describe('normalizeScope', () => {
  it('trata ausencia, null y cadenas en blanco como sin declarar', () => {
    for (const value of [undefined, null, '', '   ']) {
      expect(normalizeScope(value)).toBeNull();
    }
  });

  it('normaliza una cadena suelta y conserva la lista vacía como declarada', () => {
    expect(normalizeScope('docs/')).toEqual(['docs/']);
    expect(normalizeScope([])).toEqual([]);
  });

  it('recorta espacios y descarta entradas vacías', () => {
    expect(normalizeScope([' docs/ ', ''])).toEqual(['docs/']);
  });
});

describe('unknownScopeEntries', () => {
  it('devuelve las entradas fuera del catálogo cerrado', () => {
    expect(unknownScopeEntries(['src/', '.github/'])).toEqual(['.github/']);
  });

  it('sin scope declarado no hay entradas desconocidas', () => {
    expect(unknownScopeEntries(null)).toEqual([]);
  });
});

describe('SCOPE_ROOTS', () => {
  it('no tiene duplicados y está ordenado', () => {
    expect(SCOPE_ROOTS).toEqual([...new Set(SCOPE_ROOTS)].sort());
  });

  it('contiene todas las entradas de cada lista de TYPE_SCOPE', () => {
    const entries = Object.values(TYPE_SCOPE).flat();

    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(SCOPE_ROOTS).toContain(entry);
    }
  });
});

describe('allowedFor', () => {
  const task = { task_type: 'test', scope: ['tests/', 'docs/'] };
  const taskRel = 'docs/tasks/TASK-0001-x.md';

  it('incluye la ficha propia, la evidencia y el alcance declarado', () => {
    const allowed = allowedFor(task, taskRel);

    expect(allowed).toContain(taskRel);
    expect(allowed).toContain('artifacts/');
    expect(allowed).toContain('docs/tasks/index.md');
    expect(allowed).toContain('tests/');
    expect(allowed).toContain('docs/');
    for (const entry of ALWAYS_ALLOWED) {
      expect(allowed).toContain(entry);
    }
  });

  it('sin taskRel no incluye la ficha de la tarea', () => {
    expect(allowedFor(task)).not.toContain(taskRel);
  });
});

describe('sameScope', () => {
  it('ignora el orden de las entradas', () => {
    expect(sameScope(['a/', 'b/'], ['b/', 'a/'])).toBe(true);
  });

  it('distingue un scope declarado vacío de la ausencia de scope', () => {
    expect(sameScope(null, [])).toBe(false);
  });

  it('sin scope en ambos lados son iguales', () => {
    expect(sameScope(null, null)).toBe(true);
  });
});

describe('isInScope', () => {
  it('una raíz con / final incluye su contenido', () => {
    expect(isInScope('src/a.ts', ['src/'])).toBe(true);
    expect(isInScope('srcx/a.ts', ['src/'])).toBe(false);
  });

  it('una entrada sin / final exige coincidencia exacta', () => {
    expect(isInScope('package.json', ['package.json'])).toBe(true);
    expect(isInScope('sub/package.json', ['package.json'])).toBe(false);
  });
});
