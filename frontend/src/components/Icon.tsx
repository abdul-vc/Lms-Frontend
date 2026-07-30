import { LucideIcon, LucideProps } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IconProps extends Omit<LucideProps, 'ref'> {
  icon: LucideIcon;
}

export function Icon({ icon: IconComponent, className, size = 20, ...props }: IconProps) {
  return (
    <IconComponent
      size={size}
      className={cn("min-w-[20px] min-h-[20px]", className)}
      {...props}
    />
  );
}
