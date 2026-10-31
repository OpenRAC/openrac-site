/** Shown only the first time a new mod's page is built; pages already built never show it. */
export default function ModLoading() {
  return (
    <main aria-busy="true" aria-label="Loading the mod" className="animate-pulse">
      <div className="h-[clamp(300px,40vw,460px)] border-b border-line bg-gradient-to-br from-panel-hi to-ink" />
      <div className="mx-auto grid max-w-[1080px] gap-10 px-4 pt-8 min-[821px]:grid-cols-[1fr_280px]">
        <div className="grid gap-4">
          <div className="aspect-video rounded-2xl bg-panel" />
          <div className="h-6 w-1/3 rounded bg-panel" />
          <div className="h-24 rounded bg-panel" />
        </div>
        <div className="h-72 rounded-2xl bg-panel" />
      </div>
    </main>
  );
}
