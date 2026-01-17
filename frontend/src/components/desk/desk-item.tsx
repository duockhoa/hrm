import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { AiOutlineMore } from "react-icons/ai";

export default function DeskItem({
  user,
  onClick,
}: {
  user: any;
  onClick: () => void;
}) {
  return (
    <div
      className={`flex gap-2 border-b border-gray-200 p-2 cursor-pointer`}
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        {!user ? (
          <Skeleton className="w-12 h-12 rounded-full" />
        ) : (
          <Avatar>
            <AvatarImage
              src={user.avatar || "https://github.com/shadcn.png"}
              alt={user.name || "@shadcn"}
            />
          </Avatar>
        )}
        <div>
          {!user ? (
            <Skeleton className="w-32 h-4 mb-1" />
          ) : (
            <p className="font-bold">{user.name}</p>
          )}
          {!user ? (
            <Skeleton className="w-32 h-4 mb-1" />
          ) : (
            <p>
              {user.position} - {user.department}
            </p>
          )}
        </div>
      </div>
      <div className="grow-1"></div>
      <div className="flex items-center gap-2">
        {!user ? <Skeleton className="w-4 h-4" /> : <p>{user.department}</p>}
        <AiOutlineMore />
      </div>
    </div>
  );
}
