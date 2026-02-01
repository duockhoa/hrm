"use client";
import { useEffect, useState } from "react";
import useUserStore from "@/store/user.store";
import UpdateAvatar from "@/components/update-avatar/aupdate-avatar";
import ScanQRCode from "@/components/scan-qrcode/scan-qrcode";
export default function Profile() {
  const { user } = useUserStore();
  return (
    <div className="w-full h-full bg-white rounded-2xl shadow-md">
      <div className=" grid p-2 grid-cols-1 lg:grid-cols-2 lg:p-4 gap-4 h-full">
        <div className="shadow-lg border border-gray-200 p-4 rounded-lg h-full flex flex-col items-center">
          <UpdateAvatar />
          <div className="text-gray-700 mt-4 text-xl font-semibold">
            {user?.name || "No name available"}
          </div>
          <div className=" text-gray-400  text-md">
            {user?.email || "No email available"}
          </div>

          <div className="border border-gray-200 w-full my-2"></div>
        </div>
        <div className="flex flex-col gap-4 h-full  p-2 ">
          <div className="border border-gray-200 shadow-md p-4 rounded-lg h-full">
            User Information Section
          </div>
          <div className="border border-gray-200 shadow-md p-4 rounded-lg h-full">
            <ScanQRCode />
          </div>
        </div>
      </div>
    </div>
  );
}
