import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface UserData {
  id?: string;
  name?: string;
  email?: string;
}

interface AuthState {
  data: UserData;
  set: (data: UserData) => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      data: {},
      set: (data) => set(() => ({ data })),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
