export type UserRole = 'user' | 'staff' | 'admin';

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  bio: string | null;
  is_active: boolean;
  role: UserRole;
};
