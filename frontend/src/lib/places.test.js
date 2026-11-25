import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  normalizePlace,
  normalizePayload,
  hasCoordinates,
  filterPlaces,
  categoryOf,
  moveStop,
  safeUrl,
  distanceKm,
} from "./places.js";
const data = normalizePayload(
  JSON.parse(
    readFileSync(new URL("../../../data/poi.geojson", import.meta.url)),
  ),
);
test("PostGIS GeoJSON and the checked-in 50-place inventory keep IDs and coordinate order", () => {
  assert.equal(data.length, 50);
  assert.equal(data[0].id, "1");
  assert.equal(data[0].name, "Bab Mansour");
  assert.ok(data.every(hasCoordinates));
  assert.ok(data[0].latitude > 33 && data[0].latitude < 34);
  assert.ok(data[0].longitude < 0);
  assert.equal(
    normalizePlace({
      id: 7,
      properties: { nom: "Lieu" },
      geometry: { coordinates: [-5, 33] },
    }).id,
    "7",
  );
});
test("absent and invalid coordinates never become zero or enter the map", () => {
  for (const p of [
    {},
    { latitude: null, longitude: null },
    { latitude: "", longitude: "" },
    { latitude: 95, longitude: 0 },
    { latitude: "bad", longitude: 3 },
  ])
    assert.equal(hasCoordinates(normalizePlace(p)), false);
  assert.equal(
    hasCoordinates(normalizePlace({ latitude: 0, longitude: 0 })),
    true,
  );
  assert.throws(() => normalizePayload({ message: "Unavailable" }));
});
test("search ignores French accents and categories group the original data", () => {
  assert.equal(
    filterPlaces(data, "medersa bou", "Tous les lieux")[0].name,
    "Médersa Bou Inania",
  );
  assert.equal(categoryOf("Site historique"), "Monuments");
  assert.equal(categoryOf("Hôtel"), "Hébergement");
  assert.equal(categoryOf("Restaurant"), "Gastronomie");
  assert.ok(filterPlaces(data, "", "Hébergement").length > 0);
  assert.equal(filterPlaces(data, "zzzz", "Tous les lieux").length, 0);
});
test("proximity excludes missing and distant coordinates", () => {
  const origin = { latitude: 33.89, longitude: -5.55 };
  const nearby = { ...origin, id: "a" },
    far = { latitude: 34.1, longitude: -5.55, id: "b" },
    missing = { id: "c" };
  assert.deepEqual(
    filterPlaces([nearby, far, missing], "", "Tous les lieux", origin, 1),
    [nearby],
  );
  assert.equal(distanceKm(origin, origin), 0);
  assert.equal(distanceKm(origin, missing), Infinity);
});
test("reordering preserves saved input and cannot move beyond endpoints", () => {
  const input = ["a", "b", "c"];
  assert.deepEqual(moveStop(input, 1, -1), ["b", "a", "c"]);
  assert.deepEqual(input, ["a", "b", "c"]);
  assert.deepEqual(moveStop(input, 0, -1), input);
  assert.deepEqual(moveStop(input, 2, 1), input);
});
test("unsafe photos are rejected, and landmark photos match the named place", () => {
  assert.equal(safeUrl("javascript:alert(1)"), "");
  assert.equal(safeUrl("//example.com/a"), "");
  assert.equal(
    normalizePlace({ nom: "Souks de la médina", photos: [] }).image,
    "/images/medina.jpg",
  );
  assert.equal(normalizePlace({ nom: "Place El Hedim", photos: [] }).image, "");
});
