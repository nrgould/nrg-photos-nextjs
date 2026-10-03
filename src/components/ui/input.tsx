import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";
import { cn } from "@/lib/utils";

const field =
  "w-full min-w-0 min-h-12 rounded-none border-0 border-b border-input bg-transparent pt-[15px] pb-[13px] text-sm max-sm:text-base leading-[1.6] transition-colors duration-150 placeholder:text-muted-foreground placeholder:opacity-100 focus:border-primary disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-destructive";

function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      data-slot="input"
      className={cn(field, className)}
      {...props}
    />
  );
}

export { Input, field };
