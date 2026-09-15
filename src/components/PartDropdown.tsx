import type { ReactNode } from "react";
import { useConfigurator } from "../store/ConfiguratorContext";
import { formatPartLabel } from "../utils";

export function PartDropdown({ id }: { id: string }) {
  const { parts, activePart, openDropdown, toggleDropdown, setActivePart, closeDropdowns } = useConfigurator();
  const open = openDropdown === id;

  return (
    <div className={`custom-dropdown${open ? " is-open" : ""}`} id={id}>
      <button
        className="dropdown-trigger"
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggleDropdown(id);
        }}
      >
        <div className="dropdown-trigger-left">
          <span className="active-part-dot" />
          <span className="active-part-name">{formatPartLabel(activePart)}</span>
        </div>
        <span className="dropdown-arrow">▼</span>
      </button>
      <ul className="dropdown-list">
        {parts.map((part) => (
          <li
            key={part}
            className={`dropdown-item${part === activePart ? " active" : ""}`}
            data-part={part}
            onClick={(e) => {
              e.stopPropagation();
              setActivePart(part);
              closeDropdowns();
            }}
          >
            {formatPartLabel(part)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SectionShell({
  eyebrow,
  title,
  sub,
  children,
  hidden,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  children: ReactNode;
  hidden: boolean;
}) {
  return (
    <div className={`section-panel${hidden ? " hidden" : ""}`}>
      <header className="panel__head">
        <span className="panel__eyebrow">{eyebrow}</span>
        <h2 className="panel__title">{title}</h2>
        {sub ? <p className="panel__sub">{sub}</p> : null}
      </header>
      {children}
    </div>
  );
}
