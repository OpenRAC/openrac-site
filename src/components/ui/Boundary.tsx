"use client";

import { Component, type ReactNode } from "react";

/**
 * Keeps a failing part of a page to itself: if the gallery or the mod list throws while drawing,
 * that box says so and the rest of the page (README, Install, the other sections) keeps working.
 */
export default class Boundary extends Component<{ what: string; children: ReactNode; className?: string }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    // Shows in the visitor's console only; the server has its own log of server errors.
    console.error(`${this.props.what} failed`, error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className={`surface grid justify-items-center gap-2 px-6 py-10 text-center ${this.props.className ?? ""}`}>
        <p className="font-audiowide text-[20px] text-hi">Couldn&apos;t show the {this.props.what}</p>
        <p className="text-[15px] text-dim">The rest of the page still works. Reloading usually helps.</p>
        <button type="button" className="btn btn-sm" onClick={() => this.setState({ failed: false })}>
          Try again
        </button>
      </div>
    );
  }
}
