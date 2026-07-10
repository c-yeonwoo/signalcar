import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/vehicles/$vehicleId")({
  component: VehicleDetail,
  ssr: false,
});

const OPTION_CATEGORIES = ["exterior","interior","convenience","safety","powertrain","package","other"] as const;
const PROMO_TYPES = ["cash","finance","trade_in","other"] as const;

type Trim = {
  id: string; vehicle_id: string; name: string;
  base_price: number | null; released_at: string | null;
  discontinued_at: string | null; notes: string | null;
};
type TrimOption = {
  id: string; trim_id: string;
  category: typeof OPTION_CATEGORIES[number];
  name: string; price: number | null; is_default: boolean; notes: string | null;
};
type Promotion = {
  id: string; trim_id: string; month: string;
  discount_type: typeof PROMO_TYPES[number]; amount: number;
  description: string | null; source_url: string | null;
};

function fmtWon(n: number | null | undefined) {
  if (n == null) return "-";
  return `₩${n.toLocaleString()}`;
}

function VehicleDetail() {
  const { vehicleId } = Route.useParams();
  const qc = useQueryClient();

  const { data: vehicle } = useQuery({
    queryKey: ["vehicle", vehicleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles").select("*, brand:brands(name)").eq("id", vehicleId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: trims = [] } = useQuery({
    queryKey: ["trims", vehicleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trims").select("*").eq("vehicle_id", vehicleId).order("base_price", { ascending: true });
      if (error) throw error;
      return data as Trim[];
    },
  });

  const [selectedTrim, setSelectedTrim] = useState<string | null>(null);
  const activeTrimId = selectedTrim ?? trims[0]?.id ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/vehicles"><ArrowLeft className="h-4 w-4 mr-1" />차종 목록</Link>
        </Button>
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {vehicle ? `${(vehicle as any).brand?.name ?? ""} ${vehicle.model_name}` : "로딩…"}
        </h1>
        {vehicle?.generation && <p className="text-sm text-muted-foreground">{vehicle.generation}</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <TrimsPanel
          vehicleId={vehicleId}
          trims={trims}
          activeTrimId={activeTrimId}
          onSelect={setSelectedTrim}
        />
        <div className="lg:col-span-2 space-y-4">
          {activeTrimId ? (
            <Tabs defaultValue="options">
              <TabsList>
                <TabsTrigger value="options">옵션</TabsTrigger>
                <TabsTrigger value="promotions">공식 프로모션</TabsTrigger>
              </TabsList>
              <TabsContent value="options">
                <OptionsPanel trimId={activeTrimId} />
              </TabsContent>
              <TabsContent value="promotions">
                <PromotionsPanel trimId={activeTrimId} />
              </TabsContent>
            </Tabs>
          ) : (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">좌측에서 트림을 먼저 추가하세요.</CardContent></Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Trims Panel ----------
function TrimsPanel({ vehicleId, trims, activeTrimId, onSelect }: {
  vehicleId: string; trims: Trim[]; activeTrimId: string | null; onSelect: (id: string) => void;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Trim | null>(null);
  const [form, setForm] = useState({ name: "", base_price: "", released_at: "", notes: "" });

  function openNew() {
    setEditing(null);
    setForm({ name: "", base_price: "", released_at: "", notes: "" });
    setOpen(true);
  }
  function openEdit(t: Trim) {
    setEditing(t);
    setForm({
      name: t.name,
      base_price: t.base_price?.toString() ?? "",
      released_at: t.released_at ?? "",
      notes: t.notes ?? "",
    });
    setOpen(true);
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("트림명 필수");
      const payload = {
        vehicle_id: vehicleId,
        name: form.name.trim(),
        base_price: form.base_price ? Number(form.base_price) : null,
        released_at: form.released_at || null,
        notes: form.notes.trim() || null,
      };
      if (editing) {
        const { error } = await supabase.from("trims").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("trims").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "수정됨" : "추가됨");
      qc.invalidateQueries({ queryKey: ["trims", vehicleId] });
      qc.invalidateQueries({ queryKey: ["counts"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trims").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("삭제됨");
      qc.invalidateQueries({ queryKey: ["trims", vehicleId] });
      qc.invalidateQueries({ queryKey: ["counts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">트림</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" onClick={openNew}>
              <Plus className="h-4 w-4 mr-1" />추가
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "트림 수정" : "트림 추가"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>트림명 *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="예: 프레스티지" /></div>
              <div><Label>기본 가격 (원)</Label><Input type="number" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: e.target.value })} placeholder="42000000" /></div>
              <div><Label>출시일</Label><Input type="date" value={form.released_at} onChange={(e) => setForm({ ...form, released_at: e.target.value })} /></div>
              <div><Label>메모</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>취소</Button>
              <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>저장</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-2">
        {trims.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground text-center">트림 없음</div>
        ) : (
          <div className="space-y-1">
            {trims.map((t) => (
              <div
                key={t.id}
                className={`p-2 rounded-md flex items-center justify-between cursor-pointer hover:bg-accent ${activeTrimId === t.id ? "bg-accent" : ""}`}
                onClick={() => onSelect(t.id)}
              >
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{fmtWon(t.base_price)}</div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEdit(t); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`"${t.name}" 트림을 삭제하시겠습니까?`)) delMut.mutate(t.id);
                  }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------- Options Panel ----------
function OptionsPanel({ trimId }: { trimId: string }) {
  const qc = useQueryClient();
  const { data: options = [] } = useQuery({
    queryKey: ["options", trimId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trim_options").select("*").eq("trim_id", trimId).order("category").order("name");
      if (error) throw error;
      return data as TrimOption[];
    },
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TrimOption | null>(null);
  const [form, setForm] = useState({
    category: "convenience" as TrimOption["category"],
    name: "", price: "", is_default: false, notes: "",
  });

  function openNew() {
    setEditing(null);
    setForm({ category: "convenience", name: "", price: "", is_default: false, notes: "" });
    setOpen(true);
  }
  function openEdit(o: TrimOption) {
    setEditing(o);
    setForm({ category: o.category, name: o.name, price: o.price?.toString() ?? "", is_default: o.is_default, notes: o.notes ?? "" });
    setOpen(true);
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("옵션명 필수");
      const payload = {
        trim_id: trimId,
        category: form.category,
        name: form.name.trim(),
        price: form.price ? Number(form.price) : 0,
        is_default: form.is_default,
        notes: form.notes.trim() || null,
      };
      if (editing) {
        const { error } = await supabase.from("trim_options").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("trim_options").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "수정됨" : "추가됨");
      qc.invalidateQueries({ queryKey: ["options", trimId] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trim_options").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["options", trimId] });
      toast.success("삭제됨");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">옵션 ({options.length})</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />옵션 추가</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "옵션 수정" : "옵션 추가"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>카테고리 *</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as TrimOption["category"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OPTION_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>옵션명 *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="예: 파노라마 선루프" /></div>
              <div><Label>가격 (원)</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0 = 기본 포함" /></div>
              <div className="flex items-center gap-2">
                <Checkbox id="is_default" checked={form.is_default} onCheckedChange={(c) => setForm({ ...form, is_default: !!c })} />
                <Label htmlFor="is_default" className="cursor-pointer">기본 포함 옵션</Label>
              </div>
              <div><Label>메모</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>취소</Button>
              <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>저장</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>카테고리</TableHead>
              <TableHead>옵션명</TableHead>
              <TableHead className="text-right">가격</TableHead>
              <TableHead>기본</TableHead>
              <TableHead className="w-20 text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {options.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">옵션 없음</TableCell></TableRow>
            ) : options.map((o) => (
              <TableRow key={o.id}>
                <TableCell><Badge variant="outline">{o.category}</Badge></TableCell>
                <TableCell className="font-medium">{o.name}</TableCell>
                <TableCell className="text-right">{fmtWon(o.price)}</TableCell>
                <TableCell>{o.is_default ? <Badge>기본</Badge> : "-"}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(o)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { if (confirm("삭제?")) delMut.mutate(o.id); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ---------- Promotions Panel ----------
function PromotionsPanel({ trimId }: { trimId: string }) {
  const qc = useQueryClient();
  const { data: promos = [] } = useQuery({
    queryKey: ["promos", trimId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("official_promotions").select("*").eq("trim_id", trimId).order("month", { ascending: false });
      if (error) throw error;
      return data as Promotion[];
    },
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const [form, setForm] = useState({
    month: defaultMonth,
    discount_type: "cash" as Promotion["discount_type"],
    amount: "", description: "", source_url: "",
  });

  function openNew() {
    setEditing(null);
    setForm({ month: defaultMonth, discount_type: "cash", amount: "", description: "", source_url: "" });
    setOpen(true);
  }
  function openEdit(p: Promotion) {
    setEditing(p);
    setForm({
      month: p.month, discount_type: p.discount_type,
      amount: p.amount.toString(),
      description: p.description ?? "", source_url: p.source_url ?? "",
    });
    setOpen(true);
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!form.month) throw new Error("월 필수");
      if (!form.amount) throw new Error("금액 필수");
      const payload = {
        trim_id: trimId,
        month: form.month,
        discount_type: form.discount_type,
        amount: Number(form.amount),
        description: form.description.trim() || null,
        source_url: form.source_url.trim() || null,
      };
      if (editing) {
        const { error } = await supabase.from("official_promotions").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("official_promotions").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "수정됨" : "추가됨");
      qc.invalidateQueries({ queryKey: ["promos", trimId] });
      qc.invalidateQueries({ queryKey: ["all-promotions"] });
      qc.invalidateQueries({ queryKey: ["counts"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("official_promotions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["promos", trimId] });
      qc.invalidateQueries({ queryKey: ["all-promotions"] });
      qc.invalidateQueries({ queryKey: ["counts"] });
      toast.success("삭제됨");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">공식 프로모션 ({promos.length})</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />프로모션 추가</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "프로모션 수정" : "프로모션 추가"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>월 (예: 2026-01-01) *</Label><Input type="date" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} /></div>
              <div>
                <Label>할인 유형 *</Label>
                <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v as Promotion["discount_type"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PROMO_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>금액 (원) *</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
              <div><Label>설명</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div><Label>출처 URL (제조사 공식 페이지)</Label><Input value={form.source_url} onChange={(e) => setForm({ ...form, source_url: e.target.value })} placeholder="https://..." /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>취소</Button>
              <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>저장</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>월</TableHead>
              <TableHead>유형</TableHead>
              <TableHead className="text-right">금액</TableHead>
              <TableHead>설명</TableHead>
              <TableHead className="w-20 text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {promos.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">등록된 프로모션이 없습니다</TableCell></TableRow>
            ) : promos.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.month.slice(0, 7)}</TableCell>
                <TableCell><Badge variant="secondary">{p.discount_type}</Badge></TableCell>
                <TableCell className="text-right">{fmtWon(p.amount)}</TableCell>
                <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">{p.description ?? "-"}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { if (confirm("삭제?")) delMut.mutate(p.id); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}