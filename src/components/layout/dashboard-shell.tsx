import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { Topbar } from "./topbar";

export function DashboardShell({
  children,
  userName,
  userRole,
}: {
  children: ReactNode;
  userName?: string;
  userRole?: string;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar role={userRole} />
      <MobileNav role={userRole} />

      <div className="lg:pl-64 flex flex-col min-h-screen print:pl-0">
        <Topbar userName={userName} userRole={userRole} />
        <main id="main-content" className="flex-1 p-4 lg:p-8 print:p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
