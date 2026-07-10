import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExternalLink } from "lucide-react";

export const Route = createFileRoute("/admin/promotions")({
  component: PromotionsListPage,
  ssr: false,
});

function PromotionsListPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["all-promotions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("official_promotions")
        .select("*, trim:trims(id, name, vehicle:vehicles(id, model_name, brand:brands(name)))")
        .order("month", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as any[];
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">공식 프로모션</h1>
        <p className="text-sm text-muted-foreground">등록된 모든 제조사 공식 월별 프로모션 (최근 200건)</p>
      </div>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>월</TableHead>
              <TableHead>브랜드/모델/트림</TableHead>
              <TableHead>유형</TableHead>
              <TableHead className="text-right">금액</TableHead>
              <TableHead>설명</TableHead>
              <TableHead>출처</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">불러오는 중…</TableCell></TableRow>
            ) : data.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">등록된 프로모션이 없습니다. 차종·트림 페이지에서 추가하세요.</TableCell></TableRow>
            ) : data.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.month.slice(0, 7)}</TableCell>
                <TableCell>
                  {p.trim?.vehicle ? (
                    <Link to="/vehicles/$vehicleId" params={{ vehicleId: p.trim.vehicle.id }} className="hover:underline">
                      {p.trim.vehicle.brand?.name} {p.trim.vehicle.model_name}
                      <span className="text-muted-foreground"> · {p.trim.name}</span>
                    </Link>
                  ) : "-"}
                </TableCell>
                <TableCell><Badge variant="secondary">{p.discount_type}</Badge></TableCell>
                <TableCell className="text-right font-mono">₩{Number(p.amount).toLocaleString()}</TableCell>
                <TableCell className="text-sm text-muted-foreground truncate max-w-[240px]">{p.description ?? "-"}</TableCell>
                <TableCell>
                  {p.source_url ? (
                    <a href={p.source_url} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1">
                      링크 <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}