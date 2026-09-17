import type { ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export function Button({
  tone = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "primary" | "ghost" | "danger" | "line" }) {
  const tones = {
    primary: "bg-accent text-accent-fg hover:opacity-90",
    ghost: "bg-transparent text-fg hover:bg-bg-subtle",
    danger: "bg-danger/15 text-danger hover:bg-danger/25",
    line: "border border-line bg-bg-elev text-fg hover:bg-bg-subtle",
  };
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-[10px] px-4 text-sm font-medium transition-opacity disabled:opacity-40",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-10 w-full rounded-[10px] border border-line bg-bg px-3 text-sm text-fg outline-none placeholder:text-faint focus:border-muted",
        props.className,
      )}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "min-h-24 w-full rounded-[10px] border border-line bg-bg px-3 py-2 text-sm text-fg outline-none placeholder:text-faint focus:border-muted",
        props.className,
      )}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "h-10 w-full rounded-[10px] border border-line bg-bg px-3 text-sm text-fg outline-none focus:border-muted",
        props.className,
      )}
    />
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-xs font-medium tracking-wide text-muted">{children}</label>;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {hint ? <p className="mt-1 text-xs leading-relaxed text-muted">{hint}</p> : null}
    </div>
  );
}

export function Badge({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "ok" | "warn" | "danger" | "line";
}) {
  const map = {
    muted: "bg-bg-subtle text-muted",
    ok: "bg-ok/15 text-ok",
    warn: "bg-warn/15 text-warn",
    danger: "bg-danger/15 text-danger",
    line: "border border-line text-muted",
  };
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium", map[tone])}>{children}</span>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
  wide,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-bg/80 p-3 sm:items-center" onClick={onClose}>
      <div
        className={cn(
          "max-h-[90vh] overflow-y-auto rounded-[24px] border border-line bg-bg-elev p-5 shadow-2xl",
          wide ? "w-full max-w-3xl" : "w-full max-w-lg",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="font-display text-xl text-fg">{title}</h2>
          <button type="button" className="text-muted hover:text-fg" onClick={onClose}>
            Tutup
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Empty({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-[20px] border border-dashed border-line px-6 py-14 text-center">
      <p className="font-display text-lg text-fg">{title}</p>
      {hint ? <p className="mt-1 text-sm text-muted">{hint}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
