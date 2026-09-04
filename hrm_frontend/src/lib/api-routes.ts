const AUTH = {
  login: "/auth/login",
  refreshToken: "/auth/refresh-token",
  logout: "/auth/logout",
  requestPasswordReset: "/auth/request-password-reset",
  verifyResetPasswordOtp: "/auth/verify-reset-password-otp",
  resetPassword: "/auth/reset-password",
};

const USERS = {
  base: "/users",
  me: "/users/me",
  addUser: "/users",
  uploadAvatar: "/users/me/avatar",
  changePassword: "/users/me/change-password",
};

const INTERNAL = {
  auth: "/api/auth",
};

const DEPARTMENT = {
  base: "/departments",
};

const COMPANY = {
  base: "/companies",
};

const ROLES = {
  base: "/roles",
};

const PERMISSIONS = {
  base: "/permissions",
};

const USER_LOGIN_SESSIONS = {
  base: "/user-login-sessions",
};

const APPLICATIONS = {
  base: "/applications",
};

export const API_ROUTES = {
  auth: AUTH,
  users: USERS,
  internal: INTERNAL,
  departments: DEPARTMENT,
  companies: COMPANY,
  roles: ROLES,
  permissions: PERMISSIONS,
  userLoginSessions: USER_LOGIN_SESSIONS,
  applications: APPLICATIONS,
};
