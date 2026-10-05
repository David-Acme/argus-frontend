import { View } from 'react-native';
import { useResponses } from '@/features/response/hooks/use-responses';
import { ResponseCardFor } from '@/features/response/components/response-card';
import { cn } from '@/shared/libs/utils';

type ResponseStripProps = {
  className?: string;
};

export function ResponseStrip({ className }: ResponseStripProps) {
  const responses = useResponses();
  if (responses.length === 0) return null;
  return (
    <View className={cn('gap-3', className)}>
      {responses.map((response) => (
        <ResponseCardFor key={response.id} response={response} />
      ))}
    </View>
  );
}
