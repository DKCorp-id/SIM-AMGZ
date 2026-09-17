import { Link } from "@tanstack/react-router";
import { Button } from "./ui";

export function ForbiddenPage({
  message = "Anda tidak berhak melihat konten ini.",
}: {
  message?: string;
}) {
  return (
    <main className="grid min-h-[70vh] place-items-center px-6">
      <div className="max-w-md text-center">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted">403</p>
        <h1 className="mt-2 font-display text-3xl">Tidak berhak</h1>
        <p className="mt-3 text-sm text-muted">{message}</p>
        <Link to="/" className="mt-6 inline-block">
          <Button tone="line">Kembali</Button>
        </Link>
      </div>
    </main>
  );
}

export function isForbidden(err: unknown) {
  if (!(err instanceof Error)) return false;
  return err.name === "FORBIDDEN" || err.message.includes("tidak berhak");
}