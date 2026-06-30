export default function RootLoading() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div className="sticky top-0 z-50 border-b border-outline-variant/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="h-8 w-28 animate-pulse rounded-lg bg-surface-container-high" />
          <div className="flex gap-2">
            <div className="h-9 w-9 animate-pulse rounded-lg bg-surface-container-high" />
            <div className="h-9 w-24 animate-pulse rounded-xl bg-primary/30" />
          </div>
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-16 sm:px-6 md:grid md:grid-cols-2 md:items-center md:py-24">
        <div className="space-y-4">
          <div className="h-6 w-24 animate-pulse rounded-full bg-primary/15" />
          <div className="h-12 w-full max-w-lg animate-pulse rounded-xl bg-surface-container-high" />
          <div className="h-12 w-4/5 max-w-md animate-pulse rounded-xl bg-surface-container-high" />
          <div className="h-20 w-full max-w-xl animate-pulse rounded-xl bg-surface-container-high" />
          <div className="flex gap-3 pt-2">
            <div className="h-11 w-40 animate-pulse rounded-xl bg-primary/30" />
            <div className="h-11 w-36 animate-pulse rounded-xl bg-surface-container-high" />
          </div>
        </div>
        <div className="mx-auto h-[520px] w-[340px] animate-pulse rounded-[2.75rem] bg-surface-container-high" />
      </div>
    </div>
  );
}
