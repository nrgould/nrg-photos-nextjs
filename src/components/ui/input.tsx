import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";
import { cn } from "@/lib/utils";

const field =
  "w-full min-w-0 min-h-12 rounded-none border-0 border-b border-input bg-transparent pt-[15px] pb-[13px] text-sm max-sm:text-base leading-[1.6] transition-colors duration-150 placeholder:text-muted-foreground placeholder:opacity-100 focus:border-primary disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-destructive";

// Panel surfaces (dialogs) box the field; editorial pages keep the underline.
const boxed =
  "rounded-[11px] border border-line px-3.5 focus-visible:outline-offset-0";

type FieldVariant = { variant?: "line" | "boxed" };

function Input({
  className,
  variant,
  ...props
}: React.ComponentProps<"input"> & FieldVariant) {
  return (
    <InputPrimitive
      data-slot="input"
      className={cn(
        field,
        variant === "boxed" && [boxed, "h-12 py-0"],
        className,
      )}
      {...props}
    />
  );
}

export { Input, field, boxed, type FieldVariant };
