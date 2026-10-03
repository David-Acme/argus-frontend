import { useState } from 'react';
import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';
import { Button } from '@/shared/components/ui/button';
import { Text } from '@/shared/components/ui/text';
import { HoursFields } from '@/features/security/components/hours-fields';
import { formatHours, parseHours, type HoursWindow } from '@/features/security/model/hours';
import { useTranslation } from '@/shared/hooks/use-translation';

type HoursEditorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  spec: string;
  onSave: (spec: string) => Promise<boolean>;
};

export function HoursEditor({ open, onOpenChange, title, description, spec, onSave }: HoursEditorProps) {
  const { t } = useTranslation();
  const [windows, setWindows] = useState<HoursWindow[]>(() => parseHours(spec));
  const [saving, setSaving] = useState(false);
  const invalid = windows.some((window) => window.start === window.end);

  const save = async () => {
    setSaving(true);
    const saved = await onSave(formatHours(windows));
    setSaving(false);
    if (saved) onOpenChange(false);
  };

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      closeLabel={t('common.close')}
      footer={
        <>
          <Button variant="outline" onPress={() => onOpenChange(false)} disabled={saving}>
            <Text>{t('common.cancel')}</Text>
          </Button>
          <Button onPress={save} loading={saving} disabled={invalid}>
            <Text>{t('common.save')}</Text>
          </Button>
        </>
      }>
      <HoursFields windows={windows} onChange={setWindows} />
    </AdaptiveDialog>
  );
}
