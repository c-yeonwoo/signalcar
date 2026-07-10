import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Info } from "lucide-react";

export const Route = createFileRoute("/admin/deal-reports")({
  component: DealReportsPage,
  ssr: false,
});

function DealReportsPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["deal-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_reports")
        .select("*, trim:trims(name, vehicle:vehicles(model_name, brand:brands(name)))")
        .order("contract_month", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as any[];
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">실계약가 제보</h1>
        <p className="text-sm text-muted-foreground">사용자가 자발적으로 제보한 실계약가 (읽기 전용 · 다음 스프린트에서 제보 폼 추가)</p>
      </div>

      <Card className="border-dashed">
        <CardContent className="p-4 flex gap-3 text-sm">
          <Info className="h-4 w-4 flex-shrink-0 mt-0.5 text-muted-foreground" />
          <div className="text-muted-foreground">
            실계약가 데이터는 <strong>오직 사용자가 자발적으로 제보한 1차 데이터</strong>로만 구축합니다.
            경쟁사(겟차·다나와·엔카) 크롤링은 금지되어 있습니다. 제보 폼과 OCR 파이프라인은 다음 스프린트에서 추가됩니다.
          </div>
        </CardContent>
      </Card>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>계약월</TableHead>
              <TableHead>차종/트림</TableHead>
              <TableHead className="text-right">계약가</TableHead>
              <TableHead className="text-right">할인액</TableHead>
              <TableHead>금융</TableHead>
              <TableHead>지역</TableHead>
              <TableHead>인증</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">불러오는 중…</TableCell></TableRow>
            ) : data.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">아직 제보된 실계약가가 없습니다.</TableCell></TableRow>
            ) : data.map((d) => (
              <TableRow key={d.id}>
                <TableCell>{d.contract_month?.slice(0, 7) ?? "-"}</TableCell>
                <TableCell className="text-sm">
                  {d.trim?.vehicle ? `${d.trim.vehicle.brand?.name} ${d.trim.vehicle.model_name} · ${d.trim.name}` : "-"}
                </TableCell>
                <TableCell className="text-right font-mono">₩{Number(d.contract_price).toLocaleString()}</TableCell>
                <TableCell className="text-right font-mono">{d.discount_amount ? `₩${Number(d.discount_amount).toLocaleString()}` : "-"}</TableCell>
                <TableCell>{d.finance_type ?? "-"}</TableCell>
                <TableCell>{d.region ?? "-"}</TableCell>
                <TableCell>
                  <Badge variant={d.verification_status === "receipt_verified" ? "default" : "outline"}>
                    {d.verification_status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}