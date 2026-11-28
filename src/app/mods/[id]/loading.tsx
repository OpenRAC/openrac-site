/** Shown only the first time a new mod's page is built; pages already built never show it. Skeleton
 * blocks where the page's parts will be, with a soft light passing over them. */
export default function ModLoading() {
  return (
    <main aria-busy="true" aria-label="Loading the mod" className="mx-auto max-w-[1360px] px-4 pb-16 pt-6 lg:grid lg:grid-cols-[232px_minmax(0,1fr)] lg:gap-12 lg:pl-6 lg:pr-10 xl:pr-14">
      <div className="grid content-start gap-3 max-lg:hidden">
        <span className="skeleton h-6 w-32" />
        <span className="skeleton mt-6 h-8" />
        <span className="skeleton h-8" />
      </div>
      <div className="grid content-start gap-5">
        <span className="skeleton h-11" />
        <div className="flex items-center gap-5">
          <span className="skeleton aspect-video w-[132px] sm:w-[184px]" />
          <span className="grid flex-1 gap-2">
            <span className="skeleton h-8 w-1/2" />
            <span className="skeleton h-5 w-1/3" />
          </span>
        </div>
        <span className="skeleton h-12 max-w-[720px]" />
        <div className="grid gap-x-12 gap-y-5 min-[1100px]:grid-cols-[minmax(0,1fr)_300px]">
          <span className="skeleton aspect-video" />
          <span className="skeleton h-80" />
        </div>
      </div>
    </main>
  );
}
