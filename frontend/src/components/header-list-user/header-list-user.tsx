import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { AiOutlineRight } from "react-icons/ai";
import AddUserForm from "../form-add-user/form-add-user";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
export default function ListUserHeader() {
  return (
    <div className="w-full flex justify-between border-b border-gray-200 pb-2 bg-white">
      <div className="flex items-center gap-2">
        <AiOutlineRight />
        <h1>Home</h1>
      </div>
      <Dialog>
        <DialogTrigger asChild>
          <Button>
            <PlusIcon />
            Add new
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogTitle className="text-lg font-semibold mb-4 text-center">
            THÊM NHÂN SỰ MỚI
          </DialogTitle>
          <AddUserForm />
        </DialogContent>
      </Dialog>
    </div>
  );
}
