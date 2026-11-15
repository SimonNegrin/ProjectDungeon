import { describe, expect, it } from 'vitest';
import { DEFAULT_MAP_SEED } from '../../../src/game/map';
import { createStartScreen, type StartScreen } from '../../../src/host/start-screen';

const UINT32_MAX = 0xffff_ffff;

/** Muestras de `random` en orden; si se agotan, repite la última. */
function sequence(values: readonly number[]): () => number {
  let index = 0;
  return () => {
    const value = values[Math.min(index, values.length - 1)];
    index += 1;
    return value;
  };
}

function openWith(search: string, samples: readonly number[] = [0.25, 0.5]): StartScreen {
  const screen = createStartScreen({ search, random: sequence(samples) });
  return screen;
}

describe('pantalla de inicio: menú y defaults', () => {
  it('arranca en el menú con N=1 y sin configuración', () => {
    const screen = openWith('');

    expect(screen.state()).toMatchObject({
      step: 'menu',
      playerCount: 1,
      seedText: '',
      error: null,
      errorField: null,
      notice: null,
    });
  });

  it('al entrar al paso 1 genera una semilla aleatoria y deja N=1', () => {
    const screen = openWith('', [0.25, 0.5]);

    screen.openStepOne();

    // 0.5 × 2^32 = 2147483648; la primera muestra se consumió al construir.
    expect(screen.state()).toMatchObject({
      step: 'step1',
      playerCount: 1,
      seedText: '2147483648',
      error: null,
    });
  });

  it('Esc en el menú no cambia el estado', () => {
    const screen = openWith('');

    screen.escape();
    const first = screen.state();
    screen.escape();

    expect(screen.state()).toEqual(first);
    expect(first.step).toBe('menu');
  });

  it('continuar desde el menú no emite configuración', () => {
    expect(openWith('').continueStepOne()).toBeNull();
  });
});

describe('pantalla de inicio: ?seed', () => {
  it('precarga una semilla válida una sola vez y sigue siendo editable', () => {
    const screen = openWith('?seed=42');
    screen.openStepOne();
    expect(screen.state().seedText).toBe('42');

    screen.setSeedText('99');
    expect(screen.state().seedText).toBe('99');

    screen.requestCancel();
    screen.confirmCancel();
    screen.openStepOne();
    // La precarga ya se consumió: la segunda entrada genera otra semilla.
    expect(screen.state().seedText).not.toBe('42');
    expect(screen.state().seedText).not.toBe('99');
  });

  it('ignora un ?seed inválido con aviso y genera una semilla', () => {
    const screen = openWith('?seed=abc', [0.25, 0.5]);
    const state = screen.state();

    expect(state.notice).toContain('inválida');
    expect(state.notice).toContain('abc');
    screen.openStepOne();
    expect(screen.state().seedText).toBe('2147483648');
  });

  it('sin ?seed no recupera la semilla por defecto ni la configuración previa', () => {
    const screen = openWith('', [0.75, 0.25]);
    screen.openStepOne();
    screen.setPlayerCount(6);
    screen.setSeedText('123');

    screen.requestCancel();
    screen.confirmCancel();

    expect(screen.state()).toMatchObject({
      step: 'menu',
      playerCount: 1,
      seedText: '',
    });
    screen.openStepOne();
    expect(screen.state().playerCount).toBe(1);
    expect(screen.state().seedText).not.toBe('123');
    expect(screen.state().seedText).not.toBe(String(DEFAULT_MAP_SEED));
  });
});

describe('pantalla de inicio: semilla del paso 1', () => {
  it('acepta un entero con signo y normaliza a 32 bits sin signo', () => {
    const screen = openWith('?seed=42');
    screen.openStepOne();

    screen.setSeedText('+7');
    expect(screen.continueStepOne()).toEqual({ playerCount: 1, seed: 7 });
    expect(screen.state().seedText).toBe('7');

    screen.setSeedText('-1');
    expect(screen.continueStepOne()).toEqual({ playerCount: 1, seed: UINT32_MAX });
    expect(screen.state().seedText).toBe(String(UINT32_MAX));

    screen.setSeedText('4294967296');
    expect(screen.continueStepOne()).toEqual({ playerCount: 1, seed: 0 });
  });

  it.each(['abc', '1.5', '1e9', ' 5', '5 ', '0x10', '1,5'])(
    'bloquea el avance con la semilla inválida %j',
    (value) => {
      const screen = openWith('?seed=42');
      screen.openStepOne();

      screen.setSeedText(value);

      expect(screen.continueStepOne()).toBeNull();
      expect(screen.state().step).toBe('step1');
      expect(screen.state().error).toContain('inválida');
      expect(screen.state().error).toContain(value);
      expect(screen.state().errorField).toBe('seed');
    },
  );

  it('un campo vacío genera otra semilla, la escribe y avanza con ella', () => {
    const screen = openWith('?seed=42', [0.25]);
    screen.openStepOne();
    const previous = screen.state().seedText;

    screen.setSeedText('');
    const config = screen.continueStepOne();

    expect(config).not.toBeNull();
    expect(config!.seed).toBe(1073741824);
    expect(screen.state().seedText).toBe('1073741824');
    expect(screen.state().seedText).not.toBe(previous);
    expect(screen.state().error).toBeNull();
  });

  it('editar la semilla limpia su error', () => {
    const screen = openWith('?seed=42');
    screen.openStepOne();
    screen.setSeedText('no');
    expect(screen.continueStepOne()).toBeNull();

    screen.setSeedText('5');

    expect(screen.state().error).toBeNull();
    expect(screen.state().errorField).toBeNull();
  });
});

describe('pantalla de inicio: número de jugadores', () => {
  it('acepta N=1 y N=6 y los emite junto a la semilla', () => {
    const screen = openWith('?seed=42');
    screen.openStepOne();

    screen.setPlayerCount(1);
    expect(screen.continueStepOne()).toEqual({ playerCount: 1, seed: 42 });

    screen.setPlayerCount(6);
    expect(screen.continueStepOne()).toEqual({ playerCount: 6, seed: 42 });
  });

  it.each([0, 7, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rechaza N=%s y conserva el valor anterior',
    (value) => {
      const screen = openWith('?seed=42');
      screen.openStepOne();
      screen.setPlayerCount(6);

      screen.setPlayerCount(value);

      expect(screen.state().playerCount).toBe(6);
      expect(screen.state().error).toContain('entre 1 y 6');
      expect(screen.state().errorField).toBe('players');
    },
  );

  it('elegir un N válido limpia el error de jugadores', () => {
    const screen = openWith('?seed=42');
    screen.openStepOne();
    screen.setPlayerCount(9);

    screen.setPlayerCount(3);

    expect(screen.state().playerCount).toBe(3);
    expect(screen.state().error).toBeNull();
  });
});

describe('pantalla de inicio: cancelación', () => {
  it('pedir cancelar abre la confirmación; desistir no cambia nada', () => {
    const screen = openWith('?seed=42');
    screen.openStepOne();
    screen.setPlayerCount(4);
    screen.setSeedText('77');

    screen.requestCancel();
    expect(screen.state().step).toBe('confirm-cancel');

    screen.dismissCancel();
    expect(screen.state()).toMatchObject({
      step: 'step1',
      playerCount: 4,
      seedText: '77',
    });
  });

  it('confirmar descarta la configuración y vuelve al menú', () => {
    const screen = openWith('?seed=42');
    screen.openStepOne();
    screen.setPlayerCount(6);
    screen.setSeedText('77');
    screen.requestCancel();

    screen.confirmCancel();

    expect(screen.state()).toMatchObject({
      step: 'menu',
      playerCount: 1,
      seedText: '',
      error: null,
    });
  });

  it('tras confirmar, volver a entrar parte de N=1 y semilla nueva', () => {
    const screen = openWith('?seed=42', [0.25]);
    screen.openStepOne();
    screen.setPlayerCount(6);
    screen.setSeedText('77');
    screen.requestCancel();
    screen.confirmCancel();

    screen.openStepOne();

    expect(screen.state().playerCount).toBe(1);
    expect(screen.state().seedText).toBe('1073741824');
    expect(screen.continueStepOne()).toEqual({
      playerCount: 1,
      seed: 1073741824,
    });
  });

  it('solo se pide cancelar desde el paso 1', () => {
    const screen = openWith('');

    screen.requestCancel();
    expect(screen.state().step).toBe('menu');

    screen.openStepOne();
    screen.requestCancel();
    screen.confirmCancel();
    screen.confirmCancel();
    expect(screen.state().step).toBe('menu');
  });

  it('Esc cancela con confirmación en el paso 1 y cierra el aviso sin cancelar', () => {
    const screen = openWith('?seed=42');
    screen.openStepOne();
    screen.setSeedText('12');

    screen.escape();
    expect(screen.state().step).toBe('confirm-cancel');

    screen.escape();
    expect(screen.state()).toMatchObject({ step: 'step1', seedText: '12' });

    screen.escape();
    screen.confirmCancel();
    expect(screen.state().step).toBe('menu');
  });
});
