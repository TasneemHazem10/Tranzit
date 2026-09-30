import type { StyleProp, ViewStyle } from 'react-native';

export type LatLng = { latitude: number; longitude: number };

export type OsmMarker = LatLng & {
  id: string;
  icon?: 'pin' | 'cube' | 'car' | 'flag' | 'user';
  color?: string;
  label?: string;
  draggable?: boolean;
  z?: number;
};

export type OsmPolyline = LatLng[];

type Focus = LatLng & { zoom?: number; key: string };

export type OsmMapProps = {
  style?: StyleProp<ViewStyle>;
  markers?: OsmMarker[];
  polylines?: OsmPolyline[];
  center?: Focus | null;
  animateTo?: Focus | null;
  fit?: {
    points: LatLng[];
    padding?: { top?: number; bottom?: number; left?: number; right?: number };
    key: string;
  } | null;
  onPress?: (lat: number, lng: number) => void;
  onMarkerDragEnd?: (id: string, lat: number, lng: number) => void;
};

export const MAP_VERSION = 7;

export const OSM_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <style>
    html, body { height: 100%; margin: 0; padding: 0; background: #dbe6ee; }
    #map { height: 100%; width: 100%; }
    .osm-pin {
      width: 38px; height: 38px; border-radius: 50%; border: 2.5px solid #fff;
      display: flex; align-items: center; justify-content: center; font-size: 17px;
      box-shadow: 0 2px 6px rgba(0,0,0,.35); box-sizing: border-box; position: relative;
    }
    .osm-pin::after {
      content: ''; position: absolute; left: 50%; bottom: -7px; transform: translateX(-50%);
      border-left: 7px solid transparent; border-right: 7px solid transparent;
      border-top: 10px solid var(--pin-color, #1E1E1C);
    }
    .osm-dot {
      width: 18px; height: 18px; border-radius: 50%; background: #1E1E1C;
      border: 3px solid #fff; box-sizing: border-box; animation: pulse 1.8s infinite;
    }
    @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(47,123,246,.55); } 70% { box-shadow: 0 0 0 12px rgba(47,123,246,0); } 100% { box-shadow: 0 0 0 0 rgba(47,123,246,0); } }
    .osm-car-search {
      width: 34px; height: 34px; border-radius: 50%;
      background: #ffffff; border: 2px solid var(--search-color, #2563EB);
      display: flex; align-items: center; justify-content: center; font-size: 16px;
      box-shadow: 0 3px 10px rgba(0,0,0,.35); box-sizing: border-box;
    }
    .osm-car-search::before {
      content: ''; position: absolute; inset: -6px; border-radius: 50%;
      border: 2px dashed var(--search-color, #2563EB);
      animation: spin 2.2s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .leaflet-container { font-family: inherit; background: #dbe6ee; }
    #banner {
      display: none; position: absolute; left: 10px; right: 10px; bottom: 10px;
      padding: 12px 16px; border-radius: 12px; text-align: center;
      color: #7a8794; font: 400 13px/1.5 -apple-system, 'Segoe UI', sans-serif;
      background: rgba(255,255,255,.94); box-shadow: 0 2px 10px rgba(0,0,0,.15);
      pointer-events: none; z-index: 9999;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="banner">Could not load the map. Check your internet connection and try again.</div>
  <script>
    function post(m) {
      if (window.ReactNativeWebView) { window.ReactNativeWebView.postMessage(m); return; }
      if (window.parent && window.parent !== window) { window.parent.postMessage(m, '*'); }
    }
    var CDNS = [
      'https://unpkg.com/leaflet@1.9.4/dist/',
      'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/'
    ];
    var readySent = false;
    function sendReady() {
      if (readySent) return;
      readySent = true;
      post(JSON.stringify({ type: 'ready' }));
    }
    window.onerror = function (msg, src, line, col) {
      try {
        post(JSON.stringify({ type: 'err', message: String(msg) }));
      } catch (e) {}
      return false;
    };
    function loadLeaflet(cb) {
      var i = 0;
      function next() {
        if (i >= CDNS.length) { cb(); return; }
        var base = CDNS[i]; i++;
        var link = document.createElement('link');
        link.rel = 'stylesheet'; link.href = base + 'leaflet.css';
        document.head.appendChild(link);
        var s = document.createElement('script');
        s.src = base + 'leaflet.js';
        s.onload = function () { cb(); };
        s.onerror = next;
        document.head.appendChild(s);
      }
      next();
    }

    function initMap() {
      var PROVIDERS = [
        { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', subdomains: 'abc', maxZoom: 19 },
        { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', subdomains: '', maxZoom: 19 },
        { url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', subdomains: 'abc', maxZoom: 17 }
      ];
      var map = L.map('map', { zoomControl: false, attributionControl: false });
      var tile = null;
      var providerIdx = 0;
      var providerFailed = false;

      function showBanner() {
        var b = document.getElementById('banner');
        if (b) b.style.display = 'flex';
      }

      function addTiles() {
        if (providerIdx >= PROVIDERS.length) { showBanner(); return; }
        var p = PROVIDERS[providerIdx];
        var opts = { maxZoom: p.maxZoom };
        if (p.subdomains) opts.subdomains = p.subdomains;
        tile = L.tileLayer(p.url, opts);
        tile.on('tileerror', function () {
          if (providerFailed) return;
          providerFailed = true;
          providerIdx++;
          addTiles();
        });
        tile.on('tileload', function () { providerFailed = false; });
        tile.addTo(map);
      }
      addTiles();

      map.setView([30.0444, 31.2357], 13);
      setTimeout(function () { map.invalidateSize(); }, 300);
      window.addEventListener('resize', function () { map.invalidateSize(); });

      var widgets = { markers: {}, polylines: [] };

      function emojiFor(icon) {
        if (icon === 'car') return '🚚';
        if (icon === 'cube') return '📦';
        if (icon === 'flag') return '🏁';
        if (icon === 'user') return '';
        return '📍';
      }

      function makeDivIcon(m) {
        var color = m.color || '#1E1E1C';
        if (m.icon === 'user') {
          return L.divIcon({ className: '', html: '<div class="osm-dot"></div>', iconSize: [24, 24], iconAnchor: [12, 12] });
        }
        var html = '<div class="osm-pin" style="--pin-color:' + color + '; background:' + color + ';">' + emojiFor(m.icon) + '</div>';
        return L.divIcon({ className: '', html: html, iconSize: [38, 44], iconAnchor: [19, 22] });
      }

      map.on('click', function (e) {
        post(JSON.stringify({
          type: 'select', lat: e.latlng.lat, lng: e.latlng.lng
        }));
      });

      window.__state = { center: null, animate: null, fit: null };

      window.__setMap = function (p) {
        p = p || {};
        var active = {};

        (p.markers || []).forEach(function (m) {
          active[m.id] = true;
          var ll = [m.latitude, m.longitude];
          if (widgets.markers[m.id]) {
            widgets.markers[m.id].setLatLng(ll);
          } else {
            var mk = L.marker(ll, { draggable: !!m.draggable, icon: makeDivIcon(m), zIndexOffset: m.z || 0 }).addTo(map);
            if (m.draggable) {
              mk.on('dragend', function (ev) {
                var pos = ev.target.getLatLng();
                post(JSON.stringify({
                  type: 'drag', id: m.id, lat: pos.lat, lng: pos.lng
                }));
              });
            }
            widgets.markers[m.id] = mk;
          }
          if (m.label && !m.draggable) {
            widgets.markers[m.id].bindTooltip(m.label, { direction: 'top', offset: [0, -24], opacity: 0.95 }).openTooltip();
          }
        });
        Object.keys(widgets.markers).forEach(function (id) {
          if (!active[id]) { map.removeLayer(widgets.markers[id]); delete widgets.markers[id]; }
        });

        widgets.polylines.forEach(function (line) { map.removeLayer(line); });
        widgets.polylines = (p.polylines || []).map(function (pts) {
          return L.polyline(pts.map(function (pt) { return [pt.latitude, pt.longitude]; }), {
            color: '#1E1E1C', weight: 4, opacity: 0.9, lineCap: 'round', lineJoin: 'round'
          }).addTo(map);
        });

        if (p.center && p.center.key !== window.__state.center) {
          map.setView([p.center.latitude, p.center.longitude], p.center.zoom || 13, { animate: false });
          window.__state.center = p.center.key;
        }

        if (p.animateTo && p.animateTo.key !== window.__state.animate) {
          map.flyTo([p.animateTo.latitude, p.animateTo.longitude], p.animateTo.zoom || 15, { duration: 0.5 });
          window.__state.animate = p.animateTo.key;
        }

        if (p.fit && p.fit.key !== window.__state.fit) {
          var pad = p.fit.padding || {};
          var bounds = L.latLngBounds(p.fit.points.map(function (pt) { return [pt.latitude, pt.longitude]; }));
          map.fitBounds(bounds, {
            paddingTopLeft: [pad.left || 60, pad.top || 220],
            paddingBottomRight: [pad.right || 60, pad.bottom || 360],
            maxZoom: 17,
            animate: true
          });
          window.__state.fit = p.fit.key;
        }
      };

      window.addEventListener('message', function (e) {
        try {
          var d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
          if (d && d.type === 'set' && window.__setMap) window.__setMap(d.payload);
        } catch (e2) {}
      });

      sendReady();
    }

    loadLeaflet(function () {
      if (window.L) initMap(); else setTimeout(sendReady, 300);
    });
    setTimeout(sendReady, 2500);
  </script>
</body>
</html>`;