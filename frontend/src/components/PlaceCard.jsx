import './PlaceCard.css';

function categoryLabel(place) {
  return place.category || place.type || 'Site touristique';
}

export default function PlaceCard({ place, onClick, selected }) {
  const image = place.image || place.image_url || place.photo || '';
  return (
    <button
      type="button"
      className={`place-card${selected ? ' place-card--selected' : ''}`}
      onClick={onClick}
    >
      <div className="place-card__image">
        {image ? (
          <img
            src={image}
            alt=""
            loading="lazy"
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="place-card__placeholder">
            <span>✦</span>
            <small>MEKNÈS · PATRIMOINE</small>
          </div>
        )}
        <span className="place-card__category">{categoryLabel(place)}</span>
      </div>
      <div className="place-card__body">
        <div className="place-card__title-row">
          <h3>{place.name}</h3>
          <span className="place-card__arrow">↗</span>
        </div>
        {place.address && (
          <p className="place-card__address">⌖ {place.address}</p>
        )}
        <p className="place-card__description">
          {place.description ||
            'Découvrez ce lieu remarquable et ajoutez-le à votre exploration de Meknès.'}
        </p>
        <span className="place-card__details">
          Voir sur la carte <span>→</span>
        </span>
      </div>
    </button>
  );
}
