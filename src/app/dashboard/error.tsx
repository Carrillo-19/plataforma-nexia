"use client";

import { TriangleAlertIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <TriangleAlertIcon className="size-6" aria-hidden="true" />
      </span>
      <div className="grid gap-1">
        <h2 className="text-lg font-semibold">Algo salió mal</h2>
        <p className="text-sm text-muted-foreground">
          No pudimos cargar esta sección. Si el problema persiste, comparte este código con soporte.
        </p>
        {error.digest && <code className="text-xs text-muted-foreground">{error.digest}</code>}
      </div>
      <Button onClick={() => retry()} className="active:scale-[0.98]">
        Reintentar
      </Button>
    </div>
  );
}
