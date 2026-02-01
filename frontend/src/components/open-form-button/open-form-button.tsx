import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogDescription,
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
  const Form = form;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="inline-flex flex-col items-center p-1">
          <button
            className={`flex justify-center items-center px-4 py-2 w-10 h-10 bg-${color}-500 text-white rounded-[9999px] hover:bg-${color}-600 text-center [&_svg]:min-h-5 [&_svg]:min-w-5`}
          >
            {icon}
          </button>
          <div className="w-[90px]">
            <p className="font-semibold mt-1 text-center text-[14px] text-gray-700">
              {name}
            </p>
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="md:max-w-[600px]">
        <DialogHeader>
          <DialogTitle></DialogTitle>
          <DialogDescription>{Form}</DialogDescription>
        </DialogHeader>
        <DialogFooter></DialogFooter>
        <DialogClose />
      </DialogContent>
    </Dialog>
  );
}
