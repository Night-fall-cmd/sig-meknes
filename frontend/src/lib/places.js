export const fold = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export const categories = [
  "Tous les lieux",
  "Monuments",
  "Culture",
  "Loisirs",
  "Gastronomie",
  "Hébergement",
  "Transport",
];
export function categoryOf(value) {
  const text = fold(value);
  if (/monument|histor|patrimoine|mosque|palais|porte|medina/.test(text))
    return "Monuments";
  if (/culture|musee|museum|art|galerie/.test(text)) return "Culture";
  if (/restaurant|cuisine|gastronomie|food|cafe/.test(text))
    return "Gastronomie";
  if (/hotel|riad|hebergement|accommodation/.test(text)) return "Hébergement";
  if (/nature|jardin|parc|loisir/.test(text)) return "Loisirs";
  return value || "Autre";
}
const number = (v) =>
  v == null || v === "" ? null : Number.isFinite(Number(v)) ? Number(v) : null;
export function imageFor(p) {
  const n = fold(p.name);
  if (/bab mansour/.test(n)) return "/images/bab-mansour.jpg";
  if (/mausolee.*isma/.test(n)) return "/images/mausoleum.jpg";
  if (/^(la )?medina de meknes$|^souks de la medina$/.test(n))
    return "/images/medina.jpg";
  return "";
}
export function safeUrl(v) {
  return typeof v === "string" &&
    (/^https?:\/\//i.test(v) || /^\/(?!\/)/.test(v))
    ? v
    : "";
}
export function normalizePlace(raw, index = 0) {
  const p = raw.properties || raw,
    c =
      raw.geometry?.coordinates ||
      p.geometry?.coordinates ||
      p.coordinates ||
      [];
  const lat = number(p.latitude ?? p.lat ?? p.location?.lat) ?? number(c[1]),
    lng =
      number(p.longitude ?? p.lng ?? p.lon ?? p.location?.lng) ?? number(c[0]);
  const result = {
    ...p,
    id: String(p.id ?? raw.id ?? p._id ?? `place-${index}`),
    name: p.name ?? p.nom ?? p.title ?? "Lieu sans nom",
    category: p.category ?? p.categorie ?? p.type ?? "Autre",
    address: p.address ?? p.adresse ?? "",
    description: p.description ?? "",
    horaires: p.horaires ?? "",
    source: p.source ?? "",
    latitude: lat != null && Math.abs(lat) <= 90 ? lat : null,
    longitude: lng != null && Math.abs(lng) <= 180 ? lng : null,
  };
  result.image =
    safeUrl(p.image || p.image_url || p.photo || p.photos?.[0]) ||
    imageFor(result);
  return result;
}
export function normalizePayload(p) {
  if (Array.isArray(p)) return p.map(normalizePlace);
  if (Array.isArray(p?.features)) return p.features.map(normalizePlace);
  for (const key of ["places", "sites", "pois", "results", "items", "data"])
    if (p?.[key]) return normalizePayload(p[key]);
  throw new Error("Réponse des lieux invalide.");
}
export const hasCoordinates = (p) =>
  Number.isFinite(p?.latitude) && Number.isFinite(p?.longitude);
export function distanceKm(a, b) {
  if (!hasCoordinates(a) || !hasCoordinates(b)) return Infinity;
  const rad = (n) => (n * Math.PI) / 180;
  const x =
    Math.sin(rad(b.latitude - a.latitude) / 2) ** 2 +
    Math.cos(rad(a.latitude)) *
      Math.cos(rad(b.latitude)) *
      Math.sin(rad(b.longitude - a.longitude) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(x)));
}
export function filterPlaces(
  places,
  search,
  category,
  origin = null,
  radius = null,
) {
  const q = fold(search.trim());
  return places.filter(
    (p) =>
      (category === categories[0] || categoryOf(p.category) === category) &&
      (!q ||
        fold([p.name, p.description, p.address, p.category].join(" ")).includes(
          q,
        )) &&
      (!radius || !origin || distanceKm(origin, p) <= radius),
  );
}
export function moveStop(stops, index, delta) {
  const n = [...stops];
  if (index + delta < 0 || index + delta >= n.length) return n;
  [n[index], n[index + delta]] = [n[index + delta], n[index]];
  return n;
}
