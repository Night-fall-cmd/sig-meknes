import { useMemo, useState } from 'react';
import Header from './components/Header.jsx';
import SearchBar from './components/SearchBar.jsx';
import MapView from './components/MapView.jsx';
import PlaceCard from './components/PlaceCard.jsx';
import { usePlaces } from './hooks/usePlaces.js';
import './App.css';

const CATEGORY_LABELS = {
  all: 'Tous les sites',
  monument: 'Monuments',
  culture: 'Culture',
  museum: 'Musées',
  nature: 'Nature',
  food: 'Gastronomie',
  accommodation: 'Hébergement',
};

function normalizeCategory(value = '') {
  const text = String(value).toLocaleLowerCase('fr').trim();
  if (
    /(monument|histor|patrimoine|mosque|mosquée|palais|porte|medina|médina)/i.test(
      text
    )
  )
    return 'Monuments';
  if (/(culture|musée|museum|art|galerie|artisan)/i.test(text))
    return 'Culture';
  if (/(nature|jardin|parc|forêt|forest)/i.test(text)) return 'Nature';
  if (/(restaurant|cuisine|gastronomie|food|café|cafe)/i.test(text))
    return 'Gastronomie';
  if (/(hotel|hôtel|riad|hébergement|accommodation)/i.test(text))
    return 'Hébergement';
  return value || 'Autre';
}

export default function App() {
  const { places, loading, error, reload } = usePlaces();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tous les sites');
  const [selectedPlace, setSelectedPlace] = useState(null);

  const categories = useMemo(() => {
    const fromApi = places.map((place) =>
      normalizeCategory(place.category || place.type)
    );
    return [
      'Tous les sites',
      ...Array.from(new Set(fromApi))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, 'fr')),
    ];
  }, [places]);

  const filteredPlaces = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('fr');
    return places.filter((place) => {
      const category = normalizeCategory(place.category || place.type);
      const matchesCategory =
        activeCategory === 'Tous les sites' || category === activeCategory;
      const haystack = [
        place.name,
        place.description,
        place.category,
        place.type,
        place.address,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('fr');
      return matchesCategory && (!query || haystack.includes(query));
    });
  }, [places, search, activeCategory]);

  return (
    <div className="app-shell">
      <Header />
      <main>
        <section className="hero">
          <div className="hero__content">
            <span className="eyebrow">
              <span className="eyebrow__dot" /> GUIDE TOURISTIQUE · MEKNÈS
            </span>
            <h1>
              La ville impériale,
              <br />
              <span>à votre rythme.</span>
            </h1>
            <p className="hero__description">
              Explorez le patrimoine, découvrez des lieux remarquables et
              préparez votre prochaine escapade à Meknès.
            </p>
            <div className="hero__search">
              <SearchBar value={search} onChange={setSearch} />
            </div>
            <div className="hero__trust">
              <span>
                <span className="mini-check">✓</span> Carte interactive
              </span>
              <span>
                <span className="mini-check">✓</span> Recherche rapide
              </span>
              <span>
                <span className="mini-check">✓</span> Lieux depuis la base de
                données
              </span>
            </div>
          </div>
          <div className="hero__visual" aria-hidden="true">
            <div className="visual-orbit visual-orbit--one" />
            <div className="visual-orbit visual-orbit--two" />
            <div className="visual-card">
              <div className="visual-card__top">
                <span>MEKNÈS</span>
                <span className="visual-card__star">✦</span>
              </div>
              <div className="visual-arch">
                <div className="visual-arch__inner" />
                <div className="visual-arch__door" />
              </div>
              <div className="visual-card__bottom">
                <span>Patrimoine & découvertes</span>
                <span>34°N · 5°W</span>
              </div>
            </div>
            <span className="floating-chip floating-chip--top">
              ✦ Une ville d’histoire
            </span>
            <span className="floating-chip floating-chip--bottom">
              <span className="status-dot" /> Explorez à votre façon
            </span>
          </div>
        </section>

        <section className="content-section" aria-labelledby="map-title">
          <div className="section-heading">
            <div>
              <span className="section-kicker">EXPLOREZ</span>
              <h2 id="map-title">La carte touristique</h2>
              <p>
                Retrouvez les sites géolocalisés fournis par la base de données.
              </p>
            </div>
            <div className="data-pill">
              <span className="data-pill__dot" />{' '}
              {loading
                ? 'Chargement…'
                : `${places.length} ${places.length === 1 ? 'site disponible' : 'sites disponibles'}`}
            </div>
          </div>
          <MapView
            places={filteredPlaces}
            selectedPlace={selectedPlace}
            onSelectPlace={setSelectedPlace}
          />
          {error && (
            <div className="notice notice--error" role="alert">
              <div>
                <strong>Impossible de charger les sites pour le moment.</strong>
                <p>
                  {error} Vérifiez l’URL de l’API dans le fichier{' '}
                  <code>.env</code>.
                </p>
              </div>
              <button
                className="button button--secondary"
                onClick={reload}
                type="button"
              >
                Réessayer
              </button>
            </div>
          )}
        </section>

        <section
          className="content-section places-section"
          aria-labelledby="places-title"
        >
          <div className="section-heading section-heading--places">
            <div>
              <span className="section-kicker">À DÉCOUVRIR</span>
              <h2 id="places-title">Explorez les sites</h2>
              <p>Filtrez par catégorie ou recherchez un lieu précis.</p>
            </div>
            <span className="result-count">
              {filteredPlaces.length} résultat
              {filteredPlaces.length > 1 ? 's' : ''}
            </span>
          </div>

          <div
            className="category-filters"
            role="group"
            aria-label="Filtrer par catégorie"
          >
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className={`category-button${activeCategory === category ? ' category-button--active' : ''}`}
                aria-pressed={activeCategory === category}
                onClick={() => setActiveCategory(category)}
              >
                {category === 'Tous les sites' ? (
                  <span className="category-button__icon">▦</span>
                ) : (
                  <span className="category-button__icon">✦</span>
                )}
                {category}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="places-grid" aria-label="Chargement des sites">
              {Array.from({ length: 6 }, (_, index) => (
                <div className="place-skeleton" key={index}>
                  <div />
                  <span />
                  <span />
                </div>
              ))}
            </div>
          ) : filteredPlaces.length ? (
            <div className="places-grid">
              {filteredPlaces.map((place, index) => (
                <PlaceCard
                  key={place.id ?? place._id ?? `${place.name}-${index}`}
                  place={place}
                  onClick={() => setSelectedPlace(place)}
                  selected={
                    selectedPlace &&
                    String(
                      selectedPlace.id ??
                        selectedPlace._id ??
                        selectedPlace.name
                    ) === String(place.id ?? place._id ?? place.name)
                  }
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state__icon">⌕</div>
              <h3>
                {places.length
                  ? 'Aucun résultat trouvé'
                  : 'Les sites arriveront ici'}
              </h3>
              <p>
                {places.length
                  ? 'Essayez un autre mot-clé ou choisissez une autre catégorie.'
                  : 'Quand l’API du backend sera connectée et renverra les sites, ils apparaîtront automatiquement ici et sur la carte.'}
              </p>
              {search || activeCategory !== 'Tous les sites' ? (
                <button
                  className="button button--secondary"
                  onClick={() => {
                    setSearch('');
                    setActiveCategory('Tous les sites');
                  }}
                  type="button"
                >
                  Effacer les filtres
                </button>
              ) : null}
            </div>
          )}
        </section>
      </main>

      <footer className="site-footer">
        <div className="site-footer__brand">
          <span className="brand-mark brand-mark--small">
            M<span>✦</span>
          </span>
          <span>
            <strong>Meknès Explorer</strong>
            <small>Le patrimoine au creux de la main.</small>
          </span>
        </div>
        <span>© {new Date().getFullYear()} · SIG Touristique Meknès</span>
      </footer>
    </div>
  );
}
