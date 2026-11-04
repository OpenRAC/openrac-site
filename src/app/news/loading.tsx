/** Shown only the first time a page is built; pages already built never show it. Its shape matches the page, so nothing jumps. */
export default function NewsLoading() {
  return (
    <main aria-busy="true" aria-label="Loading the news" className="animate-pulse motion-reduce:animate-none">
      <div className="h-[clamp(280px,36vw,400px)] border-b border-line bg-gradient-to-br from-panel-hi to-ink" />
      <div className="mx-auto grid max-w-[820px] gap-4 px-4 pt-8">
        <div className="h-5 w-2/3 rounded bg-panel" />
        <div className="h-24 rounded bg-panel" />
        <div className="h-40 rounded-2xl bg-panel" />
        <div className="h-40 rounded-2xl bg-panel" />
      </div>
    </main>
  );
}
