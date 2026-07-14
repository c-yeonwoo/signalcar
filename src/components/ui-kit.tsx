import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode, ButtonHTMLAttributes } from "react";
import type { Signal } from "@/lib/mock-cars";
import { cn } from "@/lib/utils";

/* ============================================================
 * 시그널카 공용 UI 킷 — 전 페이지에서 재사용되는 프리미티브.
 * 원칙:
 *  - 이모지 사용 금지 (색상·점·타이포로 위계 표현)
 *  - 카드/버튼/헤더/배지의 사이즈·그림자 단일화
 *  - 액센트 색은 signal 3종으로 한정
 * ============================================================ */

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  backTo,
  backLabel = "뒤로",
  right,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  backTo?: string;
  backLabel?: string;
  right?: ReactNode;
}) {
  return (
    <header className="px-5 pt-8 pb-4">
      {(backTo || right) && (
        <div className="flex items-center justify-between -mt-2 mb-3">
          {backTo ? (
            <Link to={backTo} className="inline-flex items-center gap-1 text-[12.5px] text-slate-500">
              <ArrowLeft className="h-3.5 w-3.5" /> {backLabel}
            </Link>
          ) : <span />}
          {right}
        </div>
      )}
      {eyebrow && <div className="sc-eyebrow">{eyebrow}</div>}
      <h1 className={cn("sc-h1", eyebrow && "mt-1.5")}>{title}</h1>
      {subtitle && <p className="sc-subtitle mt-2">{subtitle}</p>}
    </header>
  );
}

export function Card({
  className,
  children,
  as: As = "div",
  ...rest
}: {
  className?: string;
  children: ReactNode;
  as?: "div" | "section" | "article";
} & Record<string, unknown>) {
  return (
    <As className={cn("sc-card", className)} {...(rest as any)}>
      {children}
    </As>
  );
}

export function SectionTitle({
  children,
  right,
  className,
}: {
  children: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline justify-between mb-2", className)}>
      <h2 className="sc-section-title">{children}</h2>
      {right && <div className="text-[11px] text-slate-400">{right}</div>}
    </div>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { className?: string };

export function PrimaryButton({ className, children, ...rest }: BtnProps) {
  return (
    <button className={cn("sc-btn-primary", className)} {...rest}>
      {children}
    </button>
  );
}

export function GhostButton({ className, children, ...rest }: BtnProps) {
  return (
    <button className={cn("sc-btn-ghost", className)} {...rest}>
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------
 * StickyCTA — 페이지 하단(탭바 위)에 떠 있는 액션 바.
 * 전 페이지에서 동일한 위치·그림자·배경 흐림 톤을 유지한다.
 * ------------------------------------------------------------------ */

export function StickyCTA({
  children,
  above,
  className,
}: {
  children: ReactNode;
  above?: ReactNode; // CTA 위 세컨더리 링크 (선택)
  className?: string;
}) {
  return (
    <div className={cn("fixed bottom-[68px] left-1/2 -translate-x-1/2 w-full max-w-[480px] px-4 z-30", className)}>
      {above && <div className="flex justify-center mb-1.5">{above}</div>}
      <div className="rounded-2xl bg-white/85 backdrop-blur border border-slate-100 p-2 shadow-[0_10px_30px_rgba(15,27,61,0.18)]">
        {children}
      </div>
    </div>
  );
}

export function NavyCTA({
  className,
  children,
  ...rest
}: BtnProps) {
  return (
    <button
      className={cn(
        "w-full inline-flex items-center justify-center rounded-xl bg-[color:var(--color-brand-navy)] text-white py-3 font-semibold text-[13.5px] active:opacity-90 transition",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

const SIGNAL_STYLE: Record<Signal, { dot: string; bg: string; text: string; label: string }> = {
  buy: { dot: "#16a34a", bg: "bg-[color:var(--color-signal-buy-soft)]", text: "text-[color:var(--color-signal-buy)]", label: "지금 사도 좋음" },
  wait: { dot: "#f59e0b", bg: "bg-[color:var(--color-signal-wait-soft)]", text: "text-[color:var(--color-signal-wait)]", label: "조금 더 기다려요" },
  neutral: { dot: "#64748b", bg: "bg-[color:var(--color-signal-neutral-soft)]", text: "text-[color:var(--color-signal-neutral)]", label: "관망" },
};

export function SignalPill({
  signal,
  label,
  size = "md",
}: {
  signal: Signal;
  label?: string;
  size?: "sm" | "md";
}) {
  const s = SIGNAL_STYLE[signal];
  const pad = size === "sm" ? "px-2 py-0.5 text-[10.5px]" : "px-2.5 py-1 text-[11px]";
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full font-semibold", pad, s.bg, s.text)}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} />
      {label ?? s.label}
    </span>
  );
}

export function TabPills<T extends string>({
  value,
  onChange,
  tabs,
}: {
  value: T;
  onChange: (v: T) => void;
  tabs: { id: T; label: ReactNode }[];
}) {
  return (
    <div className="inline-flex w-full bg-slate-100 rounded-full p-1 gap-1">
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={cn(
              "flex-1 rounded-full py-1.5 text-[12.5px] font-semibold transition",
              active ? "bg-white text-[color:var(--color-brand-navy)] shadow-sm" : "text-slate-500",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export function CarThumb({
  src,
  alt,
  size = "md",
  fallbackClassName,
}: {
  src?: string;
  alt: string;
  size?: "sm" | "md" | "lg";
  fallbackClassName?: string;
}) {
  const h = size === "sm" ? "h-20" : size === "lg" ? "h-40" : "h-36";
  return (
    <div className={cn("w-full rounded-xl bg-white border border-slate-100 relative overflow-hidden", h)}>
      {src ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-contain object-center scale-110 drop-shadow-[0_10px_20px_rgba(0,0,0,0.22)]"
        />
      ) : (
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-br opacity-40",
            fallbackClassName ?? "from-slate-300 to-slate-500",
          )}
          aria-hidden
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------
 * SampleSize — 실거래 표본 크기와 신뢰도를 한 줄 배지로.
 * 데이터가 얼마나 두꺼운지 매 데이터 카드마다 노출해서
 * "우리는 진짜 실거래 위에 코칭한다"는 시그널을 보강한다.
 * ------------------------------------------------------------------ */

export function sampleConfidence(n: number): { level: "low" | "mid" | "high"; label: string; hex: string } {
  if (n >= 40) return { level: "high", label: "신뢰 충분", hex: "#16a34a" };
  if (n >= 15) return { level: "mid", label: "신뢰 보통", hex: "#f59e0b" };
  return { level: "low", label: "표본 부족", hex: "#94a3b8" };
}

export function SampleSize({
  count,
  months = 6,
  compact = false,
  className,
}: {
  count: number;
  months?: number;
  compact?: boolean;
  className?: string;
}) {
  const c = sampleConfidence(count);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[10.5px] text-slate-500 tabular-nums",
        className,
      )}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: c.hex }}
        aria-hidden
      />
      실계약 {count}건 · 최근 {months}개월
      {!compact && <span className="text-slate-400">· {c.label}</span>}
    </span>
  );
}