import { Avatar } from '@/shared/ui/avatar';
import { Row } from '@/shared/ui/row';

export type FreeRowProps = { title: string; meta: string };

export function FreeRow({ title, meta }: FreeRowProps) {
  return <Row leading={<Avatar icon="clock" tone="ok" />} title={title} meta={meta} />;
}
