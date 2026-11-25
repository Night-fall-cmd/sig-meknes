import { Photo, Icon, IconButton } from "./UI.jsx";
export default function PlaceCard({
  place,
  compact = false,
  selected = false,
  onClick,
  onSave,
  saved = false,
}) {
  return (
    <article
      className={`place-card ${compact ? "place-card--compact" : ""} ${selected ? "place-card--selected" : ""}`}
    >
      <button className="place-card__link" onClick={() => onClick(place)}>
        <div className="place-card__image">
          <Photo place={place} />
          <span className="place-card__category">{place.category}</span>
        </div>
        <div className="place-card__body">
          <span className="compact-category">{place.category}</span>
          <h3>{place.name}</h3>
          <p>{place.address || place.description}</p>
          <span className="place-card__details">
            <Icon name="pin" />
            Découvrir le lieu <Icon name="arrow" />
          </span>
        </div>
      </button>
      {onSave && (
        <IconButton
          name="heart"
          label={`${saved ? "Retirer" : "Enregistrer"} ${place.name}${saved ? " des favoris" : " dans les favoris"}`}
          active={saved}
          aria-pressed={saved}
          onClick={() => onSave(place)}
        />
      )}
    </article>
  );
}
