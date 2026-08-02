import { TextClassContext } from '@/shared/components/ui/text';
import { cn } from '@/shared/libs/utils';
import { ICONS } from '@/shared/constants';
import type { IconName } from '@/core/types';
import type { LucideIcon, LucideProps } from 'lucide-react-native';
import { withUniwind } from 'uniwind';
import { useContext } from 'react';

type IconBaseProps = LucideProps & React.RefAttributes<LucideIcon>;
type IconImplProps = IconBaseProps & { as: LucideIcon };
type IconProps = Omit<IconImplProps, 'as'> & {
  name: IconName;
  className?: string;
};

function IconImpl({ as: IconComponent, ...props }: IconImplProps) {
  return <IconComponent {...props} />;
}

const StyledIcon = withUniwind(IconImpl, {
  size: {
    fromClassName: 'className',
    styleProperty: 'width',
  },
  color: {
    fromClassName: 'className',
    styleProperty: 'color',
  },
});

function Icon({ name, className, ...props }: IconProps) {
  const textClass = useContext(TextClassContext);
  return (
    <StyledIcon
      as={ICONS[name]}
      className={cn('text-foreground size-5', textClass, className)}
      {...props}
    />
  );
}

export { Icon };
