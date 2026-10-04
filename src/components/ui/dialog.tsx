"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogClose = DialogPrimitive.Close;
const DialogTitle = DialogPrimitive.Title;

// Full-screen dark surface for viewing photographs. Modals scale from center.
function DialogContent({
  className,
  variant = "viewer",
  ...props
}: DialogPrimitive.Popup.Props & { variant?: "viewer" | "panel" }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop
        className={cn(
          "fixed inset-0 z-50 transition-opacity duration-200 ease-out data-ending-style:opacity-0 data-ending-style:duration-150 data-starting-style:opacity-0",
          variant === "viewer" ? "bg-green-950" : "bg-green-950/40",
        )}
      />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          "fixed z-50 outline-none transition-[opacity,scale] duration-200 ease-out data-ending-style:opacity-0 data-ending-style:duration-150 data-starting-style:scale-[0.96] data-starting-style:opacity-0 motion-reduce:data-starting-style:scale-100",
          variant === "viewer"
            ? "inset-0 text-paper"
            : "left-1/2 top-[18vh] h-auto w-[min(540px,calc(100vw-32px))] -translate-x-1/2 border border-line bg-paper p-6 text-foreground",
          className,
        )}
        {...props}
      />
    </DialogPrimitive.Portal>
  );
}

export { Dialog, DialogClose, DialogContent, DialogTitle };
