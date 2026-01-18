"use client";
import { Button } from "@/components/ui/button";
import { AiOutlineRight } from "react-icons/ai";
import { LuX } from "react-icons/lu";
import { FaRegEdit } from "react-icons/fa";
import { useRouter } from "next/navigation";
export default function DetailUserHeader({ data }: { data: any }) {
  const router = useRouter();

  return (
    <div className="w-full flex justify-between border-b border-gray-200 pb-2">
      <div className="flex items-center gap-2">
        <h1>Users</h1>
        <AiOutlineRight />
        <p>{data}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button>
          <FaRegEdit />
          Edit
        </Button>
        <div
          className="flex items-center gap-2"
          onClick={() => {
            router.push("/home", { scroll: false });
          }}
        >
          <LuX />
        </div>
      </div>
    </div>
  );
}
