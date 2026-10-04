import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';
import type { IProjectCacheRow, IProjectCreate } from '@/core/interfaces';
import { projectService } from '@/core/services/project.service';
import type { ProjectStatus } from '@/core/types';
import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';
import { AdaptiveSelect } from '@/shared/components/ui/adaptive-select';
import { Button } from '@/shared/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormScroll,
} from '@/shared/components/ui/form';
import { FormScrollView } from '@/shared/components/ui/form-scroll-view';
import { FormTextField } from '@/shared/components/ui/form-text-field';
import { SelectField } from '@/shared/components/ui/select-field';
import { Text } from '@/shared/components/ui/text';
import { Textarea } from '@/shared/components/ui/textarea';
import { useFormSubmit } from '@/shared/hooks/use-form-submit';
import { useOverlayBodyHeight } from '@/shared/hooks/use-overlay-body-height';
import { useTranslation } from '@/shared/hooks/use-translation';
import { confirm } from '@/shared/libs/confirm';
import { runOptimistic } from '@/shared/libs/optimistic-action';
import { useTaskLabels } from '@/features/projects/hooks/use-task-labels';

type ProjectFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: IProjectCacheRow | null;
};

const schema = z.object({
  name: z.string().trim().min(1, 'common.validation.required').max(120, 'common.validation.too-long'),
  description: z.string().trim().max(500, 'common.validation.too-long'),
  status: z.enum(['planned', 'active', 'paused', 'done', 'canceled']),
});

type ProjectValues = z.infer<typeof schema>;

const projectBody = (values: ProjectValues): IProjectCreate => ({
  name: values.name,
  description: values.description || undefined,
  status: values.status,
});

export function ProjectForm({ open, onOpenChange, project }: ProjectFormProps) {
  const { t } = useTranslation();
  const { projectStatusOptions: statusOptions } = useTaskLabels();
  const formScroll = useFormScroll();
  const bodyHeight = useOverlayBodyHeight();

  const form = useForm<ProjectValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '', status: 'active' },
    mode: 'onBlur',
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      name: project?.name ?? '',
      description: project?.description ?? '',
      status: (project?.status as ProjectStatus) ?? 'active',
    });
  }, [open, project, form]);

  const { submitting, submit } = useFormSubmit({
    form,
    formScroll,
    request: (values, idempotencyKey) =>
      project
        ? projectService.update(project.id, projectBody(values))
        : projectService.create(projectBody(values), idempotencyKey),
    optimistic: (values) => ({
      intents: [
        project
          ? { table: 'project', kind: 'update', recordId: project.id, values: projectBody(values) }
          : { table: 'project', kind: 'create', values: projectBody(values) },
      ],
      success: t('screens.projects.project-saved'),
    }),
    onSuccess: () => onOpenChange(false),
  });

  const remove = async () => {
    if (!project) return;
    const accepted = await confirm({
      title: t('screens.projects.delete-project-title', { name: project.name }),
      description: t('screens.projects.delete-project-body'),
      confirmLabel: t('common.confirm-delete'),
      intent: 'danger',
    });
    if (!accepted) return;
    onOpenChange(false);
    await runOptimistic({
      intents: [{ table: 'project', kind: 'delete', recordId: project.id }],
      call: () => projectService.remove(project.id),
      success: t('screens.projects.project-removed'),
    });
  };

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={project ? t('common.edit') : t('screens.projects.new-project')}
      closeLabel={t('common.close')}
      footer={
        <>
          {project ? (
            <Button variant="ghost" onPress={remove} disabled={submitting}>
              <Text className="text-error-strong">{t('common.delete')}</Text>
            </Button>
          ) : null}
          <Button variant="outline" onPress={() => onOpenChange(false)} disabled={submitting}>
            <Text>{t('common.cancel')}</Text>
          </Button>
          <Button onPress={submit} disabled={submitting}>
            <Text>{submitting ? t('common.saving') : t('common.save')}</Text>
          </Button>
        </>
      }>
      <FormScrollView formScroll={formScroll} maxHeight={bodyHeight}>
        <Form {...form}>
          <View className="gap-3.5 pb-1">
            <FormTextField
              control={form.control}
              name="name"
              label={t('screens.projects.project-name')}
              placeholder={t('screens.projects.project-name-placeholder')}
              returnKeyType="done"
              onSubmitEditing={submit}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('screens.projects.project-description')}</FormLabel>
                  <FormControl>
                    <Textarea numberOfLines={3} {...field} onChangeText={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('screens.projects.project-status')}</FormLabel>
                  <AdaptiveSelect
                    options={statusOptions}
                    value={field.value}
                    onChange={field.onChange}
                    title={t('screens.projects.project-status')}
                    closeLabel={t('common.close')}
                    searchPlaceholder={t('screens.home.search-placeholder')}
                    emptyLabel={t('screens.projects.no-results')}
                    trigger={
                      <SelectField
                        label={statusOptions.find((option) => option.value === field.value)?.label}
                      />
                    }
                  />
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
