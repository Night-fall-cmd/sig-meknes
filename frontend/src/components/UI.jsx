import { useEffect, useRef, useState } from "react";
const icons = {
  globe: "886a3",
  heart: "dec5d",
  search: "b0d5a",
  mic: "e5004",
  pin: "51d39",
  route: "fcb0b",
  arrow: "fbf3c",
  back: "a7c36",
  share: "a6d6c",
  clock: "3aa8e",
  info: "ce580",
  spark: "677ec",
  send: "04649",
  locate: "392e7",
  map: "a663e",
  menu: "3dac0",
  walk: "3a8a5",
};
export function Icon({ name, className = "" }) {
  return (
    <span className={`icon ${className}`} aria-hidden="true">
      <img src={`/icons/${icons[name] || icons.info}.svg`} alt="" />
    </span>
  );
}
// Figma's SDS "primitives" package is not installed in this project.
// Preserve its Button API using the native React implementation and local tokens.
export function Button({
  children,
  onPress,
  variant = "primary",
  className = "",
  ...props
}) {
  return (
    <button
      type="button"
      className={`button ${variant === "primary" ? "" : "button--secondary"} ${className}`}
      onClick={onPress}
      {...props}
    >
      {children}
    </button>
  );
}
export function IconButton({ name, label, onClick, active, ...props }) {
  return (
    <button
      type="button"
      className={`icon-button ${active ? "is-active" : ""}`}
      aria-label={label}
      title={label}
      onClick={onClick}
      {...props}
    >
      <Icon name={name} />
    </button>
  );
}
export function Photo({ place, className = "" }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [place.image]);
  return place.image && !failed ? (
    <img
      className={`place-photo ${className}`}
      src={place.image}
      alt={place.name}
      onError={() => setFailed(true)}
    />
  ) : (
    <div className={`photo-placeholder ${className}`}>
      <Icon name="pin" />
      <span>{place.category}</span>
      <small>Photo à venir</small>
    </div>
  );
}
export function Notice({ children }) {
  return (
    <div className="notice">
      <Icon name="info" />
      <span>{children}</span>
    </div>
  );
}
export function Empty({ title, message, action, onAction }) {
  return (
    <section className="empty-state">
      <Icon name="info" />
      <h2>{title}</h2>
      <p>{message}</p>
      {action && <Button onPress={onAction}>{action}</Button>}
    </section>
  );
}
export function Modal({ title, children, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current,
      previous = document.activeElement;
    el.showModal();
    return () => {
      el.close();
      previous?.focus?.();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby="modal-title"
      onCancel={onClose}
    >
      <div className="modal-heading">
        <h2 id="modal-title">{title}</h2>
        <button className="icon-button" aria-label="Fermer" onClick={onClose}>
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
