import axios from "@/lib/axios-client";

export const login = async (username: string, password: string) => {
  try {
    const response = await axios.post("/auth/login", {
      username,
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

export const confirmEmail = async (token: string) => {
  try {
    const response = await axios.get(`/auth/confirm-email?token=${token}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const requestPasswordReset = async (email: string) => {
  try {
    const response = await axios.post("/auth/request-password-reset", {
      email,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const verifyResetPasswordOtp = async (email: string, otp: string) => {
  try {
    const response = await axios.post("/auth/verify-reset-password-otp", {
      email,
      otp,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const resetPassword = async (
  email: string,
  otp: string,
  newPassword: string,
) => {
  try {
    const response = await axios.post("/auth/reset-password", {
      email,
      otp,
      newPassword,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};
