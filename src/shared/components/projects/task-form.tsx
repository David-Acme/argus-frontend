import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';
import type { IProjectTaskCacheRow } from '@/core/interfaces';
import { projectTaskService } from '@/core/services/project-task.service';
import type { MenuOption, ProjectTaskPriority, ProjectTaskStatus } from '@/core/types';
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
import { Input } from '@/shared/components/ui/input';
import { SelectField } from '@/shared/components/ui/select-field';
import { Text } from '@/shared/components/ui/text';
import { useFormSubmit } from '@/shared/hooks/use-form-submit';
import { useOverlayBodyHeight } from '@/shared/hooks/use-overlay-body-height';
import { useTranslation } from '@/shared/hooks/use-translation';
import { confirm } from '@/shared/libs/confirm';
import { toast } from '@/shared/libs/toast';
import { toastServiceError } from '@/shared/libs/service-error';

type TaskFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Parent project; the task cannot exist without one. */
  projectId: string;
  task?: IProjectTaskCacheRow | null;
};

const schema = z.object({
  title: z.string().trim().min(1, 'common.validation.required').max(160, 'common.validation.too-long'),
  status: z.enum(['backlog', 'todo', 'doing', 'done', 'canceled']),
  priority: z.enum(['none', 'low', 'medium', 'high', 'urgent']),
});

type TaskValues = z.infer<typeof schema>;

export function TaskForm({ open, onOpenChange, projectId, task }: TaskFormProps) {
  const { t } = useTranslation();
  const formScroll = useFormScroll();
  const bodyHeight = useOverlayBodyHeight();

  const form = useForm<TaskValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', status: 'todo', priority: 'none' },
    mode: 'onBlur',
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      title: task?.title ?? '',
      status: (task?.status as ProjectTaskStatus) ?? 'todo',
      priority: (task?.priority as ProjectTaskPriority) ?? 'none',
    });
  }, [open, task, form]);

  const statusOptions = useMemo<MenuOption<ProjectTaskStatus>[]>(
    () => [
      { value: 'backlog', label: t('screens.projects.status-backlog') },
      { value: 'todo', label: t('screens.projects.status-todo') },
      { value: 'doing', label: t('screens.projects.status-doing') },
      { value: 'done', label: t('screens.projects.status-done') },
      { value: 'canceled', label: t('screens.projects.status-canceled') },
    ],
    [t]
  );

  const priorityOptions = useMemo<MenuOption<ProjectTaskPriority>[]>(
    () => [
      { value: 'none', label: t('screens.projects.priority-none') },
      { value: 'low', label: t('screens.projects.priority-low') },
      { value: 'medium', label: t('screens.projects.priority-medium') },
      { value: 'high', label: t('screens.projects.priority-high') },
      { value: 'urgent', label: t('screens.projects.priority-urgent') },
    ],
    [t]
  );

  const { submitting, submit } = useFormSubmit({
    form,
    formScroll,
    request: (values) => {
      const body = { title: values.title, status: values.status, priority: values.priority };
      return task
        ? projectTaskService.update(task.id, body)
        : projectTaskService.create({ ...body, projectId: Number(projectId) });
    },
    onSuccess: () => {
      toast.success(t('screens.projects.task-saved'));
      onOpenChange(false);
    },
  });

  const remove = async () => {
    if (!task) return;
    if (
      !(await confirm({
        title: t('screens.projects.delete-task-title', { name: task.title }),
        description: t('screens.projects.delete-task-body'),
        confirmLabel: t('common.confirm-delete'),
        intent: 'danger',
      }))
    )
      return;

    const result = await projectTaskService.remove(task.id);
    if (!result.ok) {
      toastServiceError(result.errors);
      return;
    }
    toast.success(t('screens.projects.task-removed'));
    onOpenChange(false);
  };

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={onOpenChange}
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
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('screens.projects.task-title')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('screens.projects.task-title-placeholder')}
                      {...field}
                      onChangeText={field.onChange}
                    />
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
