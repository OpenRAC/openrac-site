/** Shown only the first time a new mod's page is built; pages already built never show it. */
export default function ModLoading() {
  return (
    <main aria-busy="true" aria-label="Loading the mod" className="mx-auto grid min-h-[80vh] max-w-[1360px] place-items-center px-4">
      <span className="spinner" />
    </main>
  );
}
