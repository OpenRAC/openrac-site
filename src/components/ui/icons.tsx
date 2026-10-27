/** Small inline icons used in several places. Decorative: screen readers skip them, the link text names the target. */

/** Discord's mark. */
export function DiscordIcon({ className = "size-[18px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`flex-none fill-current ${className}`}>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

/** GitHub's mark. */
export function GithubIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={`flex-none fill-current ${className}`}>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38v-1.33c-2.23.48-2.7-1.07-2.7-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.05-.49.05-.49.8.06 1.23.83 1.23.83.71 1.22 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

/** The arrow at the end of a link row; it nudges right when its row (a `group`) is hovered. */
export function Arrow() {
  return <span aria-hidden className="ml-auto flex-none text-brand transition-transform group-hover:translate-x-0.5">→</span>;
}

/** The mark of each system the launcher is built for, in the text colour (Tux keeps his belly, beak and feet). */
export function SystemIcon({ id, className = "size-7" }: { id: "windows" | "macos" | "linux" | "android"; className?: string }) {
  const svg = `flex-none fill-current ${className}`;
  switch (id) {
    case "windows":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={svg}>
          <path d="M3 5.6 10.4 4.6v7H3zM11.4 4.4 21 3v8.6h-9.6zM3 12.6h7.4v7L3 18.4zM11.4 12.6H21V21l-9.6-1.4z" />
        </svg>
      );
    case "macos":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={svg}>
          <path d="M16.4 12.7c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.9-3.5.9-.8 0-1.9-.8-3.1-.8-1.6 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.3.9-1.3 1.3-2.6 1.3-2.6s-2.4-1-2.4-3.8zM14.1 5.8c.6-.8 1.1-1.9 1-3-1 0-2.1.6-2.7 1.4-.6.7-1.1 1.8-1 2.9 1 .1 2.1-.5 2.7-1.3z" />
        </svg>
      );
    case "linux":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={`flex-none ${className}`}>
          <path className="fill-current" d="M12 1.8c-2.7 0-4.3 2.2-4.3 5v2.1c0 1-.5 1.8-1.2 2.8-1.1 1.6-2.3 3.6-2.3 6 0 2.6 3.2 4.5 7.8 4.5s7.8-1.9 7.8-4.5c0-2.4-1.2-4.4-2.3-6-.7-1-1.2-1.8-1.2-2.8V6.8c0-2.8-1.6-5-4.3-5z" />
          <ellipse cx="12" cy="15.6" rx="3.9" ry="5" fill="#f4efe6" />
          <circle cx="10.4" cy="6.6" r="1.1" fill="#f4efe6" />
          <circle cx="13.6" cy="6.6" r="1.1" fill="#f4efe6" />
          <circle cx="10.6" cy="6.8" r=".5" fill="#12121a" />
          <circle cx="13.4" cy="6.8" r=".5" fill="#12121a" />
          <path d="M10.3 8.7c.5-.6 1-.8 1.7-.8s1.2.2 1.7.8c-.4.7-1 1.1-1.7 1.1s-1.3-.4-1.7-1.1z" fill="#ffb443" />
          <path d="M4.4 20.4c.2-1.4 1.4-2.2 2.6-1.8l1.8.7c.8.3.9 1.3.2 1.8-1.1.8-2.6 1.1-3.8.6-.6-.2-.9-.7-.8-1.3zM19.6 20.4c-.2-1.4-1.4-2.2-2.6-1.8l-1.8.7c-.8.3-.9 1.3-.2 1.8 1.1.8 2.6 1.1 3.8.6.6-.2.9-.7.8-1.3z" fill="#ffb443" />
        </svg>
      );
    case "android":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={svg}>
          <path fillRule="evenodd" d="M7.2 4.1a.6.6 0 0 1 .8.2l1.4 2.4A9 9 0 0 1 12 6.3c.9 0 1.8.1 2.6.4L16 4.3a.6.6 0 1 1 1 .6l-1.3 2.3A8 8 0 0 1 20.6 14H3.4a8 8 0 0 1 4.9-6.8L7 4.9a.6.6 0 0 1 .2-.8zM8.3 10.2a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm7.4 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2zM3.4 15.4h17.2v2.2a2.4 2.4 0 0 1-2.4 2.4H5.8a2.4 2.4 0 0 1-2.4-2.4z" />
        </svg>
      );
  }
}
