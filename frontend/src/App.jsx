import { previewFetch } from './previewApi.js';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Header, { Footer } from "./components/Header.jsx";
import SearchBar, { useVoice } from "./components/SearchBar.jsx";
import MapView from "./components/MapView.jsx";
import PlaceCard from "./components/PlaceCard.jsx";
import {
  Button,
  Icon,
  IconButton,
  Photo,
  Notice,
  Empty,
  Modal,
} from "./components/UI.jsx";
import { usePlaces, API_BASE } from "./hooks/usePlaces.js";
import { useStorage } from "./hooks/useStorage.js";
import {
  categories,
  categoryOf,
  filterPlaces,
  fold,
  hasCoordinates,
  moveStop,
  safeUrl,
} from "./lib/places.js";
import "./App.css";
const Context = createContext(null);
const useApp = () => useContext(Context);
const go = (path) => {
  window.location.hash = path;
};
const validPlaces = (v) =>
  Array.isArray(v) &&
  v.length <= 1000 &&
  v.every((p) => p && typeof p.id === "string" && typeof p.name === "string");
function Heading({ kicker, title, description, children }) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{kicker}</p>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children}
    </div>
  );
}
function Chips({ value, onChange, items = categories }) {
  return (
    <div className="chips" role="group" aria-label="Filtres">
      {items.map((c) => (
        <button
          key={c}
          className={`chip ${value === c ? "active" : ""}`}
          aria-pressed={value === c}
          onClick={() => onChange(c)}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
function Loading() {
  return (
    <div
      className="skeleton-list"
      role="status"
      aria-label="Chargement des lieux"
    >
      {[0, 1, 2].map((n) => (
        <div className="skeleton" key={n}>
          <div />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}
function DataState({ children, empty = false }) {
  const a = useApp();
  return a.loading ? (
    <Loading />
  ) : a.error ? (
    <Empty
      title="La carte fait une pause"
      message={a.error}
      action="Réessayer"
      onAction={a.reload}
    />
  ) : empty ? (
    <Empty
      title="Aucun lieu trouvé"
      message="Essayez un autre nom ou élargissez vos filtres."
      action="Effacer les filtres"
      onAction={a.resetFilters}
    />
  ) : (
    children
  );
}
function Cards({ places, compact = false }) {
  const a = useApp();
  return (
    <div className={compact ? "compact-list" : "places-grid"}>
      {places.map((p) => (
        <PlaceCard
          key={p.id}
          place={p}
          compact={compact}
          onClick={a.detail}
          onSave={compact ? undefined : a.toggleSave}
          saved={a.saved.some((s) => s.id === p.id)}
        />
      ))}
    </div>
  );
}
function Home() {
  const a = useApp();
  const featured = [...a.places]
    .sort((x, y) => {
      const rank = (p) =>
        /bab mansour/.test(fold(p.name))
          ? 0
          : /mausolee.*isma/.test(fold(p.name))
            ? 1
            : /medina de meknes|^souks de la medina$/.test(fold(p.name))
              ? 2
              : 3;
      return rank(x) - rank(y);
    })
    .slice(0, 3);
  const bab = a.places.find((p) => /bab mansour/.test(fold(p.name)));
  return (
    <div className="home page">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow gold">MAROC / LA CITÉ IMPÉRIALE</p>
          <h1>
            Une ville impériale.
            <br />
            Mille façons de
            <br />
            la découvrir.
          </h1>
          <p className="hero-description">
            Des portes monumentales aux ruelles de la médina.
            <br className="desktop-only" /> Explorez Meknès, composez votre
            parcours et laissez-vous guider.
          </p>
          <SearchBar
            value={a.search}
            onChange={a.setSearch}
            onSubmit={() => go("explore")}
          />
          <div className="hero-actions">
            <Button onPress={() => go("explore")}>Ouvrir la carte</Button>
            <Button variant="neutral" onPress={() => go("ai")}>
              Demander au guide IA
            </Button>
          </div>
          <div className="hero-trust">
            <span>
              <Icon name="pin" />
              {a.loading
                ? "Des lieux à découvrir"
                : `${a.places.length} lieux à explorer`}
            </span>
            <span>
              <Icon name="route" />
              Votre voyage, votre rythme
            </span>
          </div>
        </div>
        <button
          className="hero-photo"
          onClick={() => (bab ? a.detail(bab) : go("explore"))}
          aria-label="Découvrir Bab Mansour"
        >
          <img
            src="/images/bab-mansour.jpg"
            alt="La porte Bab Mansour à Meknès"
          />
          <span className="hero-badge">
            <Icon name="pin" />
            Meknès, Maroc
          </span>
          <span className="hero-caption">
            <small>L’ICÔNE DE MEKNÈS</small>
            <strong>Bab Mansour</strong>
            <span>Place El Hedim · Un premier pas dans l’histoire</span>
          </span>
        </button>
        <Button className="mobile-explore" onPress={() => go("explore")}>
          Explorer la carte
        </Button>
      </section>
      <section>
        <p className="eyebrow muted">À CHAQUE ENVIE, SA DÉCOUVERTE</p>
        <Chips
          value={a.category}
          onChange={(c) => {
            a.setCategory(c);
            go("explore");
          }}
        />
      </section>
      <section>
        <div className="section-heading">
          <div>
            <p className="eyebrow">PRENEZ LE TEMPS DE VOUS ÉMERVEILLER</p>
            <h2>Vos premières escales</h2>
          </div>
          <Button variant="neutral" onPress={() => go("explore")}>
            Voir tous les lieux
          </Button>
        </div>
        <DataState empty={!featured.length}>
          <Cards places={featured} />
        </DataState>
      </section>
      <section className="visit-banner">
        <div>
          <p className="eyebrow gold">UN PARCOURS QUI VOUS RESSEMBLE</p>
          <h2>Quelques heures ou toute une journée ?</h2>
          <p>
            Choisissez vos étapes. Notre guide vous aide à imaginer la suite.
          </p>
        </div>
        <div className="stack">
          <Button onPress={() => go("route")}>Créer mon itinéraire</Button>
          <Button variant="neutral" onPress={() => go("ai")}>
            Parler au guide IA
          </Button>
        </div>
      </section>
    </div>
  );
}
function Explore() {
  const a = useApp();
  const [view, setView] = useState("map");
  const selected =
    a.filtered.find((p) => p.id === a.selected?.id) || a.filtered[0];
  return (
    <div className={`explore page page-wide mobile-view-${view}`}>
      <Heading
        kicker="LE PATRIMOINE, À PORTÉE DE MAIN"
        title="Trouvez votre prochaine escale."
      >
        <SearchBar
          value={a.search}
          onChange={a.setSearch}
          onSubmit={() => setView("list")}
          placeholder="Rechercher un lieu…"
        />
      </Heading>
      <div className="filters-row">
        <Chips value={a.category} onChange={a.setCategory} />
        <Button variant="neutral" onPress={() => a.setModal("filters")}>
          Plus de filtres{a.radius ? " · " + a.radius + " km" : ""}
        </Button>
      </div>
      <div className="mobile-map-toggle">
        <button
          className="chip"
          onClick={() => setView(view === "map" ? "list" : "map")}
        >
          {view === "map" ? "Voir la liste" : "Voir la carte"}
        </button>
      </div>
      <div className="explore-layout">
        <section className="results">
          <div className="results-heading">
            <strong>{a.filtered.length} lieux à découvrir</strong>
            <span>Liste + carte</span>
          </div>
          <DataState empty={!a.filtered.length}>
            <div className="results-scroll">
              {a.filtered.map((p) => (
                <PlaceCard
                  key={p.id}
                  compact
                  place={p}
                  selected={selected?.id === p.id}
                  onClick={a.detail}
                />
              ))}
            </div>
          </DataState>
          <Notice>Les horaires sont à confirmer avant votre visite.</Notice>
        </section>
        <div className="explore-map">
          <MapView
            places={a.filtered}
            selectedPlace={selected}
            onSelectPlace={a.setSelected}
            onDetail={a.detail}
            origin={a.origin}
            onLocate={a.locate}
          />
          {!a.loading && !a.error && selected && (
            <div className="selected-place">
              <PlaceCard compact place={selected} onClick={a.detail} />
            </div>
          )}
          {(a.error || (!a.loading && !a.filtered.length)) && (
            <div className="map-feedback">
              <Empty
                title={
                  a.error ? "Les lieux sont indisponibles" : "Aucun lieu trouvé"
                }
                message={a.error || "Essayez une autre recherche."}
                action={a.error ? "Réessayer" : "Effacer les filtres"}
                onAction={a.error ? a.reload : a.resetFilters}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
function Detail() {
  const a = useApp();
  let id = "";
  try {
    id = decodeURIComponent(a.hash.split("/")[1] || "");
  } catch {
    /* Invalid shared URL: show the normal missing-place state. */
  }
  const p =
    a.places.find((p) => p.id === id) ||
    a.saved.find((p) => p.id === id) ||
    a.stops.find((p) => p.id === id);
  if (!p)
    return (
      <div className="page">
        <DataState>
          <Empty
            title="Lieu introuvable"
            message="Retrouvez les lieux disponibles sur la carte."
            action="Explorer la carte"
            onAction={() => go("explore")}
          />
        </DataState>
      </div>
    );
  const saved = a.saved.some((s) => s.id === p.id);
  return (
    <div className="page detail-page">
      <button className="back-link" onClick={() => go("explore")}>
        <Icon name="back" />
        Explorer / {p.category} / {p.name}
      </button>
      <Heading
        kicker={`${p.category.toUpperCase()} / MEKNÈS`}
        title={p.name}
        description={p.address}
      >
        <div className="row">
          <Button variant="neutral" onPress={() => a.toggleSave(p)}>
            {saved ? "Enregistré" : "Enregistrer"}
          </Button>
          <IconButton
            name="share"
            label="Partager ce lieu"
            onClick={() => a.share()}
          />
        </div>
      </Heading>
      <div className="gallery">
        <Photo place={p} />
        <figure>
          <img
            src="/images/medina.jpg"
            alt="Dans les ruelles de la médina de Meknès"
          />
          <figcaption>Dans les ruelles de la médina</figcaption>
        </figure>
      </div>
      <div className="detail-layout">
        <section>
          <h2>
            {/bab mansour/.test(fold(p.name))
              ? "Une porte sur l’histoire de Meknès"
              : "À la découverte de " + p.name}
          </h2>
          <p className="place-description">
            {p.description ||
              "Découvrez ce lieu et poursuivez votre exploration de Meknès."}
          </p>
          <div className="facts">
            <div>
              <Icon name="pin" />
              <strong>{p.address || "Meknès, Maroc"}</strong>
              <span>Médina et région de Meknès</span>
            </div>
            <div>
              <Icon name="clock" />
              <strong>Horaires à confirmer</strong>
              <span>{p.horaires || "Renseignez-vous avant votre visite."}</span>
            </div>
          </div>
          <p className="source-note">
            Source :{" "}
            {/^https?:\/\/[^\s;]+$/.test(p.source) && safeUrl(p.source) ? (
              <a href={safeUrl(p.source)} target="_blank" rel="noreferrer">
                Consulter la source du lieu ↗
              </a>
            ) : (
              p.source || "Inventaire touristique du projet"
            )}
          </p>
        </section>
        <aside className="panel visit-card">
          <h2>Une étape de votre voyage</h2>
          <p>
            Ajoutez ce lieu et construisez votre parcours autour de la médina.
          </p>
          <Button onPress={() => a.addStop(p)}>Ajouter à mon itinéraire</Button>
          <Button
            variant="neutral"
            onPress={() => {
              a.resetFilters();
              a.setSelected(p);
              go("explore");
            }}
          >
            Voir sur la carte
          </Button>
          <button
            className="text-button"
            onClick={() => {
              a.setQuestion(`Que découvrir autour de ${p.name} ?`);
              go("ai");
            }}
          >
            <Icon name="spark" />
            Que découvrir autour de ce lieu ?
          </button>
        </aside>
      </div>
    </div>
  );
}
function Planner() {
  const a = useApp();
  const [routing, setRouting] = useState(false),
    [route, setRoute] = useState(null),
    [routeError, setRouteError] = useState("");
  const request = useRef(null);
  useEffect(() => {
    request.current?.abort();
    setRoute(null);
    setRouteError("");
    setRouting(false);
    return () => request.current?.abort();
  }, [a.stops, a.mode]);
  async function calculate() {
    if (a.stops.length < 2) {
      setRouteError(
        "Ajoutez au moins deux étapes pour calculer votre parcours.",
      );
      return;
    }
    if (a.stops.some((p) => !hasCoordinates(p))) {
      setRouteError(
        "Une étape n’a pas de coordonnées. Retirez-la pour calculer le parcours.",
      );
      return;
    }
    request.current?.abort();
    const c = new AbortController();
    request.current = c;
    setRouting(true);
    setRouteError("");
    const timer = setTimeout(() => c.abort("timeout"), 15000);
    try {
      const r = await previewFetch(`${API_BASE}/route`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: a.mode,
          coordinates: a.stops.map((p) => [p.longitude, p.latitude]),
        }),
        signal: c.signal,
      });
      const data = await r.json().catch(() => null);
      if (!r.ok || !data)
        throw new Error(
          data?.detail ||
            "Le calcul est indisponible. Vos étapes sont conservées.",
        );
      if (!data.geometry?.coordinates?.length)
        throw new Error("Aucun parcours trouvé.");
      if (!c.signal.aborted) setRoute(data);
    } catch (e) {
      if (!c.signal.aborted || c.signal.reason === "timeout")
        setRouteError(
          e.name === "TypeError"
            ? "Le calcul est indisponible. Vos étapes sont conservées."
            : e.message || "Le calcul est indisponible.",
        );
    } finally {
      clearTimeout(timer);
      if (request.current === c) setRouting(false);
    }
  }
  return (
    <div className="page page-wide planner-page">
      <Heading
        kicker="VOTRE JOURNÉE, VOTRE RYTHME"
        title="Une balade dans la ville impériale"
        description={`${a.stops.length} étapes · Médina de Meknès`}
      >
        <div className="row">
          <Button
            variant="neutral"
            disabled={!a.stops.length}
            onPress={a.saveTrip}
          >
            Enregistrer
          </Button>
          <Button
            variant="neutral"
            disabled={!a.stops.length}
            onPress={() => a.share(true)}
          >
            Partager
          </Button>
        </div>
      </Heading>
      <div className="planner-layout">
        <section className="panel route-builder">
          <Chips
            value={
              { walking: "À pied", cycling: "À vélo", driving: "Voiture" }[
                a.mode
              ]
            }
            items={["À pied", "À vélo", "Voiture"]}
            onChange={(label) =>
              a.setMode(
                {
                  "À pied": "walking",
                  "À vélo": "cycling",
                  Voiture: "driving",
                }[label],
              )
            }
          />
          <p className="eyebrow muted">VOS ÉTAPES</p>
          {!a.stops.length && (
            <p>
              Votre balade commence avec un premier lieu. Ajoutez une étape
              depuis la carte.
            </p>
          )}
          <ol className="stops">
            {a.stops.map((p, i) => (
              <li key={p.id}>
                <span className="stop-number">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="stop-copy">
                  <button className="text-button" onClick={() => a.detail(p)}>
                    {p.name}
                  </button>
                  <small>
                    {i === 0 ? "Départ · " : ""}
                    {p.address || "Meknès"}
                  </small>
                </div>
                <div className="stop-controls">
                  <button
                    aria-label={`Monter ${p.name}`}
                    disabled={i === 0}
                    onClick={() => a.setStops((s) => moveStop(s, i, -1))}
                  >
                    ↑
                  </button>
                  <button
                    aria-label={`Descendre ${p.name}`}
                    disabled={i === a.stops.length - 1}
                    onClick={() => a.setStops((s) => moveStop(s, i, 1))}
                  >
                    ↓
                  </button>
                  <button
                    aria-label={`Retirer ${p.name} du parcours`}
                    onClick={() =>
                      a.setStops((s) => s.filter((x) => x.id !== p.id))
                    }
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ol>
          <Button
            variant="neutral"
            onPress={() => {
              a.setAdding(true);
              go("explore");
            }}
          >
            + Ajouter une étape
          </Button>
          <div className="route-custom">
            <h3>Un détour vous tente ?</h3>
            <p>
              Demandez au guide une halte gourmande ou un lieu à découvrir sur
              le chemin.
            </p>
            <Button onPress={() => go("ai")}>
              Personnaliser avec le guide
            </Button>
          </div>
          <div className="mobile-only">
            <Button
              disabled={routing || a.stops.length < 2}
              onPress={calculate}
            >
              {routing ? "Calcul en cours…" : "Calculer mon parcours"}
            </Button>
          </div>
        </section>
        <div className="route-map">
          <MapView places={a.stops} route={route} onDetail={a.detail} />
          <div className="route-summary panel">
            <h2>
              {route ? "Votre parcours est prêt" : "Votre parcours prend forme"}
            </h2>
            <p>
              {route
                ? `${(route.distance / 1000).toFixed(1)} km · ${Math.ceil(route.duration / 60)} min · Hors temps de visite`
                : "Calculez le parcours pour obtenir les distances et durées."}
            </p>
            <Button
              disabled={routing || a.stops.length < 2}
              onPress={calculate}
            >
              {routing ? "Calcul en cours…" : "Calculer mon parcours"}
            </Button>
          </div>
        </div>
      </div>
      {routeError && (
        <div className="error-notice" role="alert">
          <strong>Le calcul est indisponible</strong>
          <p>{routeError}</p>
          <Button variant="neutral" onPress={calculate} disabled={routing}>
            Réessayer
          </Button>
        </div>
      )}
      <Notice>
        Les horaires et l’accès aux sites sont à vérifier avant le départ. Votre
        itinéraire reste modifiable.
      </Notice>
    </div>
  );
}
function Guide() {
  const a = useApp();
  const [messages, setMessages] = useState([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const controller = useRef(null);
  const voice = useVoice(a.setQuestion);
  useEffect(() => () => controller.current?.abort(), []);
  const suggested = a.places
    .filter((p) => /bab mansour|place.*hedim|dar jama/i.test(fold(p.name)))
    .slice(0, 3);
  async function send(e) {
    e?.preventDefault();
    if (!a.question.trim() || busy) return;
    setError("");
    const endpoint = (import.meta.env.VITE_CHAT_ENDPOINT || '/api/chat');
    if (!endpoint) {
      setError(
        "Le guide conversationnel n’est pas encore disponible. Votre question est conservée ; explorez les suggestions locales ci-dessous.",
      );
      return;
    }
    const question = a.question.trim(),
      c = new AbortController();
    controller.current = c;
    setBusy(true);
    const timer = setTimeout(() => c.abort("timeout"), 130000);
    try {
      const r = await previewFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: question,
          history: messages,
          place_ids: a.stops.map((p) => p.id),
        }),
        signal: c.signal,
      });
      if (!r.ok) throw new Error();
      const data = await r.json();
      if (typeof data.answer !== "string" || !data.answer.trim())
        throw new Error();
      if (!c.signal.aborted) {
        setMessages((m) => [
          ...m,
          { role: "user", content: question },
          { role: "assistant", content: data.answer },
        ]);
        a.setQuestion("");
      }
    } catch {
      if (!c.signal.aborted || c.signal.reason === "timeout")
        setError(
          "Le guide ne répond pas. Votre question est conservée. Réessayez ou explorez la carte.",
        );
    } finally {
      clearTimeout(timer);
      if (controller.current === c) setBusy(false);
    }
  }
  return (
    <div className="page page-wide guide-page">
      <Heading
        kicker="VOTRE COMPAGNON DE DÉCOUVERTE"
        title="Meknès, racontée pour vous."
        description="Des idées de visites, du contexte et des sources pour aller plus loin."
      >
        <Button
          variant="neutral"
          onPress={() => {
            controller.current?.abort();
            controller.current = null;
            setBusy(false);
            setMessages([]);
            setError("");
            a.setQuestion("");
          }}
        >
          Nouvelle conversation
        </Button>
      </Heading>
      <div className="guide-layout">
        <section className="conversation panel">
          <div className="chat-history" aria-live="polite">
            {messages.map((m, i) => (
              <div key={i} className={`message message--${m.role}`}>
                <strong>
                  {m.role === "user" ? "Vous" : "Votre guide Meknès"}
                </strong>
                <p>{m.content}</p>
              </div>
            ))}
            {!messages.length && (
              <>
                <div className="sample-question">
                  Une demi-journée à Meknès : que découvrir autour de Bab
                  Mansour ?
                </div>
                <div className="guide-identity">
                  <Icon name="spark" />
                  Votre guide Meknès
                </div>
                <h2>Commencez par la cité impériale.</h2>
                <p>
                  Une suggestion locale issue de notre inventaire touristique, à
                  adapter à votre rythme.
                </p>
                <ol className="suggested-stops">
                  {suggested.map((p, i) => (
                    <li key={p.id}>
                      <span className="stop-number">{i + 1}</span>
                      <div>
                        <strong>{p.name}</strong>
                        <p>{p.description || p.address}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                {!suggested.length && (
                  <p>
                    Les suggestions apparaîtront lorsque les lieux seront
                    disponibles.
                  </p>
                )}
                <p className="source-note">
                  Source : inventaire touristique du projet · Horaires à
                  confirmer
                </p>
                <div className="row">
                  <Button
                    disabled={!suggested.length}
                    onPress={() => {
                      a.setStops(suggested);
                      go("route");
                    }}
                  >
                    Créer cet itinéraire
                  </Button>
                  <Button variant="neutral" onPress={() => go("explore")}>
                    Voir les lieux sur la carte
                  </Button>
                </div>
              </>
            )}
            {busy && <p role="status">Le guide prépare sa réponse…</p>}
            {error && (
              <div className="error-notice" role="alert">
                <p>{error}</p>
                <Button variant="neutral" onPress={send}>
                  Réessayer
                </Button>
              </div>
            )}
          </div>
          <form className="composer" onSubmit={send}>
            <label className="sr-only" htmlFor="question">
              Votre question au guide
            </label>
            <input
              id="question"
              value={a.question}
              onChange={(e) => a.setQuestion(e.target.value)}
              placeholder="Posez votre question sur Meknès…"
              maxLength={1000}
            />
            <IconButton
              name="mic"
              label="Dicter ma question"
              onClick={voice.start}
            />
            <button
              className="icon-button"
              type="submit"
              aria-label="Envoyer la question"
              disabled={busy || !a.question.trim()}
            >
              <Icon name="send" />
            </button>
          </form>
          {voice.message && <p role="status">{voice.message}</p>}
          <small>
            Le guide peut se tromper. Vérifiez les informations pratiques auprès
            des sources.
          </small>
        </section>
        <aside className="panel guide-aside">
          <img
            src="/images/medina.jpg"
            alt="Une ruelle de la médina de Meknès"
          />
          <h2>Laissez-vous inspirer</h2>
          <p>
            Le patrimoine, les saveurs et les ruelles de Meknès, selon vos
            envies.
          </p>
          {[
            "Que voir près de Bab Mansour ?",
            "Où découvrir l’artisanat local ?",
            "Une balade en famille ?",
          ].map((q) => (
            <button
              className="prompt"
              key={q}
              onClick={() => {
                a.setQuestion(q);
                document.getElementById("question")?.focus();
              }}
            >
              {q}
              <Icon name="arrow" />
            </button>
          ))}
        </aside>
      </div>
    </div>
  );
}
function Saved() {
  const a = useApp();
  const [tab, setTab] = useState("Lieux");
  return (
    <div className="page saved-page">
      <Heading
        kicker="VOS ENVIES, AU MÊME ENDROIT"
        title="Gardez une place pour vos coups de cœur."
        description="Retrouvez vos lieux et reprenez votre exploration quand vous le souhaitez."
      />
      <Chips value={tab} items={["Lieux", "Parcours"]} onChange={setTab} />
      {tab === "Lieux" ? (
        a.saved.length ? (
          <Cards places={a.saved} />
        ) : (
          <Empty
            title="Gardez vos découvertes"
            message="Touchez le cœur sur un lieu pour le retrouver ici."
            action="Découvrir des lieux"
            onAction={() => go("explore")}
          />
        )
      ) : null}
      {(tab === "Parcours" || a.trips.length > 0) && (
        <section className="saved-trips">
          {!a.trips.length ? (
            <Empty
              title="Votre prochain parcours"
              message="Choisissez vos étapes puis enregistrez votre balade."
              action="Créer un itinéraire"
              onAction={() => go("route")}
            />
          ) : (
            a.trips.map((trip) => (
              <article className="saved-trip panel" key={trip.id}>
                <img
                  src="/icons/d211e.png"
                  alt="Aperçu de la carte de Meknès"
                />
                <div>
                  <p className="eyebrow gold">MON ITINÉRAIRE</p>
                  <h2>{trip.name}</h2>
                  <p>
                    {trip.stops.length} étapes ·{" "}
                    {
                      {
                        walking: "À pied",
                        cycling: "À vélo",
                        driving: "Voiture",
                      }[trip.mode]
                    }
                  </p>
                </div>
                <Button
                  onPress={() => {
                    a.setStops(trip.stops);
                    a.setMode(trip.mode);
                    go("route");
                  }}
                >
                  Reprendre
                </Button>
                <button
                  className="icon-button"
                  aria-label={`Supprimer le parcours ${trip.name}`}
                  onClick={() =>
                    a.setTrips((t) => t.filter((x) => x.id !== trip.id))
                  }
                >
                  ×
                </button>
              </article>
            ))
          )}
        </section>
      )}
      <p className="source-note">
        Vos favoris sont conservés sur cet appareil. Aucun compte requis.
      </p>
    </div>
  );
}
export default function App() {
  const data = usePlaces();
  const [hash, setHash] = useState(() => location.hash.slice(1) || "home");
  const page = hash.split("/")[0];
  const [search, setSearch] = useState(""),
    [category, setCategory] = useState(categories[0]),
    [selected, setSelected] = useState(null),
    [origin, setOrigin] = useState(null),
    [radius, setRadius] = useState(null),
    [modal, setModal] = useState(""),
    [notice, setNotice] = useState(""),
    [question, setQuestion] = useState(""),
    [adding, setAdding] = useState(false),
    [shareUrl, setShareUrl] = useState("");
  const [saved, setSaved, saveError] = useStorage(
      "meknes:favorites:v1",
      [],
      validPlaces,
    ),
    [stops, setStops, stopError] = useStorage(
      "meknes:stops:v1",
      [],
      validPlaces,
    ),
    [trips, setTrips, tripError] = useStorage(
      "meknes:trips:v1",
      [],
      (v) =>
        Array.isArray(v) &&
        v.every(
          (t) =>
            typeof t.id === "string" &&
            typeof t.name === "string" &&
            validPlaces(t.stops) &&
            ["walking", "cycling", "driving"].includes(t.mode),
        ),
    ),
    [mode, setMode, modeError] = useStorage("meknes:mode:v1", "walking", (v) =>
      ["walking", "cycling", "driving"].includes(v),
    );
  useEffect(() => {
    const change = () => {
      setHash(location.hash.slice(1) || "home");
      setModal("");
      window.scrollTo(0, 0);
      requestAnimationFrame(() =>
        document.getElementById("main-content")?.focus({ preventScroll: true }),
      );
    };
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    if (!data.places.length || !hash.startsWith("route?")) return;
    const q = new URLSearchParams(hash.slice(6)),
      ids = (q.get("stops") || "").split(",").slice(0, 25);
    const shared = ids
      .map((id) => data.places.find((p) => p.id === id))
      .filter(Boolean);
    if (shared.length) {
      setStops([...new Map(shared.map((p) => [p.id, p])).values()]);
      const m = q.get("mode");
      if (["walking", "cycling", "driving"].includes(m)) setMode(m);
      go("route");
    }
  }, [hash, data.places]);
  const filtered = useMemo(
    () => filterPlaces(data.places, search, category, origin, radius),
    [data.places, search, category, origin, radius],
  );
  const resetFilters = () => {
    setSearch("");
    setCategory(categories[0]);
    setRadius(null);
  };
  const toggleSave = (p) => {
    setSaved((s) =>
      s.some((x) => x.id === p.id) ? s.filter((x) => x.id !== p.id) : [...s, p],
    );
    setNotice(
      saved.some((x) => x.id === p.id)
        ? "Lieu retiré des favoris."
        : "Lieu enregistré dans vos favoris.",
    );
  };
  const addStop = (p) => {
    if (stops.length >= 25 && !stops.some((s) => s.id === p.id)) {
      setNotice("Votre parcours peut contenir 25 étapes au maximum.");
      return;
    }
    setStops((s) => (s.some((x) => x.id === p.id) ? s : [...s, p]));
    setAdding(false);
    go("route");
  };
  const detail = (p) => {
    setSelected(p);
    if (adding) {
      addStop(p);
      return;
    }
    go("detail/" + encodeURIComponent(p.id));
  };
  const locate = () => {
    if (!navigator.geolocation) {
      setModal("geo");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setOrigin({
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
        });
        setNotice("Votre position est affichée sur la carte.");
      },
      () => setModal("geo"),
      { timeout: 10000, maximumAge: 60000 },
    );
  };
  const share = async (route = false) => {
    const u = new URL(location.href);
    if (route)
      u.hash =
        "route?" +
        new URLSearchParams({ stops: stops.map((p) => p.id).join(","), mode });
    setShareUrl(u.href);
    setModal("share");
  };
  const saveTrip = () => {
    const id = stops.map((p) => p.id).join("-") + "-" + mode;
    setTrips((t) => [
      ...t.filter((x) => x.id !== id),
      { id, name: "Une balade dans la ville impériale", stops, mode },
    ]);
    setNotice("Parcours enregistré.");
  };
  const a = {
    ...data,
    hash,
    search,
    setSearch,
    category,
    setCategory,
    selected,
    setSelected,
    origin,
    radius,
    setRadius,
    filtered,
    resetFilters,
    saved,
    toggleSave,
    stops,
    setStops,
    trips,
    setTrips,
    mode,
    setMode,
    question,
    setQuestion,
    detail,
    addStop,
    setAdding,
    locate,
    setModal,
    share,
    saveTrip,
  };
  const current = page.startsWith("route?") ? "route" : page;
  return (
    <Context.Provider value={a}>
      <div className="app-shell">
        <Header page={current} onLanguage={() => setModal("language")} />
        {adding && (
          <div className="adding-banner">
            Sélectionnez un lieu pour l’ajouter au parcours.{" "}
            <button
              onClick={() => {
                setAdding(false);
                go("route");
              }}
            >
              Annuler
            </button>
          </div>
        )}
        {(saveError || stopError || tripError || modeError) && (
          <Notice>
            Le stockage local est indisponible. Vos changements seront perdus à
            la fermeture.
          </Notice>
        )}
        <main id="main-content" tabIndex={-1}>
          {current === "home" ? (
            <Home />
          ) : current === "explore" ? (
            <Explore />
          ) : current === "detail" ? (
            <Detail />
          ) : current === "route" ? (
            <Planner />
          ) : current === "ai" ? (
            <Guide />
          ) : current === "saved" ? (
            <Saved />
          ) : (
            <Empty
              title="Page introuvable"
              message="Reprenez votre découverte de Meknès."
              action="Accueil"
              onAction={() => go("home")}
            />
          )}
        </main>
        {!["explore", "route", "ai"].includes(current) && <Footer />}
        {notice && (
          <div className="toast" role="status">
            {notice}
          </div>
        )}
        {modal && (
          <Modal
            title={
              {
                filters: "Affiner votre exploration",
                geo: "Position non disponible",
                share: "Partagez votre découverte",
                language: "Votre langue",
              }[modal]
            }
            onClose={() => setModal("")}
          >
            {modal === "filters" ? (
              <>
                <p className="eyebrow muted">CATÉGORIES</p>
                <Chips value={category} onChange={setCategory} />
                <p className="eyebrow muted">AUTOUR DE VOUS</p>
                <Chips
                  value={radius ? radius + " km" : "Toute la ville"}
                  items={["1 km", "3 km", "Toute la ville"]}
                  onChange={(r) => {
                    if (r === "Toute la ville") setRadius(null);
                    else {
                      setRadius(parseInt(r));
                      if (!origin) locate();
                    }
                  }}
                />
                <p>
                  Le filtre de proximité utilise votre position avec votre
                  accord.
                </p>
                <Button onPress={() => setModal("")}>Afficher les lieux</Button>
                <Button variant="neutral" onPress={resetFilters}>
                  Réinitialiser
                </Button>
              </>
            ) : modal === "geo" ? (
              <>
                <p>
                  Autorisez la localisation dans votre navigateur, ou explorez
                  Meknès sans partager votre position.
                </p>
                <Button
                  onPress={() => {
                    setRadius(null);
                    setModal("");
                  }}
                >
                  Continuer sans localisation
                </Button>
              </>
            ) : modal === "share" ? (
              <>
                <p>
                  Invitez vos proches à découvrir les mêmes étapes à Meknès.
                </p>
                <input
                  aria-label="Lien à partager"
                  readOnly
                  value={shareUrl}
                  onFocus={(e) => e.target.select()}
                />
                <Button
                  onPress={async () => {
                    try {
                      await navigator.clipboard.writeText(shareUrl);
                      setNotice("Lien copié.");
                      setModal("");
                    } catch {
                      setNotice("Sélectionnez le lien pour le copier.");
                    }
                  }}
                >
                  Copier le lien
                </Button>
              </>
            ) : (
              <>
                <Button onPress={() => setModal("")}>
                  Français · sélectionné
                </Button>
                <p>
                  Les versions anglaise et arabe seront disponibles
                  prochainement.
                </p>
                <Button variant="neutral" disabled>
                  English
                </Button>
                <Button variant="neutral" disabled>
                  العربية
                </Button>
              </>
            )}
          </Modal>
        )}
      </div>
    </Context.Provider>
  );
}
