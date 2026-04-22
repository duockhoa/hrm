"use client";
import { IoPersonCircleOutline } from "react-icons/io5";
import { FiUsers } from "react-icons/fi";
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
import FormConfirm from "../form-confirm/form-confirm";
import { departmentsService } from "@/services/index.service";
import { toast } from "sonner";
import { mutate } from "swr";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { MdApartment } from "react-icons/md";
import { API_ROUTES } from "@/lib/api-routes";
export default function ItemDepartment({ department }: { department: any }) {
  const [open, setOpen] = useState(false);
  const handleDelete = async () => {};
  // Lưu scroll position trước khi chuyển trang
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const handleClick = (departmentName: string) => {
    const scrollTop = containerRef.current?.scrollTop || 0;
    sessionStorage.setItem("userListScroll", scrollTop.toString());
    router.push(`/department/${departmentName}`, { scroll: false });
  };
  console.log("Department Item:", department);
  return (
    <div
      className="bg-white rounded-md p-4 shadow-md h-[100%] w-120 border border-gray-300 hover:shadow-lg cursor-pointer"
      onClick={() => handleClick(department?.name)}
    >
      <div className="flex p-2 justify-between">
        <div className="bg-blue-500 text-white rounded-xl p-3 text-2xl">
          <MdEqualizer />
        </div>
        <div onClick={(e) => e.stopPropagation()}>
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

              <DropdownMenuItem onClick={() => setOpen(true)}>
                <AiFillDelete className="mr-2 text-red-500" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="p-2">
        <h2 className="flex gap-2 items-center">
          <p className="font-bold">{department.name}</p>
          <p> - </p>
          <p>{department.description}</p>
        </h2>
        <p>{department.company?.name || "N/A"}</p>
      </div>
      <div className="border-t-1 border-gray-300 p-y-2"></div>

      <div className="bg-gray-50 p-2">
        <div className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <IoPersonCircleOutline />
            <p> Trưởng phòng</p>
          </div>
          <div className="font-bold">
            {department.team_lead_user?.name || "N/A"}
          </div>
        </div>
        <div className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <FiUsers />
            <p>Số lượng nhân viên</p>
          </div>
          <div className="font-bold">{department.users.length || 0}</div>
        </div>
        <div className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <MdApartment />
            <p>Công ty</p>
          </div>
          <div className="font-bold">{department.company?.name || "N/A"}</div>
        </div>
      </div>

      {open && (
        <div
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <FormConfirm
            message="Xác nhận xóa phòng ban"
            onConfirm={async () => {
              try {
                await departmentsService.deleteDepartment(department.name);
                toast.success("Department deleted successfully");
                mutate(API_ROUTES.departments.base);
                setOpen(false);
              } catch (error) {
                toast.error("Failed to delete department");
              }
            }}
            onCancel={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
