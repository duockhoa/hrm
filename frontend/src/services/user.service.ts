import axiosClient from "@/lib/axios-client";
import { API_ROUTES } from "@/lib/api-routes";

// me fetcher
const fetcherMe = async () => {
  const response = await axiosClient.get(API_ROUTES.users.me);
  return response.data;
};

// upload avatar

const uploadAvatar = async (file: File) => {
  const formData = new FormData();
  formData.append("avatar", file);
  const response = await axiosClient.post(
    API_ROUTES.users.uploadAvatar,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );
  return response.data;
};

export default { fetcherMe, uploadAvatar };
