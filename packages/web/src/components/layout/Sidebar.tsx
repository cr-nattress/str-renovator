import { NavLink, useParams } from "react-router-dom";
import { UserButton } from "@clerk/clerk-react";
import {
  Home,
  DollarSign,
  Activity,
  BarChart3,
  Sparkles,
  History,
  Image,
  ChevronRight,
} from "lucide-react";
import { LogoMark } from "./Logo";
import { useProperties } from "@/api/properties";

interface NavItem {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  end?: boolean;
}

const mainNav: NavItem[] = [
  { to: "/", icon: Home, label: "Properties", end: true },
];

const accountNav: NavItem[] = [
  { to: "/pricing", icon: DollarSign, label: "Pricing" },
  { to: "/usage", icon: Activity, label: "Usage" },
];

function NavSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 font-body">
        {label}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function SidebarLink({ to, icon: Icon, label, end }: NavItem) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium font-body transition-colors duration-150 ${
          isActive
            ? "bg-sidebar-accent text-white"
            : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        }`
      }
    >
      <Icon className="w-4 h-4" />
      {label}
    </NavLink>
  );
}

/**
 * Contextual sub-navigation shown when viewing a specific property.
 * Displays property name and links to its sub-views.
 */
function PropertyContext({ propertyId }: { propertyId: string }) {
  const { data: properties } = useProperties();
  const property = properties?.find((p) => p.id === propertyId);
  const name = property?.name || "Property";

  const contextNav: NavItem[] = [
    { to: `/properties/${propertyId}`, icon: Home, label: "Overview", end: true },
    { to: `/properties/${propertyId}/journey`, icon: History, label: "Design Journey" },
  ];

  return (
    <NavSection label="Current Property">
      <div className="px-3 py-1.5 mb-1">
        <p className="text-xs font-medium text-sidebar-foreground truncate flex items-center gap-1.5">
          <ChevronRight className="w-3 h-3 text-sidebar-foreground/40" />
          {name}
        </p>
      </div>
      {contextNav.map((item) => (
        <SidebarLink key={item.to} {...item} />
      ))}
    </NavSection>
  );
}

export function Sidebar() {
  const params = useParams();
  const propertyId = params.id;

  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col min-h-screen">
      {/* Brand header */}
      <div className="px-5 py-4 border-b border-sidebar-border flex items-center gap-3">
        <LogoMark className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-base font-bold tracking-tight leading-tight">
            STR Renovator
          </h1>
          <p className="text-[10px] text-sidebar-foreground/50 font-body">
            AI-Powered Renovation
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        <NavSection label="Main">
          {mainNav.map((item) => (
            <SidebarLink key={item.to} {...item} />
          ))}
        </NavSection>

        {propertyId && <PropertyContext propertyId={propertyId} />}

        <NavSection label="Account">
          {accountNav.map((item) => (
            <SidebarLink key={item.to} {...item} />
          ))}
        </NavSection>
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-sidebar-border flex items-center gap-3">
        <UserButton afterSignOutUrl="/" />
        <span className="text-xs text-sidebar-foreground/50 font-body">Account</span>
      </div>
    </aside>
  );
}
