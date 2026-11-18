# District map data

## District 1 · Lê Thánh Tôn

`q1.json` covers a roughly 590 by 468 meter playable area around Hẻm 15B. Lê Thánh Tôn, Hẻm 15B, Hẻm 15A and the surrounding street graph, building footprints and named points of interest are derived from a November 18, 2026 OpenStreetMap extract. The local projection uses an origin near the mapped 15B8 address. [OpenStreetMap street area](https://www.openstreetmap.org/#map=17/10.780647/106.704836) · [Hẻm 15B reference](https://www.openstreetmap.org/way/465567471)

The cropped road and alley network is used for traffic and missions. Building heights and carriageway widths fall back to estimates where OSM does not supply values. Row houses on sparse blocks, Japanese and Vietnamese signs, parked scooters, street furniture, fuel and garage facilities are gameplay scenery. Store names on procedural signboards are generic. Existing mapped merchant names feed the game’s mission system.

OpenStreetMap-derived map data © OpenStreetMap contributors under the Open Database License 1.0. [Attribution and license](https://www.openstreetmap.org/copyright)

To regenerate the map from a fresh OpenStreetMap snapshot:

```bash
curl --fail --location 'https://api.openstreetmap.org/api/0.6/map?bbox=106.702,10.777,106.710,10.785' -o /tmp/grabbike-district1.osm
python3 tools/import-district1.py /tmp/grabbike-district1.osm data/map/q1.json
```

## District 7 · Phú Mỹ Hưng

District 7 uses the project's existing `q7.json` OpenStreetMap-derived map. [Attribution and license](https://www.openstreetmap.org/copyright)
