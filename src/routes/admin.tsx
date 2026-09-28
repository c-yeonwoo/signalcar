import { createFileRoute, Outlet, redirect, Link } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

async function isAdminUser(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();
  return !error && (data as { is_admin?: boolean } | null)?.is_admin === true;
}

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session) {
      throw redirect({ to: "/auth", search: { next: "/admin" } });
    }
    const ok = await isAdminUser(session.user.id);
    if (!ok) {
      throw redirect({ to: "/" });
    }
  },
});

function AdminLayout() {
  const { user, loading } = useSession();
  const userId = user?.id;
  const [access, setAccess] = useState<{ userId: string; allowed: boolean } | null>(null);

  useEffect(() => {
    if (!userId) return;
    let current = true;
    isAdminUser(userId).then((allowed) => {
      if (current) setAccess({ userId, allowed });
    });
    return () => {
      current = false;
    };
  }, [userId]);

  if (loading || (user && access?.userId !== user.id)) {
    return (
      <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">
        권한 확인 중…
      </div>
    );
  }

  if (!user || !access?.allowed) {
    return (
      <div className="min-h-screen grid place-items-center p-6 text-center">
        <div>
          <p className="text-sm text-muted-foreground">관리자 권한이 없어요.</p>
          <Link to="/" className="mt-3 inline-block text-sm font-medium underline">
            홈으로
          </Link>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center border-b bg-background sticky top-0 z-10">
            <SidebarTrigger className="ml-2" />
            <div className="ml-3 text-sm font-medium text-muted-foreground">
              신차 구매 코치 — 관리자
            </div>
            <div className="ml-auto mr-4 text-xs text-muted-foreground truncate max-w-[200px]">
              {user.email}
            </div>
          </header>
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
