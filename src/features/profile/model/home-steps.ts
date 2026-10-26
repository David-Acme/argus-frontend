export type HomeStepKey = 'invite' | 'camera';

export type HomeStepState = { applies: boolean; done: boolean };

export type HomeStepInput = Readonly<Record<HomeStepKey, HomeStepState>>;

export type HomeSteps = {
  pending: readonly HomeStepKey[];
  done: number;
  total: number;
  started: boolean;
};

const ORDER: readonly HomeStepKey[] = ['invite', 'camera'];

export function homeSteps(input: HomeStepInput): HomeSteps {
  const applying = ORDER.filter((key) => input[key].applies);
  const pending = applying.filter((key) => !input[key].done);
  const done = applying.length - pending.length;
  return { pending, done, total: applying.length, started: done > 0 };
}
