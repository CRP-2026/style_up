import { create } from 'zustand';

type UserState = {
  name: string;
  bio: string;
  avatar: string;
  setName: (name: string) => void;
  setBio: (bio: string) => void;
  setAvatar: (avatar: string) => void;
};

export const useUserStore = create<UserState>((set) => ({
  name: 'Style Up',
  bio: 'Trang sức cao cấp',
  avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=240&q=60',
  setName: (name) => set({ name }),
  setBio: (bio) => set({ bio }),
  setAvatar: (avatar) => set({ avatar }),
}));
