import axios from "@/lib/axios-client";

export const login = async (username: string, password: string) => {
  try {
    const response = await axios.post("/auth/login", {
      employee_code: username,
      password,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const logout = async (accessToken?: string) => {
  try {
    if (accessToken) {
      await axios.delete("/auth/logout", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
    }
  } catch (error) {
    throw error;
  }
  try {
    await fetch("/api/auth", { method: "DELETE" });
  } catch (error) {
    throw error;
  }
};
