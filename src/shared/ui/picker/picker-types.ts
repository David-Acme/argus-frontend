export type FieldTime = {
  value: number | null;
  fallback: number;
  onChange: (minutes: number) => void;
};

export type DateFieldProps = {
  label: string;
  value: number | null;
  now: number;
  onChange: (day: number) => void;
  min?: number;
  quick?: boolean;
  onClear?: () => void;
  time?: FieldTime;
  testID?: string;
};

export type TimeFieldProps = {
  label: string;
  value: number | null;
  fallback: number;
  onChange: (minutes: number) => void;
  step?: number;
  onClear?: () => void;
  testID?: string;
};
