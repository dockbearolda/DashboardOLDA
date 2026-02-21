"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  ShoppingBag,
  BarChart3,
  Settings,
  Webhook,
  Store,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Commandes",
    href: "/dashboard/orders",
    icon: ShoppingBag,
  },
  {
    label: "Analytiques",
    href: "/dashboard/analytics",
    icon: BarChart3,
  },
  {
    label: "Webhook",
    href: "/dashboard/webhook",
    icon: Webhook,
  },
  {
    label: "Paramètres",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-full w-64 border-r border-border/50 bg-background/80 backdrop-blur-xl">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-6 border-b border-border/50">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-foreground">
          <Store className="h-4 w-4 text-background" />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-tight">OLDA Studio</p>
          <p className="text-xs text-muted-foreground">Dashboard</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link key={item.href} href={item.href}>
              <div className="relative">
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-xl bg-foreground"
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 35,
                    }}
                  />
                )}
                <div
                  className={cn(
                    "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "text-background"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </div>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border/50">
        <div className="rounded-xl bg-muted/50 p-3">
          <p className="text-xs font-medium text-foreground">oldastudio.up.railway.app</p>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-xs text-muted-foreground">Connecté</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
