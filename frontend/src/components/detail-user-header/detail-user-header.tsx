import { Button } from "@/components/ui/button";
import { AiOutlineRight } from "react-icons/ai";
import { LuX } from "react-icons/lu";
import { FaRegEdit } from "react-icons/fa";

export default function DetailUserHeader({id}: {id: string}) {
    return (
        <div className="w-full flex justify-between border-b border-gray-200 pb-2">
            <div className="flex items-center gap-2">
                <h1>Users</h1>
                <AiOutlineRight />
                <p>{id}</p>
            </div>
            <div className="flex items-center gap-2">
            <Button><FaRegEdit />Edit</Button>
            <div className="flex items-center gap-2" onClick={() => {
                console.log("click");
            }}>
            <LuX />
            </div>
            </div>
        </div>
    );
}