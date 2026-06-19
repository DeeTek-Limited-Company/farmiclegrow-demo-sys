import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Building2,
  CheckCircle,
  ClipboardList,
  FileText,
  History,
  LayoutDashboard,
  Map,
  MapPin,
  Menu,
  MessageSquare,
  Package,
  Plus,
  PlusCircle,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Sprout,
  TrendingUp,
  Truck,
  User,
  Users,
  Warehouse,
} from "lucide-react";

export type DashboardNavPriority = "primary" | "secondary";

export type DashboardNavItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  priority: DashboardNavPriority;
  mobile?: {
    order: number;
    label?: string;
    icon?: LucideIcon;
    isCenter?: boolean;
  };
};

export type DashboardNavGroup = {
  group: string;
  items: DashboardNavItem[];
};

export type DashboardMobileNavItem = DashboardNavItem & {
  mobileLabel: string;
  mobileIcon: LucideIcon;
  mobileOrder: number;
  isCenter: boolean;
};

export function getDashboardNavGroups(userRole: string): DashboardNavGroup[] {
  switch (userRole) {
    case "super_admin":
      return [
        {
          group: "Platform",
          items: [
            {
              name: "Dashboard",
              href: "/super-admin",
              icon: LayoutDashboard,
              priority: "primary",
              mobile: { order: 1, label: "Home" },
            },
            {
              name: "Organizations",
              href: "/super-admin/organizations",
              icon: Building2,
              priority: "primary",
              mobile: { order: 2 },
            },
            {
              name: "Tenant Admins",
              href: "/super-admin/org-admins",
              icon: ShieldCheck,
              priority: "secondary",
            },
            {
              name: "Global Users",
              href: "/super-admin/users",
              icon: Users,
              priority: "secondary",
            },
          ],
        },
        {
          group: "Traceability",
          items: [
            {
              name: "Global Batches",
              href: "/super-admin/traceability",
              icon: Package,
              priority: "primary",
              mobile: { order: 3, isCenter: true },
            },
            {
              name: "QR Monitoring",
              href: "/super-admin/traceability/qr",
              icon: Search,
              priority: "secondary",
            },
          ],
        },
        {
          group: "Governance",
          items: [
            {
              name: "Compliance",
              href: "/super-admin/compliance",
              icon: CheckCircle,
              priority: "secondary",
            },
            {
              name: "Audit Logs",
              href: "/super-admin/audit-logs",
              icon: History,
              priority: "primary",
              mobile: { order: 4 },
            },
            {
              name: "Security Center",
              href: "/super-admin/security",
              icon: ShieldCheck,
              priority: "secondary",
            },
          ],
        },
        {
          group: "Intelligence",
          items: [
            {
              name: "Analytics",
              href: "/super-admin/analytics",
              icon: TrendingUp,
              priority: "secondary",
            },
            {
              name: "Export Center",
              href: "/super-admin/exports",
              icon: FileText,
              priority: "secondary",
            },
          ],
        },
        {
          group: "Commercial",
          items: [
            {
              name: "Billing",
              href: "/super-admin/billing",
              icon: ShoppingCart,
              priority: "secondary",
            },
            {
              name: "Subscriptions",
              href: "/super-admin/billing/plans",
              icon: PlusCircle,
              priority: "secondary",
            },
          ],
        },
        {
          group: "System",
          items: [
            {
              name: "Support",
              href: "/super-admin/support",
              icon: MessageSquare,
              priority: "secondary",
            },
            {
              name: "Notifications",
              href: "/super-admin/notifications",
              icon: Bell,
              priority: "secondary",
            },
            {
              name: "Settings",
              href: "/super-admin/settings",
              icon: Settings,
              priority: "secondary",
              mobile: { order: 5 },
            },
          ],
        },
      ];
    case "admin":
      return [
        {
          group: "Control Center",
          items: [
            {
              name: "Dashboard",
              href: "/admin",
              icon: LayoutDashboard,
              priority: "primary",
              mobile: { order: 1, label: "Home" },
            },
            {
              name: "Farmers",
              href: "/admin/farmers",
              icon: Users,
              priority: "primary",
              mobile: { order: 3, label: "Search", icon: Search, isCenter: true },
            },
            {
              name: "Order Pipeline",
              href: "/admin/orders",
              icon: ShoppingCart,
              priority: "secondary",
            },
            {
              name: "Review Queue",
              href: "/admin/submissions",
              icon: CheckCircle,
              priority: "primary",
              mobile: { order: 2, label: "Review" },
            },
          ],
        },
        {
          group: "Management",
          items: [
            {
              name: "User Directory",
              href: "/admin/users",
              icon: Settings,
              priority: "primary",
              mobile: { order: 4, label: "Users" },
            },
            {
              name: "Marketplace",
              href: "/admin/marketplace",
              icon: ShoppingCart,
              priority: "secondary",
            },
            {
              name: "Market Inventory",
              href: "/admin/inventory",
              icon: Warehouse,
              priority: "secondary",
            },
            {
              name: "Agronomist Assignment",
              href: "/admin/assignments",
              icon: ClipboardList,
              priority: "secondary",
            },
            {
              name: "Document Review",
              href: "/admin/documents",
              icon: FileText,
              priority: "secondary",
            },
            {
              name: "Locations",
              href: "/admin/locations",
              icon: MapPin,
              priority: "secondary",
            },
            {
              name: "Audit Trails",
              href: "/admin/audit",
              icon: ShieldCheck,
              priority: "secondary",
              mobile: { order: 5, label: "More", icon: Menu },
            },
          ],
        },
        {
          group: "Intelligence",
          items: [
            {
              name: "Reports",
              href: "/ops/reports",
              icon: FileText,
              priority: "secondary",
            },
          ],
        },
        {
          group: "Account",
          items: [
            {
              name: "Notifications",
              href: "/admin/notifications",
              icon: Bell,
              priority: "secondary",
            },
            {
              name: "Global Settings",
              href: "/settings",
              icon: Settings,
              priority: "secondary",
            },
          ],
        },
      ];
    case "agronomist":
      return [
        {
          group: "Field Desk",
          items: [
            {
              name: "Overview",
              href: "/agronomist",
              icon: LayoutDashboard,
              priority: "primary",
              mobile: { order: 1, label: "Home" },
            },
            {
              name: "My Districts",
              href: "/agronomist/districts",
              icon: MapPin,
              priority: "secondary",
            },
            {
              name: "Communities",
              href: "/agronomist/communities",
              icon: MapPin,
              priority: "secondary",
            },
          ],
        },
        {
          group: "Farmers",
          items: [
            {
              name: "All Farmers",
              href: "/agronomist/farmers",
              icon: Users,
              priority: "primary",
              mobile: { order: 2, label: "Farmers" },
            },
            {
              name: "Register Farmer",
              href: "/agronomist/onboarding",
              icon: PlusCircle,
              priority: "primary",
              mobile: { order: 3, label: "Onboard", icon: Plus, isCenter: true },
            },
          ],
        },
        {
          group: "Farm Setup",
          items: [
            {
              name: "Farm Profiles",
              href: "/agronomist/farm-profiles",
              icon: Sprout,
              priority: "secondary",
            },
            {
              name: "Plots",
              href: "/agronomist/plots",
              icon: Map,
              priority: "secondary",
            },
            {
              name: "Farm Locations",
              href: "/agronomist/locations",
              icon: MapPin,
              priority: "secondary",
            },
          ],
        },
        {
          group: "Production",
          items: [
            {
              name: "Production Cycles",
              href: "/agronomist/production",
              icon: TrendingUp,
              priority: "primary",
              mobile: { order: 4, label: "Ops", icon: Package },
            },
            {
              name: "Quality Testing",
              href: "/agronomist/quality-testing",
              icon: ShieldCheck,
              priority: "secondary",
            },
          ],
        },
        {
          group: "Traceability",
          items: [
            {
              name: "Batches",
              href: "/agronomist/batches",
              icon: Package,
              priority: "secondary",
            },
            {
              name: "Internal Movements",
              href: "/agronomist/movements",
              icon: Truck,
              priority: "secondary",
            },
            {
              name: "Warehouse Entry",
              href: "/agronomist/warehousing",
              icon: Warehouse,
              priority: "secondary",
            },
          ],
        },
        {
          group: "Intelligence",
          items: [
            {
              name: "Reports",
              href: "/ops/reports",
              icon: FileText,
              priority: "secondary",
            },
          ],
        },
        {
          group: "System",
          items: [
            {
              name: "Notifications",
              href: "/agronomist/notifications",
              icon: Bell,
              priority: "secondary",
            },
            {
              name: "Settings",
              href: "/settings",
              icon: Settings,
              priority: "secondary",
              mobile: { order: 5, label: "More", icon: Menu },
            },
          ],
        },
      ];
    case "ops":
      return [
        {
          group: "Operations",
          items: [
            {
              name: "Dashboard",
              href: "/ops",
              icon: LayoutDashboard,
              priority: "primary",
              mobile: { order: 1, label: "Home" },
            },
            {
              name: "Reports",
              href: "/ops/reports",
              icon: FileText,
              priority: "primary",
              mobile: { order: 2, icon: Search },
            },
            {
              name: "Document Review",
              href: "/admin/documents",
              icon: FileText,
              priority: "primary",
              mobile: { order: 3, label: "Docs", isCenter: true },
            },
          ],
        },
        {
          group: "Account",
          items: [
            {
              name: "Settings",
              href: "/settings",
              icon: Settings,
              priority: "secondary",
              mobile: { order: 4 },
            },
          ],
        },
      ];
    case "buyer":
      return [
        {
          group: "Buyer Hub",
          items: [
            {
              name: "Dashboard",
              href: "/buyer",
              icon: LayoutDashboard,
              priority: "primary",
              mobile: { order: 1, label: "Home" },
            },
          ],
        },
        {
          group: "Sourcing",
          items: [
            {
              name: "Marketplace",
              href: "/buyer/marketplace",
              icon: ShoppingCart,
              priority: "primary",
              mobile: { order: 2, label: "Market" },
            },
            {
              name: "RFQs & Bids",
              href: "/buyer/rfqs",
              icon: FileText,
              priority: "secondary",
            },
            {
              name: "Trace Lookup",
              href: "/trace",
              icon: Search,
              priority: "primary",
              mobile: { order: 3, label: "Trace", isCenter: true },
            },
          ],
        },
        {
          group: "Management",
          items: [
            {
              name: "My Orders",
              href: "/buyer/orders",
              icon: Package,
              priority: "primary",
              mobile: { order: 4, label: "Orders" },
            },
            {
              name: "Chat Hub",
              href: "/buyer/chat",
              icon: MessageSquare,
              priority: "primary",
              mobile: { order: 5, label: "Chat" },
            },
            {
              name: "Notifications",
              href: "/buyer/notifications",
              icon: Bell,
              priority: "secondary",
            },
          ],
        },
        {
          group: "Profile",
          items: [
            {
              name: "Business Profile",
              href: "/buyer/profile",
              icon: User,
              priority: "secondary",
            },
            {
              name: "Settings",
              href: "/settings",
              icon: Settings,
              priority: "secondary",
            },
          ],
        },
      ];
    default:
      return [];
  }
}

export function getPrimaryNavItems(userRole: string): DashboardNavItem[] {
  return getDashboardNavGroups(userRole).flatMap((group) =>
    group.items.filter((item) => item.priority === "primary"),
  );
}

export function getSecondaryNavItems(userRole: string): DashboardNavItem[] {
  return getDashboardNavGroups(userRole).flatMap((group) =>
    group.items.filter((item) => item.priority === "secondary"),
  );
}

export function getMobileNavItems(userRole: string): DashboardMobileNavItem[] {
  return getDashboardNavGroups(userRole)
    .flatMap((group) => group.items)
    .flatMap((item) =>
      item.mobile
        ? [
            {
              ...item,
              mobileLabel: item.mobile.label ?? item.name,
              mobileIcon: item.mobile.icon ?? item.icon,
              mobileOrder: item.mobile.order,
              isCenter: item.mobile.isCenter ?? false,
            },
          ]
        : [],
    )
    .sort((left, right) => left.mobileOrder - right.mobileOrder);
}
