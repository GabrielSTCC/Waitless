/** Fallback neutro na raiz — evita skeleton da landing em rotas como /q. */
export default function RootLoading() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-6">
      <div className="h-8 w-8 animate-pulse rounded-full bg-primary/35" aria-hidden />
      <p className="sr-only" role="status" aria-live="polite">
        Carregando…
      </p>
    </div>
  );
}
