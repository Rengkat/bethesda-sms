import { create } from "zustand";

type StaffFiltersState = {
  search: string;
  departmentId: string | "all";
  role: string | "all";
  status: "active" | "inactive" | "all";
  setSearch: (value: string) => void;
  setDepartmentId: (value: string) => void;
  setRole: (value: string) => void;
  setStatus: (value: "active" | "inactive" | "all") => void;
  reset: () => void;
};

const defaults = {
  search: "",
  departmentId: "all" as const,
  role: "all",
  status: "active" as const,
};

export const useStaffFiltersStore = create<StaffFiltersState>((set) => ({
  ...defaults,
  setSearch: (search) => set({ search }),
  setDepartmentId: (departmentId) => set({ departmentId }),
  setRole: (role) => set({ role }),
  setStatus: (status) => set({ status }),
  reset: () => set(defaults),
}));
