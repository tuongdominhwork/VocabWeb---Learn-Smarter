import { ArrowRightIcon } from '@radix-ui/react-icons';
import { cn } from '../../lib/utils.js';
import { Button } from './button.jsx';

export const BentoGrid = ({ children, className }) => (
  <div className={cn('grid w-full auto-rows-[18rem] grid-cols-3 gap-4', className)}>
    {children}
  </div>
);

export const BentoCard = ({ name, className, background, Icon, description, href, cta }) => (
  <div
    className={cn(
      'group relative col-span-3 flex flex-col justify-between overflow-hidden rounded-2xl',
      'bg-white dark:bg-gray-900 [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)] dark:[box-shadow:0_0_0_1px_rgba(255,255,255,.06),0_2px_4px_rgba(0,0,0,.4),0_12px_24px_rgba(0,0,0,.4)]',
      className
    )}
  >
    <div className="absolute inset-0">{background}</div>
    <div className="pointer-events-none z-10 flex transform-gpu flex-col gap-1 p-6 transition-all duration-300 group-hover:-translate-y-10">
      {Icon && (
        <Icon className="h-10 w-10 origin-left transform-gpu text-neutral-600 dark:text-white/80 transition-all duration-300 ease-in-out group-hover:scale-75" />
      )}
      <h3 className="mt-2 text-xl font-semibold text-neutral-700 dark:text-white">{name}</h3>
      <p className="max-w-lg text-sm text-neutral-400 dark:text-gray-300">{description}</p>
    </div>
    <div className="pointer-events-none absolute bottom-0 flex w-full translate-y-10 transform-gpu flex-row items-center p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
      <Button variant="ghost" asChild size="sm" className="pointer-events-auto text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300">
        <a href={href}>
          {cta}
          <ArrowRightIcon className="ml-1.5 h-4 w-4" />
        </a>
      </Button>
    </div>
    <div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-black/[.03] dark:group-hover:bg-white/[.03]" />
  </div>
);
