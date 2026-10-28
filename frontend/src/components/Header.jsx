import './Header.css';

export default function Header() {
  return (
    <header className="site-header">
      <a className="brand" href="#" aria-label="Meknès Explorer, accueil">
        <span className="brand-mark">
          M<span>✦</span>
        </span>
        <span className="brand-copy">
          <strong>Meknès Explorer</strong>
          <small>GUIDE TOURISTIQUE</small>
        </span>
      </a>
      <nav className="main-nav" aria-label="Navigation principale">
        <a className="main-nav__link main-nav__link--active" href="#map-title">
          Carte
        </a>
        <a className="main-nav__link" href="#places-title">
          Sites touristiques
        </a>
      </nav>
      <a className="header-cta" href="#places-title">
        Commencer à explorer <span>↗</span>
      </a>
    </header>
  );
}
