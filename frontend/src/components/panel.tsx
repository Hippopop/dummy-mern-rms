import { cn } from '@/lib/utils';

export function Panel({ className, children, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('panel', className)} {...props}>{children}</div>;
}

export function PanelHeader({ title, aside, className }: { title: string; aside?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-baseline justify-between gap-3 px-4 pt-3.5 pb-2', className)}>
      <h2 className="display text-[15px]">{title}</h2>
      {aside ? <span className="label-tech">{aside}</span> : null}
    </div>
  );
}

export function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn('label-tech', className)}>{children}</span>;
}
