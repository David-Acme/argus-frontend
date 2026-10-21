import { useState } from 'react';
import { View } from 'react-native';
import { Choice, type ChoiceSheetProps } from '@/shared/ui/choice';
import { LabCase } from '../components/lab-case';
import { copy } from './demo-copy';

const MODES = [
  { value: 'home', label: copy.home, icon: 'home' },
  { value: 'night', label: copy.night, icon: 'moon' },
  { value: 'away', label: copy.away },
  { value: 'armed', label: copy.armed },
] as const;

const VIEWS = [
  { value: 'today', label: copy.todayTab },
  { value: 'calendar', label: copy.calendar },
  { value: 'projects', label: copy.projects },
] as const;

const KINDS = [
  { value: 'event', label: copy.event },
  { value: 'reminder', label: copy.reminder },
  { value: 'task', label: copy.task },
] as const;

const LANGUAGES = [
  { value: 'es', label: copy.spanish },
  { value: 'en', label: copy.english },
] as const;

const REPEATS = [
  { value: 'never', label: copy.noRepeat },
  { value: 'daily', label: copy.daily },
  { value: 'weekly', label: copy.weekly },
  { value: 'monthly', label: copy.monthly },
  { value: 'yearly', label: copy.yearly },
] as const;

const NOTICES = [
  { value: 'at', label: copy.atTime },
  { value: 'ten', label: copy.tenBefore },
  { value: 'thirty', label: copy.thirtyBefore },
  { value: 'hour', label: copy.hourBefore },
  { value: 'day', label: copy.dayBefore },
] as const;

const noop = () => undefined;

const inlineSheet = ({ open, children }: ChoiceSheetProps) =>
  open ? <View className="rounded-card bg-surface mt-2">{children}</View> : null;

const shownSheet = ({ children }: ChoiceSheetProps) => (
  <View className="rounded-card bg-surface mt-2">{children}</View>
);

export function ChoiceDemo() {
  const [mode, setMode] = useState<(typeof MODES)[number]['value']>('home');
  const [repeat, setRepeat] = useState<(typeof REPEATS)[number]['value']>('never');
  return (
    <>
      <LabCase id="mode-glass" block>
        <Choice
          label={copy.mode}
          options={MODES}
          value={mode}
          onChange={setMode}
          glass
          sheet={inlineSheet}
        />
      </LabCase>
      <LabCase id="views" block>
        <Choice
          label={copy.agendaView}
          options={VIEWS}
          value="today"
          onChange={noop}
          sheet={inlineSheet}
        />
      </LabCase>
      <LabCase id="kinds" block>
        <Choice
          label={copy.entryKind}
          options={KINDS}
          value="event"
          onChange={noop}
          sheet={inlineSheet}
        />
      </LabCase>
      <LabCase id="language-glass" block>
        <Choice
          label={copy.language}
          options={LANGUAGES}
          value="es"
          onChange={noop}
          glass
          sheet={inlineSheet}
        />
      </LabCase>
      <LabCase id="repeat-field" block>
        <Choice
          label={copy.repeat}
          look="field"
          options={REPEATS}
          value={repeat}
          onChange={setRepeat}
          sheet={inlineSheet}
        />
      </LabCase>
      <LabCase id="notice-row" block>
        <Choice
          label={copy.notify}
          options={NOTICES}
          value="thirty"
          onChange={noop}
          sheet={inlineSheet}
        />
      </LabCase>
      <LabCase id="list" block>
        <Choice
          label={copy.repeat}
          options={REPEATS}
          value="monthly"
          onChange={noop}
          sheet={shownSheet}
        />
      </LabCase>
    </>
  );
}
