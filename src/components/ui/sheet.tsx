"use client";

import { Dialog as SheetPrimitive } from "@base-ui/react/dialog";
import { cn } from "@/lib/utils";

const Sheet = SheetPrimitive.Root;
const SheetClose = SheetPrimitive.Close;
const SheetTitle = SheetPrimitive.Title;

// A floating panel from the left edge, mirroring the desktop side drawer on the right.
// Enter on the drawer curve, exit faster; reduced motion fades.
function SheetContent({ className, ...props }: SheetPrimitive.Popup.Props) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Backdrop className="fixed inset-0 z-50 bg-[var(--neutral-950)]/20 transition-opacity duration-300 ease-drawer data-ending-style:opacity-0 data-ending-style:duration-200 data-ending-style:ease-out data-starting-style:opacity-0" />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        className={cn(
          "fixed inset-y-3 left-3 z-50 flex w-[400px] flex-col overflow-hidden rounded-[20px] border border-line bg-paper text-foreground shadow-[0_4px_24px_var(--surface-shadow)] outline-none transition-[translate,opacity] duration-300 ease-drawer data-ending-style:-translate-x-[calc(100%_+_12px)] data-ending-style:duration-200 data-ending-style:ease-out data-starting-style:-translate-x-[calc(100%_+_12px)] motion-reduce:data-ending-style:translate-x-0 motion-reduce:data-ending-style:opacity-0 motion-reduce:data-starting-style:translate-x-0 motion-reduce:data-starting-style:opacity-0",
          className,
        )}
        {...props}
      />
    </SheetPrimitive.Portal>
  );
}

export { Sheet, SheetClose, SheetContent, SheetTitle };
