"use client";
import useUserStore from "@/store/user.store";
export default function Profile() {
  const { user } = useUserStore();
  return (
    <div className="w-full h-full bg-white rounded-2xl ">
      <h1 className="">{user?.name}</h1>
    </div>
  );
}
