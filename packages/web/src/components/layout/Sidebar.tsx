import { NavLink } from "react-router-dom";
import { UserButton } from "@clerk/clerk-react";

export function Sidebar() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `block px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
      isActive
        ? "bg-gray-800 text-white"
        : "text-gray-400 hover:text-white hover:bg-gray-800"
    }`;

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col min-h-screen">
      <div className="px-6 py-5 border-b border-gray-800">
        <h1 className="text-lg font-bold tracking-tight">STR Renovator</h1>
        <p className="text-xs text-gray-500 mt-0.5">Design & Renovate</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        <NavLink to="/" className={linkClass} end>
          Dashboard
        </NavLink>
        <NavLink to="/pricing" className={linkClass}>
          Pricing
        </NavLink>
        <NavLink to="/usage" className={linkClass}>
          Usage
        </NavLink>
      </nav>

      <div className="px-4 py-4 border-t border-gray-800">
        <UserButton afterSignOutUrl="/" />
      </div>
    </aside>
  );
}
