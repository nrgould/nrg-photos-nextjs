import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

// Matches current site button styling: uppercase, semibold, tracking-wide,
// outlined with black on light surfaces and inverted white on dark surfaces.
export const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold uppercase tracking-wide transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]",
	{
		variants: {
			variant: {
				// Black outline on light background (hover inverts to black bg / white text)
				outline:
					'border border-black text-black hover:bg-black hover:text-white',
				// Inverted outline for dark backgrounds (hover inverts to white bg / black text)
				outlineInverted:
					'border border-white/60 text-white hover:bg-white hover:text-black',
				// Keep a default solid for future use (not used on homepage now)
				default:
					'bg-primary text-primary-foreground hover:bg-primary/90',
				ghost: 'hover:bg-accent hover:text-accent-foreground',
				link: 'text-primary underline-offset-4 hover:underline',
			},
			size: {
				default: 'px-4 py-2',
				lg: 'px-5 py-3',
				sm: 'px-3 py-1.5',
				icon: 'size-9',
			},
		},
		defaultVariants: {
			variant: 'outline',
			size: 'default',
		},
	}
);

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {
	asChild?: boolean;
}

export function Button({
	className,
	variant,
	size,
	asChild,
	...props
}: ButtonProps) {
	const Comp = asChild ? Slot : 'button';
	return (
		<Comp
			data-slot='button'
			className={cn(buttonVariants({ variant, size, className }))}
			{...props}
		/>
	);
}

export default Button;
