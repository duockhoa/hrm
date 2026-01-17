import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { AiOutlineMore } from "react-icons/ai";

export default function DeskItem({user  , onClick}: {user: any , onClick: () => void}) {
    return (
        <div className="flex  gap-2 border-b border-gray-200 p-2" onClick={onClick}>
            <div className="flex items-center gap-4">
                <Avatar>
                    <AvatarImage
                        src={user.avatar || "https://github.com/shadcn.png"}
                        alt={user.name || "@shadcn"}
                    />
                </Avatar>
                <div>                
                <p className="font-bold">{user.name}</p>
                <p>{user.position } - {user.department}</p> 
                </div>
            </div>
            <div className="grow-1">   
            
            </div>
            <div className="flex items-center gap-2">
              <p>{user.department}</p>
              <AiOutlineMore />
            </div>  
        </div>  
    );
}