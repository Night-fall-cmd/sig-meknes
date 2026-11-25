import { Icon } from "./UI.jsx";
export const destinations = [
  ["home", "Découvrir", "spark"],
  ["explore", "La carte", "map"],
  ["route", "Mon itinéraire", "route"],
  ["ai", "Guide IA", "spark"],
  ["saved", "Favoris", "heart"],
];
export function Brand() {
  return (
    <a href="#home" className="brand">
      <span className="brand-mark">M</span>
      <span className="brand-copy">
        <strong>meknès explorer</strong>
        <small>LA VILLE, AUTREMENT.</small>
      </span>
    </a>
  );
}
export default function Header({ page, onLanguage }) {
  return (
    <>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Aller au contenu
      </a>
      <header className="site-header">
        <Brand />
        <nav className="main-nav" aria-label="Navigation principale">
          {destinations.slice(0, 4).map(([key, label]) => (
            <a
              key={key}
              href={`#${key}`}
              aria-current={page === key ? "page" : undefined}
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="header-actions">
          <button
            className="language-button"
            onClick={onLanguage}
            aria-label="Langue : français"
          >
            <Icon name="globe" />
            FR
          </button>
          <a
            href="#saved"
            className={`icon-button desktop-only ${page === "saved" ? "is-active" : ""}`}
            aria-label="Mes favoris"
          >
            <Icon name="heart" />
          </a>
        </div>
      </header>
      <nav className="bottom-nav" aria-label="Navigation mobile">
        {destinations.map(([key, label, icon]) => (
          <a
            key={key}
            href={`#${key}`}
            aria-current={page === key ? "page" : undefined}
          >
            <Icon name={icon} />
            <span>
              {key === "explore"
                ? "Carte"
                : key === "route"
                  ? "Parcours"
                  : label}
            </span>
          </a>
        ))}
      </nav>
    </>
  );
}
export function Footer() {
  return (
    <footer className="site-footer">
      <Brand />
      <span>Le patrimoine au creux de la main.</span>
      <small>Meknès · Maroc</small>
    </footer>
  );
}
