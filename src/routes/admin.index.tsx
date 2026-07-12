import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Car, Tag, FileText, Layers } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: Index,
  ssr: false,
});

async function fetchCounts() {
  const [brands, vehicles, trims, promos, deals] = await Promise.all([
    supabase.from("brands").select("*", { count: "exact", head: true }),
    supabase.from("vehicles").select("*", { count: "exact", head: true }),
    supabase.from("trims").select("*", { count: "exact", head: true }),
    supabase.from("official_promotions").select("*", { count: "exact", head: true }),
    supabase.from("deal_reports").select("*", { count: "exact", head: true }),
  ]);
  return {
    brands: brands.count ?? 0,
    vehicles: vehicles.count ?? 0,
    trims: trims.count ?? 0,
    promotions: promos.count ?? 0,
    deals: deals.count ?? 0,
  };
}

function Index() {
  const { data, isLoading } = useQuery({ queryKey: ["counts"], queryFn: fetchCounts });

  const cards = [
    { title: "브랜드", value: data?.brands, icon: Building2, to: "/brands" as const },
    { title: "차종", value: data?.vehicles, icon: Car, to: "/vehicles" as const },
    { title: "트림", value: data?.trims, icon: Layers, to: "/vehicles" as const },
    { title: "공식 프로모션", value: data?.promotions, icon: Tag, to: "/promotions" as const },
    { title: "공유된 실계약가", value: data?.deals, icon: FileText, to: "/deal-reports" as const },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">전체 차량 대시보드</h1>
        <p className="text-sm text-muted-foreground mt-1">
          브랜드부터 공유된 실계약가까지 한눈에 확인하세요.
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {cards.map((c) => (
          <Link key={c.title} to={c.to}>
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <c.icon className="h-4 w-4" />
                  {c.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? "…" : c.value?.toLocaleString() ?? 0}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
