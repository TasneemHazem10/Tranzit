import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import AppButton from './AppButton';
import { colors, fonts, radius } from '../theme';

export type PickedPlace = {
  address: string;
  lat: number;
  lng: number;
};

type Props = {
  visible: boolean;
  title: string;
  initial?: PickedPlace | null;
  onClose: () => void;
  onConfirm: (place: PickedPlace) => void;
};

type GeoResult = {
  latitude: number;
  longitude: number;
  label: string;
};

export default function LocationPicker({
  visible,
  title,
  initial,
  onClose,
  onConfirm,
}: Props) {
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState({
    latitude: 30.0444,
    longitude: 31.2357,
    latitudeDelta: 0.02,
    longitudeDelta: 0.015,
  });
  const [marker, setMarker] = useState<PickedPlace | null>(initial ?? null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  // Reset state whenever opened
  useEffect(() => {
    if (visible) {
      setMarker(initial ?? null);
      setQuery('');
      setResults([]);
      if (initial) {
        setRegion(r => ({
          ...r,
          latitude: initial.lat,
          longitude: initial.lng,
        }));
      }
    }
  }, [visible, initial]);

  /** Coordinates -> human readable address (uses native Google geocoder) */
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setGeocoding(true);
    try {
      const places = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (places.length > 0) {
        const p = places[0];
        const parts = [p.name, p.street, p.district, p.city, p.region].filter(Boolean);
        return parts.join('، ') || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      }
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } catch {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } finally {
      setGeocoding(false);
    }
  }, []);

  const selectCoords = useCallback(
    async (lat: number, lng: number, knownAddress?: string) => {
      setMarker({
        lat,
        lng,
        address: knownAddress ?? (geocoding ? 'جارٍ تحديد العنوان...' : ''),
      });
      mapRef.current?.animateToRegion({ ...region, latitude: lat, longitude: lng }, 400);
      if (!knownAddress) {
        const address = await reverseGeocode(lat, lng);
        setMarker(m => (m && m.lat === lat && m.lng === lng ? { ...m, address } : m));
      }
    },
    [region, reverseGeocode, geocoding]
    );

  /** Search box -> forward geocoding */
  const runSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setResults([]);
    try {
      const found = await Location.geocodeAsync(q);
      setResults(
        found.slice(0, 6).map(f => ({
          latitude: f.latitude,
          longitude: f.longitude,
          label: q,
        }))
      );
      if (found.length === 0) {
        Alert.alert('تنبيه', 'لم نجد نتائج لهذا العنوان، جرّب وصفاً آخر.');
      }
    } catch {
      Alert.alert('تنبيه', 'تعذر البحث عن العنوان.');
    } finally {
      setSearching(false);
    }
  };

  const useMyLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('تنبيه', 'اسمح للتطبيق بالوصول لموقعك أولاً.');
      return;
    }
    try {
      const loc = await Location.getCurrentPositionAsync({});
      await selectCoords(loc.coords.latitude, loc.coords.longitude);
    } catch {
      Alert.alert('تنبيه', 'تعذر تحديد موقعك الحالي.');
    }
  };

  const confirm = () => {
    if (!marker || !marker.address) {
      Alert.alert('تنبيه', 'حدد الموقع على الخريطة أولاً.');
      return;
    }
    onConfirm({ address: marker.address, lat: marker.lat, lng: marker.lng });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable onPress={onClose} style={styles.backBtn}>
            <Ionicons name="close" size={22} color={colors.dark} />
          </Pressable>
          <Text style={styles.title}>{title}</Text>
          <View style={{ width: 38 }} />
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={colors.textGray} />
            <TextInput
              style={styles.searchInput}
              placeholder="ابحث عن عنوان أو منطقة..."
              placeholderTextColor={colors.textLight}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={runSearch}
              returnKeyType="search"
              textAlign="right"
            />
            {searching ? (
              <ActivityIndicator size="small" color={colors.dark} />
            ) : (
              <Pressable onPress={runSearch} hitSlop={8}>
                <Ionicons name="arrow-back-circle" size={24} color={colors.dark} />
              </Pressable>
            )}
          </View>
          <Pressable style={styles.gpsBtn} onPress={useMyLocation}>
            <Ionicons name="locate" size={20} color={colors.white} />
          </Pressable>
        </View>

        {/* Search results */}
        {results.length > 0 && (
          <View style={styles.resultsCard}>
            {results.map((r, i) => (
              <Pressable
                key={`${r.latitude}-${r.longitude}-${i}`}
                style={styles.resultRow}
                onPress={() => {
                  setResults([]);
                  setQuery('');
                  void selectCoords(
                    r.latitude,
                    r.longitude,
                    r.label
                  );
                }}>
                <Ionicons name="location-outline" size={16} color={colors.orange} />
                <Text style={styles.resultText}>{r.label}</Text>
                <Text style={styles.resultCoords}>
                  {r.latitude.toFixed(4)}, {r.longitude.toFixed(4)}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Map */}
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={{ flex: 1 }}
          initialRegion={region}
          onPress={e =>
            void selectCoords(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude)
          }
          showsUserLocation
          showsMyLocationButton={false}>
          {marker && (
            <Marker
              coordinate={{ latitude: marker.lat, longitude: marker.lng }}
              draggable
              onDragEnd={e =>
                void selectCoords(
                  e.nativeEvent.coordinate.latitude,
                  e.nativeEvent.coordinate.longitude
                )
              }
              anchor={{ x: 0.5, y: 1 }}>
              <View style={styles.pinShadow}>
                <View style={styles.pin}>
                  <Ionicons name="location-sharp" size={30} color={colors.orange} />
                </View>
              </View>
            </Marker>
          )}
        </MapView>

        {/* Bottom bar */}
        <View style={styles.bottomSheet}>
          <Text style={styles.selectedLabel}>الموقع المحدد</Text>
          <View style={styles.addressRow}>
            {geocoding ? (
              <ActivityIndicator size="small" color={colors.dark} />
            ) : (
              <Ionicons name="location" size={18} color={colors.orange} />
            )}
            <Text style={styles.addressText} numberOfLines={2}>
              {marker?.address || 'اضغط على الخريطة لتحديد الموقع'}
            </Text>
          </View>
          <AppButton title="تأكيد الموقع" onPress={confirm} disabled={!marker?.address} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.extraBold,
    fontSize: 17,
    color: colors.dark,
  },
  searchRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    height: 46,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.dark,
    paddingVertical: 0,
  },
  gpsBtn: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultsCard: {
    position: 'absolute',
    top: 118,
    left: 16,
    right: 16,
    zIndex: 10,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  resultRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  resultText: {
    flex: 1,
    fontFamily: fonts.semiBold,
    fontSize: 13.5,
    color: colors.dark,
    textAlign: 'right',
  },
  resultCoords: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.textLight,
  },
  pinShadow: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  pin: {},
  bottomSheet: {
    backgroundColor: colors.white,
    padding: 16,
    paddingBottom: 18,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
  selectedLabel: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: colors.textGray,
    textAlign: 'right',
  },
  addressRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    minHeight: 40,
  },
  addressText: {
    flex: 1,
    fontFamily: fonts.semiBold,
    fontSize: 14.5,
    color: colors.dark,
    textAlign: 'right',
    lineHeight: 22,
  },
});
