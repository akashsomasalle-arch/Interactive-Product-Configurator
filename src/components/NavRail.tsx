import type { ReactNode } from "react";
import { SECTIONS, config, useConfigurator } from "../store/ConfiguratorContext";
import type { SectionId } from "../types";

const NAV_ICONS: Record<SectionId, ReactNode> = {
  setup: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="4" y="4" width="16" height="16" rx="1" />
      <path d="M8 9h8M8 12h8M8 15h5" strokeLinecap="round" />
    </svg>
  ),
  color: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 1 0 18" fill="currentColor" opacity="0.15" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
  ),
  upload: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="5" width="18" height="14" rx="1" />
      <circle cx="9" cy="10" r="2" />
      <path d="M3 16l5-4 4 3 3-2.5 6 4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 2v6M12 4l3-3 3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  text: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 7V4h16v3M9 20h6M12 4v16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  quote: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 7h12v14H6z" />
      <path d="M9 7V5a3 3 0 0 1 6 0v2" strokeLinecap="round" />
    </svg>
  ),
  saved: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  ),
};

export function NavRail() {
  const { activeSection, switchSection, autoRotate, toggleAutoRotate, resetCamera } = useConfigurator();

  const nav = (id: SectionId, title: string, label: string, icon: ReactNode) => (
    <button
      className={`nav-item${activeSection === id ? " active" : ""}`}
      data-section={id}
      title={title}
      onClick={() => switchSection(id)}
    >
      <div className="nav-item__icon">{icon}</div>
      <span className="nav-item__label">{label}</span>
    </button>
  );

  return (
    <aside className="panel panel--left" id="panelLeft">
      <div className="nav-rail">
        <nav className="nav-items">
          {SECTIONS.map((id) => {
            const copy = config.ui.sectionNav[id];
            const icon = NAV_ICONS[id];
            if (!copy || !icon) return null;
            return nav(id, copy.title, copy.label, icon);
          })}
        </nav>

        <div className="nav-footer">
          <button
            className={`nav-item${autoRotate ? " active" : ""}`}
            id="auto-rotate-toggle"
            title="Toggle auto-rotate"
            onClick={toggleAutoRotate}
          >
            <div className="nav-item__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 3.2-6.85L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </div>
            <span className="nav-item__label">Rotate</span>
          </button>
          <button className="nav-item" id="resetCameraBtn" title="Reset view" onClick={resetCamera}>
            <div className="nav-item__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                <path d="M8 16H3v5" />
              </svg>
            </div>
            <span className="nav-item__label">Reset</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
