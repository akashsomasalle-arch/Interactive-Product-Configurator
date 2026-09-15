import { appConfig, landingPath } from "../../lib/appLocation";

interface SiteHeaderProps {
  home?: boolean;
  title?: string;
  onHome?: () => void;
}

export function SiteHeader({ home = false, title, onHome }: SiteHeaderProps) {
  const logo = <img src={appConfig.landing.logo.src} alt={appConfig.landing.logo.alt} />;

  return (
    <header className="site-header">
      <div className="site-header-inner">
        {home ? (
          <span className="site-logo">{logo}</span>
        ) : (
          <a
            href={landingPath()}
            className="site-logo"
            aria-label="Home"
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
                return;
              }
              if (!onHome) return;
              event.preventDefault();
              onHome();
            }}
          >
            {logo}
          </a>
        )}
        {title ? <div className="site-header-title">{title}</div> : <span />}
        <span className="site-header-end" />
      </div>
    </header>
  );
}
