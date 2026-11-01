"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

/**
 * A modal on the native <dialog>: the browser keeps focus inside, Esc closes it and the page behind
 * goes inert. Focus moves to the heading on open and back to what opened it on close. On a phone it
 * is a sheet from the bottom, its actions in thumb reach; the striped top edge echoes the header.
 */
export default function Sheet({ open, onClose, title, children, actions, wide = false }: { open: boolean; onClose: () => void; title: string; children: ReactNode; actions?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const opener = useRef<Element | null>(null);
  const id = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      opener.current = document.activeElement;
      d.showModal();
      heading.current?.focus();
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      onClose={() => {
        onClose();
        (opener.current as HTMLElement | null)?.focus?.();
      }}
      // A click on the backdrop (the dialog box itself, outside its content) closes it.
      onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
      className={`m-0 mt-auto w-full max-w-none overflow-hidden rounded-t-2xl border border-line bg-ink p-0 text-text shadow-[0_-20px_60px_rgb(0_0_0/0.6)] backdrop:bg-black/70 backdrop:backdrop-blur-[2px] min-[821px]:m-auto min-[821px]:rounded-2xl ${wide ? "min-[821px]:max-w-[720px]" : "min-[821px]:max-w-[520px]"}`}
    >
      <div aria-hidden className="h-1 bg-gradient-to-r from-brand via-amber to-brand" />
      <div className="flex max-h-[min(85svh,760px)] flex-col">
        <div className="overflow-y-auto overscroll-contain px-5 pb-4 pt-5 sm:px-6">
          <h2 id={id} ref={heading} tabIndex={-1} className="mb-3 font-audiowide text-[22px] leading-tight text-hi">
            {title}
          </h2>
          {children}
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-line px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-4 sm:px-6 min-[480px]:flex-row min-[480px]:justify-end">
          <button type="button" className="btn" onClick={() => ref.current?.close()}>
            Close
          </button>
          {actions}
        </div>
      </div>
    </dialog>
  );
}
