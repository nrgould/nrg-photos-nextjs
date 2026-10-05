import * as React from "react";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { boxed, field, type FieldVariant } from "./input";

function NativeSelect({
  className,
  variant,
  ...props
}: React.ComponentProps<"select"> & FieldVariant) {
  return (
    <div
      data-slot="native-select-wrapper"
      className={cn("relative has-[select:disabled]:opacity-60", className)}
    >
      <select
        data-slot="native-select"
        className={cn(
          field,
          "appearance-none pr-6",
          variant === "boxed" && [boxed, "h-12 py-0 pr-10"],
        )}
        {...props}
      />
      <ChevronDownIcon
        aria-hidden="true"
        strokeWidth={1.5}
        className={cn(
          "pointer-events-none absolute top-1/2 right-0 size-4 -translate-y-1/2 text-muted-foreground",
          variant === "boxed" && "right-3.5",
        )}
      />
    </div>
  );
}

export { NativeSelect };
