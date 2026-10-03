import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';
import { cameraControlService } from '@/core/services/camera-control.service';
import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';
import { Button } from '@/shared/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  useFormScroll,
} from '@/shared/components/ui/form';
import { FormScrollView } from '@/shared/components/ui/form-scroll-view';
import { Textarea } from '@/shared/components/ui/textarea';
import { Text } from '@/shared/components/ui/text';
import { useFormSubmit } from '@/shared/hooks/use-form-submit';
import { useOverlayBodyHeight } from '@/shared/hooks/use-overlay-body-height';
import { useTranslation } from '@/shared/hooks/use-translation';
import { toast } from '@/shared/libs/toast';

type CameraTalkSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cameraId: string;
};

const schema = z.object({
  text: z.string().trim().min(1, 'common.validation.required').max(300, 'common.validation.too-long'),
});

type TalkValues = z.infer<typeof schema>;

export function CameraTalkSheet({ open, onOpenChange, cameraId }: CameraTalkSheetProps) {
  const { t, language } = useTranslation();
  const formScroll = useFormScroll();
  const bodyHeight = useOverlayBodyHeight();

  const form = useForm<TalkValues>({
    resolver: zodResolver(schema),
    defaultValues: { text: '' },
    mode: 'onBlur',
  });

  useEffect(() => {
    if (open) form.reset({ text: '' });
  }, [open, form]);

  const { submitting, submit } = useFormSubmit({
    form,
    formScroll,
    request: (values) => cameraControlService.talk(cameraId, { text: values.text, lang: language }),
    onSuccess: () => {
      toast.success(t('screens.cameras.talk-sent'));
      onOpenChange(false);
    },
  });

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('screens.cameras.talk-title')}
      closeLabel={t('common.close')}
      footer={
        <>
          <Button variant="outline" onPress={() => onOpenChange(false)} disabled={submitting}>
            <Text>{t('common.cancel')}</Text>
          </Button>
          <Button onPress={submit} disabled={submitting}>
            <Text>{submitting ? t('common.saving') : t('screens.cameras.talk-send')}</Text>
          </Button>
        </>
      }>
      <FormScrollView formScroll={formScroll} maxHeight={bodyHeight}>
        <Form {...form}>
          <View className="pb-1">
            <FormField
              control={form.control}
              name="text"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder={t('screens.cameras.talk-placeholder')}
                      numberOfLines={3}
                      {...field}
                      onChangeText={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </View>
        </Form>
      </FormScrollView>
    </AdaptiveDialog>
  );
}
