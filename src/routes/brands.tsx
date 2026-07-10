import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/brands")({
  component: BrandsPage,
  ssr: false,
});

type Brand = {
  id: string;
  name: string;
  name_en: string | null;
  country: string | null;
  logo_url: string | null;
};

function BrandsPage() {
  const qc = useQueryClient();
  const { data: brands = [], isLoading } = useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brands").select("*").order("name");
      if (error) throw error;
      return data as Brand[];
    },
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [form, setForm] = useState({ name: "", name_en: "", country: "", logo_url: "" });

  function openNew() {
    setEditing(null);
    setForm({ name: "", name_en: "", country: "", logo_url: "" });
    setOpen(true);
  }
  function openEdit(b: Brand) {
    setEditing(b);
    setForm({
      name: b.name,
      name_en: b.name_en ?? "",
      country: b.country ?? "",
      logo_url: b.logo_url ?? "",
    });
    setOpen(true);
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        name_en: form.name_en.trim() || null,
        country: form.country.trim() || null,
        logo_url: form.logo_url.trim() || null,
      };
      if (!payload.name) throw new Error("브랜드명은 필수입니다");
      if (editing) {
        const { error } = await supabase.from("brands").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("brands").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "수정되었습니다" : "추가되었습니다");
      qc.invalidateQueries({ queryKey: ["brands"] });
      qc.invalidateQueries({ queryKey: ["counts"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("brands").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("삭제되었습니다");
      qc.invalidateQueries({ queryKey: ["brands"] });
      qc.invalidateQueries({ queryKey: ["counts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">브랜드</h1>
          <p className="text-sm text-muted-foreground">자동차 제조 브랜드를 관리합니다.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />브랜드 추가</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "브랜드 수정" : "브랜드 추가"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>브랜드명 (한글) *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="예: 현대" />
              </div>
              <div>
                <Label>영문명</Label>
                <Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} placeholder="Hyundai" />
              </div>
              <div>
                <Label>국가 코드</Label>
                <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="KR" />
              </div>
              <div>
                <Label>로고 URL</Label>
                <Input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://..." />
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

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>브랜드명</TableHead>
              <TableHead>영문명</TableHead>
              <TableHead>국가</TableHead>
              <TableHead className="w-24 text-right">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">불러오는 중…</TableCell></TableRow>
            ) : brands.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">등록된 브랜드가 없습니다.</TableCell></TableRow>
            ) : brands.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium flex items-center gap-2">
                  {b.logo_url && <img src={b.logo_url} alt="" className="h-5 w-5 object-contain" />}
                  {b.name}
                </TableCell>
                <TableCell>{b.name_en ?? "-"}</TableCell>
                <TableCell>{b.country ?? "-"}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(b)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => {
                    if (confirm(`"${b.name}" 브랜드를 삭제하시겠습니까? 관련 차종·트림도 모두 삭제됩니다.`)) {
                      deleteMut.mutate(b.id);
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