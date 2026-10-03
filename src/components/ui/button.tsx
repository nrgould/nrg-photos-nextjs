import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Focus uses the global :focus-visible outline in globals.css, so no ring here.
const variants = cva(
  "group/button inline-flex shrink-0 items-center whitespace-nowrap select-none transition-[scale,background-color,color] duration-150 ease-out disabled:cursor-wait disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        solid:
          "min-h-[54px] justify-between gap-6 bg-primary px-6 py-[18px] text-sm text-primary-foreground hover:bg-green-800",
        link: "justify-between gap-7 border-b border-current py-[13px] text-[13px] leading-normal hover:underline [&_svg]:transition-transform [&_svg]:duration-300 [&_svg]:ease-out hover:[&_svg]:translate-x-1",
        quiet: "gap-2.5 text-[13px] text-muted-foreground hover:underline",
        icon: "size-12 justify-center text-paper hover:bg-green-800",
        round:
          "size-11 justify-center rounded-full border border-green-400 text-primary-foreground hover:bg-paper/20 [&_svg]:size-5",
      },
      press: {
        true: "active:scale-[var(--press)]",
        false: "",
      },
    },
    defaultVariants: {
      variant: "solid",
      press: true,
    },
  },
);

// cva concatenates; cn resolves conflicts so a caller's `flex` beats `inline-flex`.
function buttonVariants(props?: Parameters<typeof variants>[0]) {
  return cn(variants(props));
}

function Button({
  className,
  variant,
  press,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof variants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(variants({ variant, press, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
