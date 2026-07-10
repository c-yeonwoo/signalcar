import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/vehicles")({
  component: VehiclesPage,
  ssr: false,
});

const BODY_TYPES = ["sedan","suv","hatchback","wagon","coupe","convertible","pickup","van","minivan","other"] as const;
const FUEL_TYPES = ["gasoline","diesel","hybrid","phev","ev","lpg","hydrogen","other"] as const;

type Vehicle = {
  id: string;
  brand_id: string;
  model_name: string;
  generation: string | null;
  body_type: typeof BODY_TYPES[number] | null;
  fuel_type: typeof FUEL_TYPES[number] | null;
  launched_at: string | null;
  discontinued_at: string | null;
  notes: string | null;
};

function VehiclesPage() {
  const qc = useQueryClient();
  const [brandFilter, setBrandFilter] = useState<string>("all");

  const { data: brands = [] } = useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brands").select("id,name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ["vehicles", brandFilter],
    queryFn: async () => {
      let q = supabase.from("vehicles").select("*").order("model_name");
      if (brandFilter !== "all") q = q.eq("brand_id", brandFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data as Vehicle[];
    },
  });

  const brandMap = new Map(brands.map((b) => [b.id, b.name]));

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [form, setForm] = useState({
    brand_id: "",
    model_name: "",
    generation: "",
    body_type: "" as Vehicle["body_type"] | "",
    fuel_type: "" as Vehicle["fuel_type"] | "",
    launched_at: "",
    notes: "",
  });

  function openNew() {
    setEditing(null);
    setForm({
      brand_id: brandFilter !== "all" ? brandFilter : brands[0]?.id ?? "",
      model_name: "", generation: "", body_type: "", fuel_type: "", launched_at: "", notes: "",
    });
    setOpen(true);
  }
  function openEdit(v: Vehicle) {
    setEditing(v);
    setForm({
      brand_id: v.brand_id,
      model_name: v.model_name,
      generation: v.generation ?? "",
      body_type: v.body_type ?? "",
      fuel_type: v.fuel_type ?? "",
      launched_at: v.launched_at ?? "",
      notes: v.notes ?? "",
    });
    setOpen(true);
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!form.brand_id) throw new Error("브랜드를 선택하세요");
      if (!form.model_name.trim()) throw new Error("모델명은 필수입니다");
      const payload = {
        brand_id: form.brand_id,
        model_name: form.model_name.trim(),
        generation: form.generation.trim() || null,
        body_type: form.body_type || null,
        fuel_type: form.fuel_type || null,
        launched_at: form.launched_at || null,
        notes: form.notes.trim() || null,
      };
      if (editing) {
        const { error } = await supabase.from("vehicles").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("vehicles").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "수정되었습니다" : "추가되었습니다");
      qc.invalidateQueries({ queryKey: ["vehicles"] });
      qc.invalidateQueries({ queryKey: ["counts"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vehicles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("삭제되었습니다");
      qc.invalidateQueries({ queryKey: ["vehicles"] });
      qc.invalidateQueries({ queryKey: ["counts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">차종</h1>
          <p className="text-sm text-muted-foreground">브랜드별 모델을 관리합니다. 행을 클릭하면 트림/옵션을 편집할 수 있습니다.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 브랜드</SelectItem>
              {brands.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew} disabled={brands.length === 0}>
                <Plus className="h-4 w-4 mr-1" />차종 추가
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "차종 수정" : "차종 추가"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>브랜드 *</Label>
                  <Select value={form.brand_id} onValueChange={(v) => setForm({ ...form, brand_id: v })}>
                    <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                    <SelectContent>
                      {brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>모델명 *</Label>
                  <Input value={form.model_name} onChange={(e) => setForm({ ...form, model_name: e.target.value })} placeholder="예: 쏘렌토" />
                </div>
                <div>
                  <Label>세대</Label>
                  <Input value={form.generation} onChange={(e) => setForm({ ...form, generation: e.target.value })} placeholder="예: MQ4 (4세대)" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>차체 유형</Label>
                    <Select value={form.body_type || undefined} onValueChange={(v) => setForm({ ...form, body_type: v as Vehicle["body_type"] })}>
                      <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                      <SelectContent>
                        {BODY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>연료</Label>
                    <Select value={form.fuel_type || undefined} onValueChange={(v) => setForm({ ...form, fuel_type: v as Vehicle["fuel_type"] })}>
                      <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                      <SelectContent>
                        {FUEL_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>출시일</Label>
                  <Input type="date" value={form.launched_at} onChange={(e) => setForm({ ...form, launched_at: e.target.value })} />
                </div>
                <div>
                  <Label>메모</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>취소</Button>
                <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
                  {saveMut.isPending ? "저장 중…" : "저장"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>브랜드</TableHead>
              <TableHead>모델</TableHead>
              <TableHead>세대</TableHead>
              <TableHead>차체</TableHead>
              <TableHead>연료</TableHead>
              <TableHead>출시일</TableHead>
              <TableHead className="w-32 text-right">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">불러오는 중…</TableCell></TableRow>
            ) : vehicles.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">등록된 차종이 없습니다.</TableCell></TableRow>
            ) : vehicles.map((v) => (
              <TableRow key={v.id}>
                <TableCell>{brandMap.get(v.brand_id) ?? "-"}</TableCell>
                <TableCell className="font-medium">{v.model_name}</TableCell>
                <TableCell>{v.generation ?? "-"}</TableCell>
                <TableCell>{v.body_type && <Badge variant="secondary">{v.body_type}</Badge>}</TableCell>
                <TableCell>{v.fuel_type && <Badge variant="outline">{v.fuel_type}</Badge>}</TableCell>
                <TableCell>{v.launched_at ?? "-"}</TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/vehicles/$vehicleId" params={{ vehicleId: v.id }}>
                      트림 <ChevronRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(v)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => {
                    if (confirm(`"${v.model_name}"을(를) 삭제하시겠습니까? 트림도 함께 삭제됩니다.`)) {
                      delMut.mutate(v.id);
                    }
                  }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}