import axios from "axios";

export const setCookie = async (payload: {
  accessToken: string;
  refreshToken: string;
}) => {
  try {
    console.log("Setting cookie with payload:", payload);
    const response = await axios.post("/api/auth", payload);

    return response.data;
  } catch (error) {
    throw error;
  }
};
