export type ButtonStateInput = {
  disabled: boolean;
  loading: boolean;
};

export type ButtonState = {
  accessibility: { busy?: true; disabled: boolean };
  disabled: boolean;
};

/** A request in flight is unavailable to prevent duplicate server mutations. */
export function getButtonState({ disabled, loading }: ButtonStateInput): ButtonState {
  const isDisabled = disabled || loading;

  return {
    accessibility: loading ? { busy: true, disabled: true } : { disabled: isDisabled },
    disabled: isDisabled,
  };
}
