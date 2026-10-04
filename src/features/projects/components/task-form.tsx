import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';
import type {
  IProjectTaskCacheRow,
  IProjectTaskCreate,
  IProjectTaskUpdate,
} from '@/core/interfaces';
import { projectTaskService } from '@/core/services/project-task.service';
import type { ProjectTaskPriority, ProjectTaskStatus } from '@/core/types';
import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';
import { AdaptiveSelect } from '@/shared/components/ui/adaptive-select';
import { Button } from '@/shared/components/ui/button';
import { Form, FormField, FormItem, FormLabel, FormMessage, useFormScroll } from '@/shared/components/ui/form';
import { FormScrollView } from '@/shared/components/ui/form-scroll-view';
import { FormTextField } from '@/shared/components/ui/form-text-field';
import { SelectField } from '@/shared/components/ui/select-field';
import { Text } from '@/shared/components/ui/text';
import { useFormSubmit } from '@/shared/hooks/use-form-submit';
import { useOverlayBodyHeight } from '@/shared/hooks/use-overlay-body-height';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { runOptimistic } from '@/shared/libs/optimistic-action';
import { useTaskLabels } from '@/features/projects/hooks/use-task-labels';
import { DayPickerField } from '@/features/agenda';

type TaskFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  task?: IProjectTaskCacheRow | null;
  defaultStatus?: ProjectTaskStatus;
};

const schema = z.object({
  title: z.string().trim().min(1, 'common.validation.required').max(160, 'common.validation.too-long'),
  status: z.enum(['backlog', 'todo', 'doing', 'done', 'canceled']),
  priority: z.enum(['none', 'low', 'medium', 'high', 'urgent']),
  dueAt: z.number().nullable(),
});

type TaskValues = z.infer<typeof schema>;

const dueSeconds = (values: TaskValues): number | undefined =>
  values.dueAt == null ? undefined : Math.round(values.dueAt / 1000);

const createBody = (values: TaskValues, projectId: string): IProjectTaskCreate => ({
  projectId: Number(projectId),
  title: values.title,
  status: values.status,
  priority: values.priority,
  dueAt: dueSeconds(values),
});

const updateBody = (values: TaskValues, saved: IProjectTaskCacheRow): IProjectTaskUpdate => ({
  title: values.title,
  status: values.status,
  priority: values.priority,
  dueAt: dueSeconds(values) ?? (saved.dueAt == null ? undefined : null),
});

export function TaskForm({ open, onOpenChange, projectId, task, defaultStatus = 'todo' }: TaskFormProps) {
  const { t } = useTranslation();
  const { statusOptions, priorityOptions } = useTaskLabels();
  const date = useDateFormatter();
  const formScroll = useFormScroll();
  const bodyHeight = useOverlayBodyHeight();

  const form = useForm<TaskValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', status: 'todo', priority: 'none', dueAt: null },
    mode: 'onBlur',
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      title: task?.title ?? '',
      status: (task?.status as ProjectTaskStatus) ?? defaultStatus,
      priority: (task?.priority as ProjectTaskPriority) ?? 'none',
      dueAt: task?.dueAt ?? null,
    });
  }, [open, task, form, defaultStatus]);

  const { submitting, submit } = useFormSubmit({
    form,
    formScroll,
    request: (values, idempotencyKey) =>
      task
        ? projectTaskService.update(task.id, updateBody(values, task))
        : projectTaskService.create(createBody(values, projectId), idempotencyKey),
    optimistic: (values) => ({
      intents: [
        task
          ? { table: 'project_task', kind: 'update', recordId: task.id, values: updateBody(values, task) }
          : { table: 'project_task', kind: 'create', values: createBody(values, projectId) },
      ],
      success: t('screens.projects.task-saved'),
    }),
    onSuccess: () => onOpenChange(false),
  });

  const remove = () => {
    if (!task) return;
    onOpenChange(false);
    void runOptimistic({
      intents: [{ table: 'project_task', kind: 'delete', recordId: task.id }],
      call: () => projectTaskService.remove(task.id),
      undo: { title: t('screens.projects.task-removed'), description: task.title },
    });
  };

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={onOpenChange}
      onSubmit={submitting ? undefined : () => void submit()}
      title={task ? t('common.edit') : t('screens.projects.new-task')}
      closeLabel={t('common.close')}
      footer={
        <>
          {task ? (
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
              name="title"
              label={t('screens.projects.task-title')}
              placeholder={t('screens.projects.task-title-placeholder')}
              returnKeyType="done"
              onSubmitEditing={submit}
            />

            <FormField
              control={form.control}
              name="dueAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('screens.projects.task-due')}</FormLabel>
                  <DayPickerField
                    value={field.value == null ? null : new Date(field.value)}
                    placeholder={t('screens.projects.task-due-none')}
                    onChange={(day) => field.onChange(date.startOfDay(day).getTime())}
                    onClear={() => field.onChange(null)}
                  />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('screens.projects.task-status')}</FormLabel>
                  <AdaptiveSelect
                    options={statusOptions}
                    value={field.value}
                    onChange={field.onChange}
                    title={t('screens.projects.task-status')}
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

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('screens.projects.task-priority')}</FormLabel>
                  <AdaptiveSelect
                    options={priorityOptions}
                    value={field.value}
                    onChange={field.onChange}
                    title={t('screens.projects.task-priority')}
                    closeLabel={t('common.close')}
                    searchPlaceholder={t('screens.home.search-placeholder')}
                    emptyLabel={t('screens.projects.no-results')}
                    trigger={
                      <SelectField
                        label={priorityOptions.find((option) => option.value === field.value)?.label}
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
