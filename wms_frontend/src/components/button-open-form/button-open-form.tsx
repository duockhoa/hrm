"use client";

import * as React from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "../ui/dialog";
export default function OpenFormButton({
  name,
  icon,
  form,
  color = "blue",
}: {
  name?: string;
  icon?: React.ReactNode;
  form?: React.ReactNode;
  color?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const Form = React.isValidElement(form)
    ? React.cloneElement(form, { onClose: () => setOpen(false) } as {
        onClose: () => void;
      })
    : form;

  return (
    <Dialog modal={false} open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="inline-flex flex-col items-center p-0.5 md:p-1">
          <button
            className={`flex h-9 w-9 items-center justify-center rounded-[9999px] bg-${color}-500 px-3 py-2 text-center text-white hover:bg-${color}-600 md:h-10 md:w-10 md:px-4 [&_svg]:min-h-5 [&_svg]:min-w-5`}
          >
            {icon}
          </button>
          <div className="w-[68px] md:w-[90px]">
            <p className="mt-1 text-center text-[12px] font-semibold leading-tight text-gray-700 md:text-[14px]">
              {name}
            </p>
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="grid max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden md:max-w-[600px]">
        <DialogHeader>
          <DialogTitle></DialogTitle>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto pr-1">{Form}</div>
        <DialogFooter></DialogFooter>
        <DialogClose />
      </DialogContent>
    </Dialog>
  );
}
