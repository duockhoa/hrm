interface LoginResponse {
  token: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
}
