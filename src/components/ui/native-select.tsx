import * as React from "react";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { field } from "./input";

function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <div
      data-slot="native-select-wrapper"
      className={cn("relative has-[select:disabled]:opacity-60", className)}
    >
      <select
        data-slot="native-select"
        className={cn(field, "appearance-none pr-6")}
        {...props}
      />
      <ChevronDownIcon
        aria-hidden="true"
        strokeWidth={1.5}
        className="pointer-events-none absolute top-1/2 right-0 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}

export { NativeSelect };
