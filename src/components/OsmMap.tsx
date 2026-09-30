import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import {
  MAP_VERSION,
  OSM_HTML,
  type OsmMapProps,
} from './osmMapShared';

export type { LatLng, OsmMarker, OsmPolyline, OsmMapProps } from './osmMapShared';
export { OSM_HTML, MAP_VERSION };

const DEFAULT_HTML = OSM_HTML;

export default function OsmMap({
  style,
  markers,
  polylines,
  center,
  animateTo,
  fit,
  onPress,
  onMarkerDragEnd,
}: OsmMapProps) {
  const webRef = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const payload = useMemo(
    () => ({
      markers: markers ?? [],
      polylines: polylines ?? [],
      center: center ?? null,
      animateTo: animateTo ?? null,
      fit: fit ?? null,
    }),
    [markers, polylines, center, animateTo, fit]
  );

  const payloadRef = useRef(payload);
  useEffect(() => {
    payloadRef.current = payload;
  }, [payload]);

  const inject = (p = payloadRef.current) => {
    webRef.current?.injectJavaScript(
      `try { if (window.__setMap) { window.__setMap(${JSON.stringify(p)}); } } catch (e) {}; true;`
    );
  };

  useEffect(() => {
    if (ready) inject();
  }, [ready, payload]);

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      switch (msg.type) {
        case 'ready':
          console.log(`[OsmMap] ready (map v${MAP_VERSION})`);
          setReady(true);
          inject();
          break;
        case 'err':
          console.warn('[OsmMap] web error:', msg.message);
          break;
        case 'select':
          onPress?.(msg.lat, msg.lng);
          break;
        case 'drag':
          onMarkerDragEnd?.(msg.id, msg.lat, msg.lng);
          break;
        default:
          break;
      }
    } catch {
      // ignore malformed messages
    }
  };

  return (
    <View style={[styles.container, failed && styles.fallback, style]}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html: DEFAULT_HTML }}
        style={styles.web}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        textZoom={100}
        overScrollMode="never"
        onMessage={onMessage}
        onError={() => setFailed(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EBEBE7',
    overflow: 'hidden',
  },
  web: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  fallback: {
    backgroundColor: '#EEEEEA',
  },
});