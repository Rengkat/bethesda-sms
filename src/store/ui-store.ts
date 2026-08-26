import { create } from "zustand";

type UIState = {
  /** Mobile off-canvas sidebar open/closed. */
  isMobileNavOpen: boolean;
  openMobileNav: () => void;
  closeMobileNav: () => void;
  toggleMobileNav: () => void;

  /** Desktop sidebar collapsed to icon-only rail. */
  isSidebarCollapsed: boolean;
  toggleSidebarCollapsed: () => void;
};

export const useUIStore = create<UIState>((set) => ({
  isMobileNavOpen: false,
  openMobileNav: () => set({ isMobileNavOpen: true }),
  closeMobileNav: () => set({ isMobileNavOpen: false }),
  toggleMobileNav: () =>
    set((state) => ({ isMobileNavOpen: !state.isMobileNavOpen })),

  isSidebarCollapsed: false,
  toggleSidebarCollapsed: () =>
    set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
}));
