import { cn } from '@/lib/utils'

function Spinner({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div 
      className={cn('relative flex items-center justify-center', className)}
      {...props}
    >
      <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
      <div className="h-full w-full rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  )
}

export { Spinner }
