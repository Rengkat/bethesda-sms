import { create } from "zustand";

type StaffFiltersState = {
  search: string;
  departmentId: string | "all";
  role: string | "all";
  category: "TEACHING" | "NON_TEACHING" | "all";
  status: "active" | "inactive" | "all";
  setSearch: (value: string) => void;
  setDepartmentId: (value: string) => void;
  setRole: (value: string) => void;
  setCategory: (value: "TEACHING" | "NON_TEACHING" | "all") => void;
  setStatus: (value: "active" | "inactive" | "all") => void;
  reset: () => void;
};

const defaults = {
  search: "",
  departmentId: "all" as const,
  role: "all",
  category: "all" as const,
  status: "active" as const,
};

export const useStaffFiltersStore = create<StaffFiltersState>((set) => ({
  ...defaults,
  setSearch: (search) => set({ search }),
  setDepartmentId: (departmentId) => set({ departmentId }),
  setRole: (role) => set({ role }),
  setCategory: (category) => set({ category }),
  setStatus: (status) => set({ status }),
  reset: () => set(defaults),
}));
