import * as React from "react";
import { cn } from "@/lib/utils";
import { boxed, field, type FieldVariant } from "./input";

function Textarea({
  className,
  variant,
  ...props
}: React.ComponentProps<"textarea"> & FieldVariant) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        field,
        variant === "boxed" && [boxed, "py-3"],
        "resize-y",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
