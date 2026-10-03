import * as React from "react";
import { cn } from "@/lib/utils";
import { field } from "./input";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(field, "resize-y", className)}
      {...props}
    />
  );
}

export { Textarea };
