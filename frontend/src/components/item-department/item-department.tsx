import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IoMdMore } from "react-icons/io";
import { MdEqualizer } from "react-icons/md";
import { FaEdit } from "react-icons/fa";
import { AiFillDelete } from "react-icons/ai";

export default function ItemDepartment({ department }: { department: any }) {
  return (
    <div className="bg-white rounded-md p-4 shadow-md h-[100%] min-w-100 border border-gray-300">
      <div className="flex p-2 justify-between">
        <div className="bg-blue-500 text-white rounded-xl p-3 text-2xl">
          <MdEqualizer />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="text-2xl">
              <IoMdMore />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>
              <FaEdit className="mr-2 text-blue-500" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem>
              <AiFillDelete className="mr-2 text-red-500" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="p-2">
        <h2 className="flex gap-2 items-center">
          <p className="font-bold">{department.name}</p>
          <p> - </p>
          <p>{department.description}</p>
        </h2>
        <p>{department.company}</p>
      </div>
      <div className="border-t-1 border-gray-300 p-y-2"></div>

      <div className="bg-gray-50 p-2">
        <div className="flex items-center gap-2 justify-between">
          <p className="text-sm text-gray-500">Trưởng phòng</p>
          <p className="font-bold">John Doe</p>
        </div>
        <div className="flex items-center gap-2 justify-between">
          <p className="text-sm text-gray-500">Số lượng nhân viên</p>
          <p className="font-bold">10</p>
        </div>
      </div>
    </div>
  );
}
