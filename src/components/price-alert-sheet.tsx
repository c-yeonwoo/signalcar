import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { formatKRW, type MockCar } from "@/lib/mock-cars";
import { clearAlert, getAlert, setAlert } from "@/lib/alerts-store";

type Props = {
  car: MockCar;
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

const PRESETS = [
  { pct: 3, label: "-3%" },
  { pct: 5, label: "-5%" },
  { pct: 8, label: "-8%" },
];

export function PriceAlertSheet({ car, open, onOpenChange }: Props) {
  const [target, setTarget] = useState<number>(car.medianContract);
  const [existing, setExisting] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const cur = getAlert(car.id);
    setExisting(cur?.targetPrice ?? null);
    setTarget(cur?.targetPrice ?? Math.round(car.medianContract * 0.97));
  }, [open, car.id, car.medianContract]);

  const pctVsMedian = Math.round(((target - car.medianContract) / car.medianContract) * 1000) / 10;

  const applyPreset = (pct: number) => {
    setTarget(Math.round(car.medianContract * (1 - pct / 100)));
  };

  const save = () => {
    if (!target || target <= 0) {
      toast.error("목표가를 입력해주세요");
      return;
    }
    setAlert(car.id, target);
    toast.success(`목표가 ${formatKRW(target)} 알림을 켰어요`);
    onOpenChange(false);
  };

  const remove = () => {
    clearAlert(car.id);
    toast.success("목표가 알림을 껐어요");
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-w-[480px] mx-auto pb-8">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2 text-[color:var(--color-brand-navy)]">
            <Bell className="h-4 w-4" /> 목표가 알림
          </SheetTitle>
        </SheetHeader>
        <div className="mt-2">
          <p className="text-[12.5px] text-slate-500">
            {car.brand} · <span className="font-semibold text-slate-700">{car.model}</span>
          </p>
          <p className="text-[11.5px] text-slate-400 mt-0.5 tabular-nums">
            지금 실거래 중앙값 {formatKRW(car.medianContract)}
          </p>

          <div className="mt-4 flex gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.pct}
                onClick={() => applyPreset(p.pct)}
                className="flex-1 rounded-xl bg-slate-100 py-2 text-[12.5px] font-semibold text-slate-700 active:scale-[0.98]"
              >
                {p.label}
              </button>
            ))}
          </div>

          <label className="mt-4 block">
            <span className="text-[11.5px] text-slate-500">직접 입력 (원)</span>
            <input
              type="number"
              value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[15px] font-semibold text-[color:var(--color-brand-navy)] tabular-nums"
            />
          </label>

          <div className="mt-2 flex items-center justify-between text-[12px]">
            <span className="text-slate-500">중앙값 대비</span>
            <span
              className={`font-semibold tabular-nums ${
                pctVsMedian < 0
                  ? "text-[color:var(--color-signal-buy)]"
                  : pctVsMedian > 0
                    ? "text-[color:var(--color-signal-wait)]"
                    : "text-slate-500"
              }`}
            >
              {pctVsMedian > 0 ? "+" : ""}
              {pctVsMedian}%
            </span>
          </div>

          <div className="mt-5 flex gap-2">
            {existing && (
              <button
                onClick={remove}
                className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-3 text-[12.5px] font-semibold text-slate-600"
              >
                <X className="h-3.5 w-3.5" /> 알림 끄기
              </button>
            )}
            <button
              onClick={save}
              className="flex-1 rounded-xl bg-[color:var(--color-brand-navy)] py-3 text-[13.5px] font-semibold text-white active:opacity-90"
            >
              {existing ? "목표가 저장" : "알림 켜기"}
            </button>
          </div>

          <p className="mt-3 text-[11px] text-slate-400 leading-snug">
            시그널카가 이 차의 실거래 중앙값이 목표가에 도달하면 홈에서 알려드려요.
            {" "}이메일·푸시 알림은 곧 추가돼요.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}