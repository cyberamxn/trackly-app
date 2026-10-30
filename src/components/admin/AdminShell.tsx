"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, CreditCard, ToggleLeft, Settings2, Bell,
  FileText, BarChart3, LifeBuoy, Download, Shield, Plug, Cog, LogOut,
  Search, Menu, X, Sun, Moon, ChevronDown,
} from "lucide-react";
import { useAdminStore, type AdminScreen } from "@/lib/admin/store";
import { useTheme } from "@/components/trackly/ThemeProvider";
import { Dashboard } from "./screens/Dashboard";
import { UsersScreen } from "./screens/UsersScreen";
import { SubscriptionsScreen } from "./screens/SubscriptionsScreen";
import { FeaturesScreen } from "./screens/FeaturesScreen";
import { ConfigScreen } from "./screens/ConfigScreen";
import { NotificationsScreen } from "./screens/NotificationsScreen";
import { ContentScreen } from "./screens/ContentScreen";
import { AnalyticsScreen } from "./screens/AnalyticsScreen";
import { SupportScreen } from "./screens/SupportScreen";
import { ReportsScreen } from "./screens/ReportsScreen";
import { SecurityScreen } from "./screens/SecurityScreen";
import { IntegrationsScreen } from "./screens/IntegrationsScreen";
import { SettingsScreen } from "./screens/SettingsScreen";

const NAV: { id: AdminScreen; label: string; icon: typeof LayoutDashboard; group?: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "users", label: "User Management", icon: Users },
  { id: "subscriptions", label: "Subscriptions", icon: CreditCard },
  { id: "features", label: "Feature Flags", icon: ToggleLeft },
  { id: "config", label: "Remote Config", icon: Settings2 },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "content", label: "Content", icon: FileText },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "support", label: "Support Center", icon: LifeBuoy },
  { id: "reports", label: "Reports", icon: Download },
  { id: "security", label: "Security", icon: Shield },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "settings", label: "System Settings", icon: Cog },
];

export function AdminShell() {
  const { screen, setScreen, sidebarOpen, setSidebarOpen } = useAdminStore();
  const { theme, toggle } = useTheme();
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const filteredNav = NAV.filter((n) =>
    n.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-screen overflow-hidden flex bg-background">
      {/* Sidebar (desktop) */}
      <aside className="hidden lg:flex w-[260px] shrink-0 border-r border-border bg-sidebar flex-col">
        <SidebarContent
          nav={filteredNav}
          screen={screen}
          onSelect={setScreen}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
      </aside>

      {/* Sidebar (mobile drawer) */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-[280px] bg-sidebar border-r border-border lg:hidden flex flex-col"
            >
              <SidebarContent
                nav={filteredNav}
                screen={screen}
                onSelect={(s) => { setScreen(s); setSidebarOpen(false); }}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onClose={() => setSidebarOpen(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 border-b border-border flex items-center justify-between px-4 sm:px-6 gap-4 sticky top-0 bg-background/80 backdrop-blur-xl z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden h-10 w-10 rounded-xl bg-muted flex items-center justify-center"
            >
              <Menu size={18} />
            </button>
            <div className="lg:hidden flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-foreground flex items-center justify-center">
                <div className="h-4 w-4 rounded-full border-2 border-background flex items-center justify-center">
                  <div className="h-1 w-1 rounded-full bg-background" />
                </div>
              </div>
              <span className="font-bold tracking-tight">Trackly</span>
            </div>
            <div className="hidden lg:flex items-center gap-2 text-[14px] text-muted-foreground">
              <span className="font-medium text-foreground">Admin</span>
              <span>/</span>
              <span className="capitalize">{screen}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/70"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 h-10 pl-2 pr-3 rounded-xl bg-muted hover:bg-muted/70"
              >
                <div className="h-7 w-7 rounded-full bg-foreground text-background flex items-center justify-center text-[12px] font-bold">
                  {session?.user?.name?.[0] ?? "A"}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-[13px] font-semibold leading-none">{session?.user?.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 uppercase">{session?.user?.role?.replace("_", " ")}</p>
                </div>
                <ChevronDown size={14} className="text-muted-foreground" />
              </button>
              <AnimatePresence>
                {showProfileMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="absolute right-0 top-12 z-50 w-56 bg-popover border border-border rounded-xl shadow-float p-2"
                    >
                      <div className="px-3 py-2 border-b border-border mb-2">
                        <p className="text-[13px] font-semibold">{session?.user?.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{session?.user?.email}</p>
                      </div>
                      <button
                        onClick={() => signOut({ callbackUrl: "/" })}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] hover:bg-muted text-left"
                      >
                        <LogOut size={14} /> Sign out
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto thin-scrollbar bg-background">
          <div className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={screen}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {renderScreen(screen)}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}

function renderScreen(screen: AdminScreen) {
  switch (screen) {
    case "dashboard": return <Dashboard />;
    case "users": return <UsersScreen />;
    case "subscriptions": return <SubscriptionsScreen />;
    case "features": return <FeaturesScreen />;
    case "config": return <ConfigScreen />;
    case "notifications": return <NotificationsScreen />;
    case "content": return <ContentScreen />;
    case "analytics": return <AnalyticsScreen />;
    case "support": return <SupportScreen />;
    case "reports": return <ReportsScreen />;
    case "security": return <SecurityScreen />;
    case "integrations": return <IntegrationsScreen />;
    case "settings": return <SettingsScreen />;
    default: return <Dashboard />;
  }
}

function SidebarContent({
  nav, screen, onSelect, searchQuery, setSearchQuery, onClose,
}: {
  nav: typeof NAV;
  screen: AdminScreen;
  onSelect: (s: AdminScreen) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  onClose?: () => void;
}) {
  return (
    <>
      <div className="h-16 flex items-center justify-between px-5 border-b border-border shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-foreground flex items-center justify-center">
            <div className="h-5 w-5 rounded-full border-2 border-background flex items-center justify-center">
              <div className="h-1.5 w-1.5 rounded-full bg-background" />
            </div>
          </div>
          <div>
            <p className="font-bold tracking-tight leading-none">Trackly</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">Admin Panel</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden h-8 w-8 rounded-full bg-muted flex items-center justify-center">
            <X size={14} />
          </button>
        )}
      </div>

      <div className="p-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search navigation..."
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-muted text-[13px] outline-none focus:ring-2 focus:ring-foreground/10"
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto thin-scrollbar px-3 pb-4 space-y-0.5">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = screen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors ${
                active
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon size={16} strokeWidth={active ? 2.5 : 2} />
              {item.label}
            </button>
          );
        })}
        {nav.length === 0 && (
          <p className="text-[12px] text-muted-foreground text-center py-8">No matches</p>
        )}
      </nav>

      <div className="p-3 border-t border-border shrink-0">
        <div className="rounded-xl bg-muted p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider">Server Status</p>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="h-2 w-2 rounded-full bg-foreground animate-pulse" />
            <p className="text-[12px] font-medium">All systems operational</p>
          </div>
        </div>
      </div>
    </>
  );
}
