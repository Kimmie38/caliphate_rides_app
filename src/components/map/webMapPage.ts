import type { StyleSpecification } from "@maplibre/maplibre-gl-style-spec";
import { KNOT_PATH } from "../knotPath";

/** MapLibre GL JS, the browser version of the same map engine. v5 uses a classic script, which suits web views. */
const MAPLIBRE_VERSION = "5.24.0";
const CDNS = [
  `https://cdn.jsdelivr.net/npm/maplibre-gl@${MAPLIBRE_VERSION}/dist`,
  `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist`,
];

export type MarkerColors = { green: string; greenInk: string; greenText: string; paper: string; ink: string; ground: string };

export type WebMapConfig = {
  style: StyleSpecification;
  center: [number, number];
  zoom: number;
  colors: MarkerColors;
  places: GeoJSON.FeatureCollection | null;
  /** Distance from the top of the screen for the OpenStreetMap credit (below the header). */
  creditTop: number;
};

// Drawn the same as the native markers (src/components/map/markers.tsx).
const ICONS = {
  keke: `<path d="M4 5h9.5c1.6 0 2.9 1.1 3.3 2.6L18 12.5"/><path d="M5.5 5v8M3 13h17.5v2.5H19M3 13v2.5h1.5M8.5 15.5h8M5.5 9h8"/><circle cx="6.5" cy="17" r="2"/><circle cx="17.5" cy="17" r="2"/>`,
  car: `<path d="M2.5 15v-2.6a1.4 1.4 0 0 1 .9-1.3l2.4-.9 2.1-3.1A2 2 0 0 1 9.6 6.2h5a2 2 0 0 1 1.5.7l2.7 3.2 2.3.6a1.4 1.4 0 0 1 1 1.4V15"/><path d="M2.5 15h2M8.5 15.5h7M19.5 15h2M6 10.2h13"/><circle cx="6.5" cy="16" r="2"/><circle cx="17.5" cy="16" r="2"/>`,
};

/** A self-contained page that draws our map in a web view. The app talks to it through window.cr. */
export function webMapPage(cfg: WebMapConfig): string {
  // Escape "</" so the JSON can't close the <script> tag early.
  const json = JSON.stringify({ ...cfg, cdns: CDNS, knot: KNOT_PATH, icons: ICONS }).replace(/<\//g, "<\\/");
  return `<!doctype html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
html,body,#map{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:${cfg.colors.ground};-webkit-tap-highlight-color:transparent}
.maplibregl-map{position:relative;overflow:hidden}
.maplibregl-canvas{position:absolute;left:0;top:0}
.maplibregl-canvas-container.maplibregl-interactive{cursor:grab;touch-action:none}
.maplibregl-marker{position:absolute;top:0;left:0;will-change:transform}
#credit{position:absolute;right:18px;z-index:5;font:600 10px/1.2 -apple-system,Roboto,sans-serif;padding:3px 7px;border-radius:9px;pointer-events:none}
.pin{display:flex;flex-direction:column;align-items:center}
.stem{width:3px;height:12px;border-radius:2px}
</style>
</head><body>
<div id="map"></div>
<div id="credit">© OpenStreetMap</div>
<script>
var C = ${json};
var map = null, ready = false, markers = {}, overlays = [], driverAnim = null;
function post(m){ try { window.ReactNativeWebView.postMessage(JSON.stringify(m)); } catch (e) {} }
window.onerror = function(msg){ post({ type: "error", message: String(msg) }); };

function load(i){
  if (i >= C.cdns.length) { post({ type: "error", message: "Couldn't load the map. Check your internet connection." }); return; }
  var s = document.createElement("script");
  s.src = C.cdns[i] + "/maplibre-gl.js";
  s.onload = start;
  s.onerror = function(){ load(i + 1); };
  document.head.appendChild(s);
}

function credit(){
  var el = document.getElementById("credit");
  el.style.top = C.creditTop + "px";
  el.style.background = C.colors.paper + "CC";
  el.style.color = C.colors.ink;
}

function start(){
  credit();
  map = new maplibregl.Map({
    container: "map", style: C.style, center: C.center, zoom: C.zoom, minZoom: 8, maxZoom: 19,
    attributionControl: false, dragRotate: false, pitchWithRotate: false, touchPitch: false, fadeDuration: 150
  });
  map.touchZoomRotate.disableRotation();
  map.on("style.load", function(){ addAppLayers(); drawRoute(); });
  map.once("load", function(){ ready = true; post({ type: "ready" }); });
  var byUser = false;
  map.on("movestart", function(e){ if (e.originalEvent) byUser = true; });
  map.on("moveend", function(e){
    if (!byUser && !e.originalEvent) return;
    byUser = false;
    var c = map.getCenter();
    post({ type: "center", lat: c.lat, lng: c.lng });
  });
  map.on("error", function(e){ post({ type: "error", message: String((e && e.error && e.error.message) || "map error") }); });
}

// Our Sokoto places and the route line, the same layers the native map uses.
function addAppLayers(){
  if (C.places && !map.getSource("sokoto-places")) {
    map.addSource("sokoto-places", { type: "geojson", data: C.places });
    map.addLayer({ id: "sokoto-places-dot", type: "circle", source: "sokoto-places", minzoom: 11, paint: {
      "circle-color": ["get", "color"], "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 3, 15, 6, 18, 8],
      "circle-stroke-color": C.colors.paper, "circle-stroke-width": 2 } });
    map.addLayer({ id: "sokoto-places-label", type: "symbol", source: "sokoto-places", minzoom: 13, layout: {
      "text-field": ["get", "name"], "text-font": ["Noto Sans Bold"], "text-size": ["interpolate", ["linear"], ["zoom"], 13, 11, 17, 13],
      "text-max-width": 9, "text-variable-anchor": ["left", "right", "top", "bottom"], "text-radial-offset": 0.9,
      "text-justify": "auto", "text-optional": true, "symbol-sort-key": ["-", 1, ["get", "popular"]] },
      paint: { "text-color": ["get", "color"], "text-halo-color": C.colors.paper, "text-halo-width": 1.6 } });
  }
  if (!map.getSource("route")) {
    map.addSource("route", { type: "geojson", data: emptyLine() });
    map.addLayer({ id: "route-edge", type: "line", source: "route", layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": C.colors.paper, "line-width": ["interpolate", ["linear"], ["zoom"], 11, 6, 16, 11] } });
    map.addLayer({ id: "route-line", type: "line", source: "route", layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": C.colors.green, "line-width": ["interpolate", ["linear"], ["zoom"], 11, 3.5, 16, 6.5] } });
  }
}
function emptyLine(){ return { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } }; }
function drawRoute(){
  var src = map && map.getSource("route");
  if (!src) return;
  var r = null;
  for (var i = 0; i < overlays.length; i++) if (overlays[i].kind === "route") r = overlays[i];
  src.setData(r && r.path.length > 1
    ? { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: r.path.map(function(p){ return [p.longitude, p.latitude]; }) } }
    : emptyLine());
}

// ---------- markers ----------
function el(html){ var d = document.createElement("div"); d.innerHTML = html; return d.firstElementChild; }
function svgIcon(kind, color){
  return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + C.icons[kind] + '</svg>';
}
function markerEl(o){
  var k = C.colors;
  if (o.kind === "user") return el('<div style="width:54px;height:54px;display:flex;align-items:center;justify-content:center;position:relative">' +
    '<div style="position:absolute;inset:0;border-radius:27px;background:' + k.green + ';opacity:.16"></div>' +
    '<div style="width:14px;height:14px;border-radius:11px;background:' + k.green + ';border:4px solid ' + k.paper + '"></div></div>');
  if (o.kind === "pickup") return el('<div class="pin"><div style="width:32px;height:32px;border-radius:18px;background:' + k.green + ';border:2px solid ' + k.paper + ';display:flex;align-items:center;justify-content:center">' +
    '<svg width="24" height="24" viewBox="0 0 100 100"><path d="' + C.knot + '" fill="none" stroke="' + k.greenInk + '" stroke-width="10" stroke-linejoin="round"/></svg></div>' +
    '<div class="stem" style="background:' + k.green + '"></div></div>');
  if (o.kind === "drop") return el('<div class="pin"><div style="width:34px;height:34px;border-radius:10px;background:' + k.ink + ';display:flex;align-items:center;justify-content:center">' +
    '<div style="width:10px;height:10px;border-radius:2px;background:' + k.paper + '"></div></div>' +
    '<div class="stem" style="background:' + k.ink + '"></div></div>');
  // driver
  return el('<div style="width:58px;height:58px;position:relative;display:flex;align-items:center;justify-content:center">' +
    '<div class="notch" style="position:absolute;inset:0;display:flex;justify-content:center;transform:rotate(' + (o.heading || 0) + 'deg)">' +
    '<div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-bottom:8px solid ' + k.green + '"></div></div>' +
    '<div style="width:36px;height:36px;border-radius:20px;background:' + k.paper + ';border:2px solid ' + k.green + ';display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.25)">' +
    svgIcon(o.rideType === "keke" ? "keke" : "car", k.greenText) + '</div></div>');
}
function anchorFor(kind){ return kind === "pickup" || kind === "drop" ? "bottom" : "center"; }

function glide(m, to){
  var from = m.getLngLat(), t0 = performance.now(), dur = 180;
  if (driverAnim) cancelAnimationFrame(driverAnim);
  function step(now){
    var t = Math.min(1, (now - t0) / dur);
    m.setLngLat([from.lng + (to[0] - from.lng) * t, from.lat + (to[1] - from.lat) * t]);
    if (t < 1) driverAnim = requestAnimationFrame(step);
  }
  driverAnim = requestAnimationFrame(step);
}

function drawMarkers(){
  var keep = {};
  overlays.forEach(function(o){
    if (o.kind === "route") return;
    keep[o.id] = true;
    var at = [o.at.longitude, o.at.latitude];
    var m = markers[o.id];
    if (m && m._kind !== o.kind + (o.rideType || "")) { m.remove(); m = null; }
    if (!m) {
      m = new maplibregl.Marker({ element: markerEl(o), anchor: anchorFor(o.kind) }).setLngLat(at).addTo(map);
      m._kind = o.kind + (o.rideType || "");
      markers[o.id] = m;
    } else if (o.kind === "driver") {
      glide(m, at);
      var n = m.getElement().querySelector(".notch");
      if (n) n.style.transform = "rotate(" + (o.heading || 0) + "deg)";
    } else {
      m.setLngLat(at);
    }
  });
  Object.keys(markers).forEach(function(id){ if (!keep[id]) { markers[id].remove(); delete markers[id]; } });
}

// ---------- what the app calls ----------
window.cr = {
  overlays: function(list){ overlays = list; if (!map) return; drawMarkers(); drawRoute(); },
  frame: function(points, padding, duration){
    if (!map || !points.length) return;
    var w = 180, s = 90, e = -180, n = -90;
    points.forEach(function(p){ w = Math.min(w, p[0]); e = Math.max(e, p[0]); s = Math.min(s, p[1]); n = Math.max(n, p[1]); });
    if (e - w < 0.0005 && n - s < 0.0005) map.easeTo({ center: [(w + e) / 2, (s + n) / 2], zoom: 15.5, padding: padding, duration: duration });
    else map.fitBounds([[w, s], [e, n]], { padding: padding, duration: duration, maxZoom: 17 });
  },
  setTheme: function(style, colors, places){
    C.colors = colors; C.places = places; credit();
    document.body.style.background = colors.ground;
    Object.keys(markers).forEach(function(id){ markers[id].remove(); delete markers[id]; });
    // A full reload (not a diff) so "style.load" fires and our places and route layers are added back.
    map.setStyle(style, { diff: false });
    drawMarkers();
  }
};

load(0);
</script>
</body></html>`;
}
