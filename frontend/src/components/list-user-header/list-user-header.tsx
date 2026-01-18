import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { AiOutlineRight } from "react-icons/ai";
import AddUserForm from "../add-user-form/add-user-form";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
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
          <AddUserForm />
        </DialogContent>
      </Dialog>
    </div>
  );
}
