"use client";
import useUsersStore from "@/store/users.store";
import { useEffect } from "react";
import DeskItem from "@/components/desk/desk-item";
import ListUserHeader from "@/components/list-user-header/list-user-header";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const { users } = useUsersStore();
  const router = useRouter();
  useEffect(() => {
    console.log(users);
  }, [users]);
  return (
    <div className="flex flex-wrap bg-white h-[100%] rounded-lg shadow-md p-4 overflow-auto">
       <div className="w-full">  <ListUserHeader /></div>
        <div className="w-full ">     
           {users.map((user) => (
          <DeskItem key={user.id} user={user} onClick={() => {router.push(`/home/${user.id}`)}} />
        ))}
        </div>
    </div>
  );
}
