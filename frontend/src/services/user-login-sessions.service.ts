import axiosClient from "@/lib/axios-client";
import { API_ROUTES } from "@/lib/api-routes";

export type UserLoginSession = {
  id: number;
  login_at: string;
  logout_at: string | null;
  ip_address: string | null;
  user_agent: string | null;
  user: {
    id: number;
    username: string;
    name: string | null;
    email: string | null;
  };
};

export type UserLoginSessionsResponse = {
  data: UserLoginSession[];
  meta: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
};

export type UserLoginSessionFilters = {
  keyword?: string;
  status?: "active" | "logged_out";
  loginFrom?: string;
  loginTo?: string;
};

const getUserLoginSessions = async ({
  page,
  limit = 20,
  keyword,
  status,
  loginFrom,
  loginTo,
}: UserLoginSessionFilters & { page: number; limit?: number }) => {
  const response = await axiosClient.get<UserLoginSessionsResponse>(
    API_ROUTES.userLoginSessions.base,
    {
      params: {
        page,
        limit,
        keyword: keyword?.trim() || undefined,
        status,
        login_from: loginFrom || undefined,
        login_to: loginTo || undefined,
      },
    },
  );
  return response.data;
};

const userLoginSessionsService = {
  getUserLoginSessions,
};

export default userLoginSessionsService;
