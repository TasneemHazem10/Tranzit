import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { OSM_HTML, type OsmMapProps } from './osmMapShared';

export default function OsmMapWeb({
  style,
  markers,
  polylines,
  center,
  animateTo,
  fit,
  onPress,
  onMarkerDragEnd,
}: OsmMapProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

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

  const inject = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ type: 'set', payload: payloadRef.current }),
      '*'
    );
  }, []);

  useEffect(() => {
    inject();
  }, [inject, payload]);

  const onPressRef = useRef(onPress);
  const onMarkerDragEndRef = useRef(onMarkerDragEnd);
  useEffect(() => {
    onPressRef.current = onPress;
    onMarkerDragEndRef.current = onMarkerDragEnd;
  }, [onPress, onMarkerDragEnd]);

  useEffect(() => {
    const onWindowMessage = (e: MessageEvent) => {
      let data: unknown = e.data;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch {
          return;
        }
      }
      if (!data || typeof data !== 'object') return;
      const msg = data as Record<string, unknown>;
      if (
        msg.type !== 'ready' &&
        msg.type !== 'err' &&
        msg.type !== 'select' &&
        msg.type !== 'drag'
      ) {
        return;
      }
      switch (msg.type) {
        case 'ready':
          setStatus('ready');
          inject();
          break;
        case 'err':
          console.warn('[OsmMap] iframe error:', String(msg.message));
          setStatus('error');
          break;
        case 'select':
          onPressRef.current?.(Number(msg.lat), Number(msg.lng));
          break;
        case 'drag':
          onMarkerDragEndRef.current?.(String(msg.id), Number(msg.lat), Number(msg.lng));
          break;
        default:
          break;
      }
    };
    window.addEventListener('message', onWindowMessage);
    return () => window.removeEventListener('message', onWindowMessage);
  }, [inject]);

  useEffect(() => {
    if (status !== 'loading') return;
    const timer = setTimeout(() => {
      setStatus('error');
    }, 7000);
    return () => clearTimeout(timer);
  }, [status]);

  const showBadge = status !== 'ready';

  return (
    <View style={[styles.container, style]}>
      {React.createElement('iframe', {
        ref: iframeRef,
        title: 'osm-map',
        srcDoc: OSM_HTML,
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          border: 'none',
backgroundColor: '#EBEBE7',
        },
        allowFullScreen: true,
      })}
      {showBadge && (
        <View style={styles.badge}>
          {status === 'loading' ? (
            <Text style={styles.badgeText}>جاري تحميل الخريطة…</Text>
          ) : (
            <Text style={styles.badgeText}>تعذر تحميل الخريطة</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EBEBE7',
    overflow: 'hidden',
  },
  badge: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,.55)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    maxWidth: '80%',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'inherit',
    textAlign: 'center',
  },
});