import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Notice } from '@/shared/ui/notice';
import { Empty, type EmptyProps } from './empty';
import type { Resource } from './resource';
import { ShimmerProvider } from './shimmer';

export type ResourceCopy = {
  loading: string;
  retry: string;
  failed: { title: string; body?: string };
  stale: (age: string) => string;
  refused: (owner: string) => string;
};

export type ResourceViewProps<T> = {
  resource: Resource<T>;
  copy: ResourceCopy;
  skeleton: ReactNode;
  empty: EmptyProps;
  concern?: ReactNode;
  children: (data: T) => ReactNode;
};

export function ResourceView<T>({
  resource,
  copy,
  skeleton,
  empty,
  concern,
  children,
}: ResourceViewProps<T>) {
  switch (resource.status) {
    case 'loading':
      return (
        <View aria-busy aria-label={copy.loading}>
          <ShimmerProvider>{skeleton}</ShimmerProvider>
        </View>
      );
    case 'ready':
      return <>{children(resource.data)}</>;
    case 'empty':
      return <Empty {...empty} />;
    case 'stale':
      return (
        <View className="gap-3">
          <Notice
            inline
            tone="attention"
            icon="wifioff"
            title={copy.stale(resource.age)}
            action={resource.retry ? { label: copy.retry, onPress: resource.retry } : undefined}
          />
          {children(resource.data)}
        </View>
      );
    case 'failed':
      return (
        <Notice
          tone="attention"
          icon="wifioff"
          leading={concern}
          title={copy.failed.title}
          body={copy.failed.body}
          action={{ label: copy.retry, onPress: resource.retry }}
        />
      );
    case 'refused':
      return <Notice inline icon="lock" title={copy.refused(resource.owner)} />;
  }
}
