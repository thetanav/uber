import { create } from "zustand";

export const useAuth = create((set) => ({
  data: {},
  set: (data) => set(() => ({ data })),
}));
