"use client";

import { Dialog as SheetPrimitive } from "@base-ui/react/dialog";
import { cn } from "@/lib/utils";

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;
const SheetTitle = SheetPrimitive.Title;

// Drops from the top edge. Enter on the drawer curve, exit faster.
function SheetContent({ className, ...props }: SheetPrimitive.Popup.Props) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Backdrop className="fixed inset-0 z-50 bg-green-950/30 transition-opacity duration-300 ease-drawer data-ending-style:opacity-0 data-ending-style:duration-200 data-ending-style:ease-out data-starting-style:opacity-0" />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        className={cn(
          "fixed inset-x-0 top-0 z-50 flex flex-col bg-paper text-foreground shadow-[0_18px_25px_-25px_var(--green-800)] outline-none transition-[translate,opacity] duration-300 ease-drawer data-ending-style:-translate-y-full data-ending-style:duration-200 data-ending-style:ease-out data-starting-style:-translate-y-full motion-reduce:data-ending-style:translate-y-0 motion-reduce:data-ending-style:opacity-0 motion-reduce:data-starting-style:translate-y-0 motion-reduce:data-starting-style:opacity-0",
          className,
        )}
        {...props}
      />
    </SheetPrimitive.Portal>
  );
}

export { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger };
