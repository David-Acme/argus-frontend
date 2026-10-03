import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';
import type { IProjectCacheRow } from '@/core/interfaces';
import { projectService } from '@/core/services/project.service';
import type { MenuOption, ProjectStatus } from '@/core/types';
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
import { Textarea } from '@/shared/components/ui/textarea';
import { useFormSubmit } from '@/shared/hooks/use-form-submit';
import { useOverlayBodyHeight } from '@/shared/hooks/use-overlay-body-height';
import { useTranslation } from '@/shared/hooks/use-translation';
import { confirm } from '@/shared/libs/confirm';
import { toast } from '@/shared/libs/toast';
import { toastServiceError } from '@/shared/libs/service-error';

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

export function ProjectForm({ open, onOpenChange, project }: ProjectFormProps) {
  const { t } = useTranslation();
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

  const statusOptions = useMemo<MenuOption<ProjectStatus>[]>(
    () => [
      { value: 'planned', label: t('screens.projects.status-backlog') },
      { value: 'active', label: t('screens.projects.status-doing') },
      { value: 'paused', label: t('screens.projects.status-todo') },
      { value: 'done', label: t('screens.projects.status-done') },
      { value: 'canceled', label: t('screens.projects.status-canceled') },
    ],
    [t]
  );

  const { submitting, submit } = useFormSubmit({
    form,
    formScroll,
    request: (values) => {
      const body = {
        name: values.name,
        description: values.description || undefined,
        status: values.status,
      };
      return project ? projectService.update(project.id, body) : projectService.create(body);
    },
    onSuccess: () => {
      toast.success(t('screens.projects.project-saved'));
      onOpenChange(false);
    },
  });

  const remove = async () => {
    if (!project) return;
    if (
      !(await confirm({
        title: t('screens.projects.delete-project-title', { name: project.name }),
        description: t('screens.projects.delete-project-body'),
        confirmLabel: t('common.confirm-delete'),
        intent: 'danger',
      }))
    )
      return;

    const result = await projectService.remove(project.id);
    if (!result.ok) {
      toastServiceError(result.errors);
      return;
    }
    toast.success(t('screens.projects.project-removed'));
    onOpenChange(false);
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
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('screens.projects.project-name')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('screens.projects.project-name-placeholder')}
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
