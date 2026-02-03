import axiosClient from "@/lib/axios-client";
import { API_ROUTES } from "@/lib/api-routes";

// me fetcher
const fetcherMe = async () => {
  const response = await axiosClient.get(API_ROUTES.users.me);
  return response.data;
};

const fetcherUserById = async (userId: string) => {
  const response = await axiosClient.get(`${API_ROUTES.users.base}/${userId}`);
  return response.data;
};

// The function to add a new user
const addUser = async (userData: any) => {
  const response = await axiosClient.post(API_ROUTES.users.base, userData);
  return response.data;
};
// update user
const updateUser = async (userId: string, userData: any) => {
  const response = await axiosClient.put(
    `${API_ROUTES.users.base}/${userId}`,
    userData,
  );
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

const changePassword = async ({
  currentPassword,
  newPassword,
}: {
  currentPassword: string;
  newPassword: string;
}) => {
  const response = await axiosClient.post(API_ROUTES.users.changePassword, {
    currentPassword,
    newPassword,
  });
  return response.data;
};

export default {
  fetcherMe,
  fetcherUserById,
  uploadAvatar,
  changePassword,
  addUser,
  updateUser,
};
