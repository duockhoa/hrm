interface UserState {
  user: {
    id: number;
    employee_code: string;
    username: string;
    department: string;
    position: string;
    email: string | null;
    avatar: string | null;
    phoneNumber: string | null;
    sex: string | null;
    birthday: string | null;
    createdAt: string | null;
    updatedAt: string | null;
    deletedAt: string | null;
  } | null;
  setUser: (user: {
    id: number;
    employee_code: string;
    username: string;
    department: string;
    position: string;
    email: string;
    avatar: string;
    phoneNumber: string;
    sex: string;
    birthday: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
  }) => void;
  clearUser: () => void;
}
