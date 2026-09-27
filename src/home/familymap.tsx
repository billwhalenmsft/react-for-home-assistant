/**
 * The family on a map, drawn by the panel itself.
 *
 * Home Assistant's own map card hard-codes CARTO's basemap tiles with no key,
 * and in 2026 CARTO started answering keyless requests with a tile that reads
 * "API KEY REQUIRED". HA gives no way to supply one, so this map draws its own
 * tiles and can.
 *
 * The key is a browser key by CARTO's design (a `?key=` on every tile URL),
 * but it still should not be baked into this bundle: HA serves /local/ files
 * without a login, so anything compiled in here is readable by anyone who can
 * reach the NAS. It lives in an HA helper instead
 * (input_text.carto_api_key, a password-mode field Bill fills in himself),
 * and only a signed-in user's `hass` ever carries it.
 *
 * With no key, the map falls back to OpenStreetMap's own tiles rather than
 * showing a grid of refusals.
 */
import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import leafletCss from 'leaflet/dist/leaflet.css?inline';
import type { Hass, HassEntity } from '../ha/types';

export const MAP_KEY_ENTITY = 'input_text.carto_api_key';

type Who = { id: string; name: string };

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function tileLayerFor(key: string | null): L.TileLayer {
  if (key) {
    // Retina tiles where the screen can use them; CARTO serves both.
    const suffix = L.Browser.retina ? '@2x.png' : '.png';
    return L.tileLayer(
      `https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}${suffix}?key=${encodeURIComponent(key)}`,
      {
        maxZoom: 19,
        // Required on every map, free tier or paid.
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>',
      },
    );
  }
  return L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  });
}

/** A round badge with the person's photo if HA has one, else their initial. */
function badge(name: string, picture: string | undefined, home: boolean): L.DivIcon {
  const ring = home ? '#6fcf97' : '#d3b06e';
  const inner = picture
    ? `<img src="${picture}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
    : `<span style="font:600 14px/34px system-ui,sans-serif;color:#16120b">${name.slice(0, 1).toUpperCase()}</span>`;
  return L.divIcon({
    className: 'wt-map-badge',
    html: `<div title="${name}" style="width:34px;height:34px;border-radius:50%;background:${ring};
      border:2px solid ${ring};box-shadow:0 2px 10px rgba(0,0,0,.5);text-align:center;overflow:hidden">${inner}</div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
}

export function FamilyMap({ hass, people, height = 320 }: {
  hass: Hass; people: ReadonlyArray<Who>; height?: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const tiles = useRef<L.TileLayer | null>(null);
  const markers = useRef<L.LayerGroup | null>(null);
  const fitted = useRef(false);

  const keyState = hass.states[MAP_KEY_ENTITY]?.state;
  const key = keyState && !['unknown', 'unavailable', ''].includes(keyState) ? keyState : null;

  // Only the fields the map draws, so an unrelated attribute changing on a
  // person entity does not rebuild every marker.
  const spots = useMemo(() => people.map((p) => {
    const e: HassEntity | undefined = hass.states[p.id];
    const a = (e?.attributes ?? {}) as Record<string, unknown>;
    return {
      id: p.id, name: p.name,
      lat: num(a.latitude), lng: num(a.longitude),
      picture: typeof a.entity_picture === 'string' ? a.entity_picture : undefined,
      home: e?.state === 'home',
    };
  }), [hass.states, people]);
  const spotsKey = JSON.stringify(spots);

  const homeZone = hass.states['zone.home']?.attributes as Record<string, unknown> | undefined;
  const home = homeZone && num(homeZone.latitude) != null
    ? { lat: num(homeZone.latitude)!, lng: num(homeZone.longitude)!, radius: num(homeZone.radius) ?? 100 }
    : null;

  // Create the map once.
  useEffect(() => {
    if (!host.current || map.current) return;
    const m = L.map(host.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false });
    m.setView(home ? [home.lat, home.lng] : [44.78, -93.33], 13);
    markers.current = L.layerGroup().addTo(m);
    map.current = m;
    // The container is laid out by React after Leaflet measured it; without
    // this the first paint shows a grey half-map.
    const t = window.setTimeout(() => m.invalidateSize(), 50);
    return () => { window.clearTimeout(t); m.remove(); map.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swap tiles when the key arrives or changes.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    tiles.current?.remove();
    tiles.current = tileLayerFor(key).addTo(m);
  }, [key]);

  // Redraw people; frame everyone who is sharing a location the first time.
  useEffect(() => {
    const m = map.current, g = markers.current;
    if (!m || !g) return;
    g.clearLayers();
    if (home) {
      L.circle([home.lat, home.lng], {
        radius: home.radius, color: '#6fcf97', weight: 1, fillOpacity: 0.08,
      }).addTo(g);
    }
    const pts: L.LatLngExpression[] = [];
    for (const s of spots) {
      if (s.lat == null || s.lng == null) continue;
      L.marker([s.lat, s.lng], { icon: badge(s.name, s.picture, s.home), title: s.name, keyboard: false }).addTo(g);
      pts.push([s.lat, s.lng]);
    }
    if (!fitted.current && pts.length) {
      fitted.current = true;
      if (pts.length === 1) m.setView(pts[0], 14);
      else m.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 15 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spotsKey, home?.lat, home?.lng]);

  return (
    <>
      <style>{leafletCss}{`.wt-map-badge{background:none;border:none}
        .leaflet-container{background:#1b1e22;font:inherit}
        .leaflet-control-attribution{background:rgba(0,0,0,.55)!important;color:#aaa}
        .leaflet-control-attribution a{color:#d3b06e}`}</style>
      <div ref={host} style={{ height, width: '100%', borderRadius: 12, overflow: 'hidden' }} />
    </>
  );
}
