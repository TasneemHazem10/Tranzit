import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import AppButton from './AppButton';
import IconButton from './IconButton';
import { PressableScale } from './Motion';
import OsmMap from './OsmMap';
import { useLanguage } from '../store/language';
import { colors as themeColors, fonts, radius, useTheme, type ThemeColors } from '../theme';
import { searchPlaces, reverseGeocode as googleReverseGeocode } from '../api/googleMaps';

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
  placeId: string;
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
  const colors = useTheme();
  const styles = makeStyles(colors);
  const { t, isRTL } = useLanguage();
  const [focus, setFocus] = useState<{
    latitude: number;
    longitude: number;
    zoom?: number;
    key: string;
  } | null>(null);
  const [marker, setMarker] = useState<PickedPlace | null>(initial ?? null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  const lang: 'ar' | 'en' = isRTL ? 'ar' : 'en';

  // Reset state whenever opened (adjusting state during render when `visible` flips)
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible && !wasVisible) {
    setWasVisible(true);
    setMarker(initial ?? null);
    setQuery('');
    setResults([]);
    setFocus(
      initial
        ? { latitude: initial.lat, longitude: initial.lng, zoom: 16, key: 'init' }
        : null
    );
  } else if (!visible && wasVisible) {
    setWasVisible(false);
  }

  /** Coordinates -> human readable address (free OSM geocoding) */
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setGeocoding(true);
    try {
      return await googleReverseGeocode(lat, lng, lang);
    } catch {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } finally {
      setGeocoding(false);
    }
  }, [lang]);

  const selectCoords = useCallback(
    async (lat: number, lng: number, knownAddress?: string) => {
      setMarker({
        lat,
        lng,
        address: knownAddress ?? (geocoding ? t.geocodingLoading : ''),
      });
      setFocus({
        latitude: lat,
        longitude: lng,
        zoom: 16,
        key: `${Date.now()}-${Math.random()}`,
      });
      if (!knownAddress) {
        const address = await reverseGeocode(lat, lng);
        setMarker(m => (m && m.lat === lat && m.lng === lng ? { ...m, address } : m));
      }
    },
    [reverseGeocode, geocoding, t]
  );

  /** Search box -> forward geocoding via free OSM services */
  const runSearch = useCallback(
    async (silent = false) => {
      const q = query.trim();
      if (!q) return;
      setSearching(true);
      setResults([]);
      try {
        const found = await searchPlaces(q, lang);
        setResults(
          found.map(f => ({
            placeId: f.placeId,
            latitude: f.lat,
            longitude: f.lng,
            label: f.address,
          }))
        );
        if (found.length === 0 && !silent) {
          Alert.alert(t.alertWarning, t.locationPickerNoResults);
        }
      } catch {
        if (!silent) {
          Alert.alert(t.alertWarning, t.locationPickerSearchError);
        }
      } finally {
        setSearching(false);
      }
    },
    [query, lang, t]
  );

  // Debounced search-as-you-type (only while the picker is open)
  useEffect(() => {
    if (!visible || query.trim().length < 2) return;
    const timer = setTimeout(() => void runSearch(true), 350);
    return () => clearTimeout(timer);
  }, [query, visible, runSearch]);

  const useMyLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t.alertWarning, t.locationPickerPermissionNeeded);
      return;
    }
    try {
      const loc = await Location.getCurrentPositionAsync({});
      await selectCoords(loc.coords.latitude, loc.coords.longitude);
    } catch {
      Alert.alert(t.alertWarning, t.locationPickerCurrentError);
    }
  };

  const confirm = () => {
    if (!marker || !marker.address) {
      Alert.alert(t.alertWarning, t.alertMapSelectFirst);
      return;
    }
    onConfirm({ address: marker.address, lat: marker.lat, lng: marker.lng });
  };

  const rowDir = isRTL ? 'row-reverse' : 'row';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={[styles.headerRow, { flexDirection: rowDir }]}>
          <IconButton icon="close" variant="light" onPress={onClose} />
          <Text style={styles.title}>{title}</Text>
          <View style={{ width: 38 }} />
        </View>

        {/* Search */}
        <View style={[styles.searchRow, { flexDirection: rowDir }]}>
          <View style={[styles.searchBox, { flexDirection: rowDir }]}>
            <Ionicons name="search" size={18} color={colors.textGray} />
            <TextInput
              style={styles.searchInput}
              placeholder={t.locationPickerSearch}
              placeholderTextColor={colors.textLight}
              value={query}
              onChangeText={text => {
                setQuery(text);
                if (!text.trim()) setResults([]);
              }}
              onSubmitEditing={() => void runSearch()}
              returnKeyType="search"
              textAlign={isRTL ? 'right' : 'left'}
            />
            {searching ? (
              <ActivityIndicator size="small" color={colors.dark} />
            ) : (
              <PressableScale onPress={() => void runSearch()} contentStyle={styles.searchBtn}>
                <Ionicons name="arrow-back-circle" size={24} color={colors.dark} />
              </PressableScale>
            )}
          </View>
          <PressableScale onPress={useMyLocation} contentStyle={styles.gpsBtn}>
            <Ionicons name="locate" size={20} color={colors.white} />
          </PressableScale>
        </View>

        {/* Search results */}
        {results.length > 0 && (
          <View style={styles.resultsCard}>
            {results.map((r, i) => (
              <PressableScale
                key={`${r.latitude}-${r.longitude}-${i}`}
                contentStyle={[styles.resultRow, { flexDirection: rowDir }]}
                pressedStyle={{ opacity: 0.7 }}
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
                <Text style={[styles.resultText, { textAlign: isRTL ? 'right' : 'left' }]}>{r.label}</Text>
                <Text style={styles.resultCoords}>
                  {r.latitude.toFixed(4)}, {r.longitude.toFixed(4)}
                </Text>
              </PressableScale>
            ))}
          </View>
        )}

        {/* Map */}
        <OsmMap
          style={{ flex: 1 }}
          center={{ latitude: 30.0444, longitude: 31.2357, zoom: 12, key: 'init' }}
          animateTo={focus}
          markers={
            marker
              ? [
                  {
                    id: 'selected',
                    latitude: marker.lat,
                    longitude: marker.lng,
                    icon: 'pin',
                    color: colors.orange,
                    draggable: true,
                    z: 1000,
                  },
                ]
              : []
          }
          onPress={(lat, lng) => void selectCoords(lat, lng)}
          onMarkerDragEnd={(_, lat, lng) => void selectCoords(lat, lng)}
        />

        {/* Bottom bar */}
        <View style={styles.bottomSheet}>
          <Text style={[styles.selectedLabel, { textAlign: isRTL ? 'right' : 'left' }]}>{t.locationPickerSelected}</Text>
          <View style={[styles.addressRow, { flexDirection: rowDir }]}>
            {geocoding ? (
              <ActivityIndicator size="small" color={colors.dark} />
            ) : (
              <Ionicons name="location" size={18} color={colors.orange} />
            )}
            <Text style={[styles.addressText, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>
              {marker?.address || t.locationPickerTapHint}
            </Text>
          </View>
          <AppButton title={t.confirmLocation} onPress={confirm} disabled={!marker?.address} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.card,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  searchBtn: {
    width: 24,
    height: 24,
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
    backgroundColor: colors.card + 'E6',
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.dark,
    paddingVertical: 0,
  },
  gpsBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    backgroundColor: themeColors.dark + 'E6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  resultsCard: {
    position: 'absolute',
    top: 118,
    left: 16,
    right: 16,
    zIndex: 10,
    backgroundColor: colors.card,
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
  bottomSheet: {
    backgroundColor: colors.card + 'E6',
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
