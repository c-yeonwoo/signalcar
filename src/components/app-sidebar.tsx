import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Building2, Car, Tag, FileText, RefreshCw } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "대시보드", url: "/admin", icon: LayoutDashboard },
  { title: "브랜드", url: "/admin/brands", icon: Building2 },
  { title: "차종·트림", url: "/admin/vehicles", icon: Car },
  { title: "공식 프로모션", url: "/admin/promotions", icon: Tag },
  { title: "내 계약 공유", url: "/admin/deal-reports", icon: FileText },
  { title: "데이터 갱신 루프", url: "/admin/ingest", icon: RefreshCw },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({ select: (r) => r.location.pathname });

  const isActive = (path: string) => {
    if (path === "/admin") return currentPath === "/admin" || currentPath === "/admin/";
    return currentPath === path || currentPath.startsWith(path + "/");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-3">
        {!collapsed && (
          <div className="text-sm font-semibold">신차 구매 코치</div>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>전체 차량</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}