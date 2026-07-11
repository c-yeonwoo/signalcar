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
}: {
  src: string;
  alt: string;
  size?: "sm" | "md" | "lg";
}) {
  const h = size === "sm" ? "h-20" : size === "lg" ? "h-40" : "h-36";
  return (
    <div className={cn("w-full rounded-xl bg-white border border-slate-100 relative overflow-hidden", h)}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-contain object-center scale-110 drop-shadow-[0_10px_20px_rgba(0,0,0,0.22)]"
      />
    </div>
  );
}