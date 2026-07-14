import { createFileRoute, Outlet, redirect, Link } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";

/**
 * Admin allowlist.
 * VITE_ADMIN_EMAILS=a@x.com,b@y.com  (comma-separated)
 * 미설정 시 로그인만 요구 (개발 편의). 프로덕션에서는 반드시 env 설정.
 */
function adminEmails(): string[] {
  const raw = import.meta.env.VITE_ADMIN_EMAILS as string | undefined;
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const list = adminEmails();
  // allowlist 비어 있으면 로그인한 누구나 (로컬/프리뷰). 배포 시 env로 잠금.
  if (list.length === 0) return true;
  return list.includes(email.toLowerCase());
}

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session) {
      throw redirect({ to: "/auth" });
    }
    if (!isAdminEmail(session.user.email)) {
      throw redirect({ to: "/" });
    }
  },
});

function AdminLayout() {
  const { user, loading } = useSession();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">
        권한 확인 중…
      </div>
    );
  }

  if (!user || !isAdminEmail(user.email)) {
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
