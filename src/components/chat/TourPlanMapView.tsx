/**
 * TourPlanMapView
 *
 * Renders a generated tour plan as an embedded Google Map (dark style)
 * with numbered photo markers + route polyline, and a list of stops
 * grouped by time-of-day (Morning / Afternoon / Evening) underneath.
 *
 * Tapping a stop card animates the map to that marker.
 */

import React, { useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Linking,
  Platform,
  Dimensions,
  ScrollView,
  Alert,
} from 'react-native';
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  Region,
} from 'react-native-maps';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import type {
  FinalItinerary,
  FinalItineraryStop,
} from '../../services/api/TourPlanService';

const { width: SCREEN_W } = Dimensions.get('window');

// ── Dark map style (Google "Aubergine"-inspired) ──
const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
  {
    featureType: 'administrative.country',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#4b6878' }],
  },
  {
    featureType: 'landscape.man_made',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#334e87' }],
  },
  {
    featureType: 'landscape.natural',
    elementType: 'geometry',
    stylers: [{ color: '#023e58' }],
  },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#283d6a' }] },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6f9ba5' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry.fill',
    stylers: [{ color: '#023e58' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#304a7d' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#98a5be' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#2c6675' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#255763' }],
  },
  {
    featureType: 'transit.line',
    elementType: 'geometry.fill',
    stylers: [{ color: '#283d6a' }],
  },
  {
    featureType: 'transit.station',
    elementType: 'geometry',
    stylers: [{ color: '#3a4762' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0e1626' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#4e6d70' }],
  },
];

const C = {
  primary: '#F5840E',
  primaryDark: '#C2410C',
  routeBlue: '#4FC3F7',
  panelBg: '#0F172A',
  panelBg2: '#1E293B',
  cardBg: '#1F2937',
  border: '#334155',
  text: '#F1F5F9',
  textSoft: '#CBD5E1',
  textDim: '#94A3B8',
  amber: '#F59E0B',
  white: '#FFFFFF',
  badge: '#0F172A',
};

type PartOfDay = 'Morning' | 'Afternoon' | 'Evening';

interface PreparedStop {
  stop: FinalItineraryStop;
  index: number; // 1-based marker number
  partOfDay: PartOfDay;
}

interface Props {
  finalItinerary: FinalItinerary;
  title?: string;
}

const PART_ORDER: PartOfDay[] = ['Morning', 'Afternoon', 'Evening'];

const parseHour = (time: string): number => {
  if (!time) return 0;
  const ampmMatch = time.match(/(am|pm)/i);
  const m = time.match(/(\d{1,2})(?::(\d{2}))?/);
  if (!m) return 0;
  let hour = parseInt(m[1], 10);
  if (ampmMatch) {
    const isPm = /pm/i.test(ampmMatch[1]);
    if (isPm && hour < 12) hour += 12;
    if (!isPm && hour === 12) hour = 0;
  }
  return hour;
};

const partOfDay = (time: string): PartOfDay => {
  const h = parseHour(time);
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
};

const computeRegion = (
  coords: Array<{ lat: number; lng: number }>,
): Region => {
  if (!coords.length) {
    return {
      latitude: 7.8731,
      longitude: 80.7718,
      latitudeDelta: 4,
      longitudeDelta: 4,
    };
  }
  let minLat = coords[0].lat;
  let maxLat = coords[0].lat;
  let minLng = coords[0].lng;
  let maxLng = coords[0].lng;
  for (const c of coords) {
    if (c.lat < minLat) minLat = c.lat;
    if (c.lat > maxLat) maxLat = c.lat;
    if (c.lng < minLng) minLng = c.lng;
    if (c.lng > maxLng) maxLng = c.lng;
  }
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(0.05, (maxLat - minLat) * 1.6),
    longitudeDelta: Math.max(0.05, (maxLng - minLng) * 1.6),
  };
};

const inferCategory = (stop: FinalItineraryStop): string => {
  const a = (stop.activity || '').toLowerCase();
  const icon = (stop.icon || '').toLowerCase();
  if (icon === 'bed' || a.includes('hotel') || a.includes('check-in')) return 'Stay';
  if (
    icon === 'food' ||
    a.includes('lunch') ||
    a.includes('dinner') ||
    a.includes('breakfast') ||
    a.includes('restaurant') ||
    a.includes('cafe')
  )
    return 'Restaurant';
  if (a.includes('beach')) return 'Beach';
  return 'Tourist Attraction';
};

const fakeRating = (stop: FinalItineraryStop): number => {
  // Synthesize a stable star rating from visual_hierarchy / lighting_quality.
  const base = stop.visual_hierarchy ?? 4;
  if (base >= 5) return 4.8;
  if (base >= 4) return 4.6;
  if (base >= 3) return 4.4;
  return 4.2;
};

export const TourPlanMapView: React.FC<Props> = ({ finalItinerary, title }) => {
  const mapRef = useRef<MapView>(null);

  const prepared = useMemo<PreparedStop[]>(() => {
    const stops = (finalItinerary.stops || [])
      .filter(
        s =>
          s.coordinates &&
          typeof s.coordinates.lat === 'number' &&
          typeof s.coordinates.lng === 'number',
      )
      .slice()
      .sort((a, b) => {
        if (a.day !== b.day) return a.day - b.day;
        return a.sequence_id - b.sequence_id;
      });
    return stops.map((s, i) => ({
      stop: s,
      index: i + 1,
      partOfDay: partOfDay(s.time),
    }));
  }, [finalItinerary.stops]);

  const initialRegion = useMemo(
    () =>
      computeRegion(
        prepared.map(p => ({
          lat: p.stop.coordinates.lat,
          lng: p.stop.coordinates.lng,
        })),
      ),
    [prepared],
  );

  const polylineCoords = useMemo(() => {
    if (finalItinerary.route_polyline && finalItinerary.route_polyline.length > 1) {
      return finalItinerary.route_polyline.map(p => ({
        latitude: p.lat,
        longitude: p.lng,
      }));
    }
    return prepared.map(p => ({
      latitude: p.stop.coordinates.lat,
      longitude: p.stop.coordinates.lng,
    }));
  }, [finalItinerary.route_polyline, prepared]);

  const grouped = useMemo(() => {
    const map: Record<PartOfDay, PreparedStop[]> = {
      Morning: [],
      Afternoon: [],
      Evening: [],
    };
    for (const p of prepared) map[p.partOfDay].push(p);
    return map;
  }, [prepared]);

  const focusStop = useCallback((p: PreparedStop) => {
    mapRef.current?.animateToRegion(
      {
        latitude: p.stop.coordinates.lat,
        longitude: p.stop.coordinates.lng,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      },
      450,
    );
  }, []);

  const openExternal = useCallback(async () => {
    if (prepared.length === 0) return;
    if (prepared.length === 1) {
      const p = prepared[0];
      Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${p.stop.coordinates.lat},${p.stop.coordinates.lng}`,
      ).catch(() => {});
      return;
    }
    const MAX = 11;
    let pts = prepared;
    if (pts.length > MAX) {
      const first = pts[0];
      const last = pts[pts.length - 1];
      const mid = pts.slice(1, -1);
      const want = MAX - 2;
      const step = mid.length / want;
      const sampled = Array.from(
        { length: want },
        (_, i) => mid[Math.min(mid.length - 1, Math.floor(i * step))],
      );
      pts = [first, ...sampled, last];
    }
    const origin = pts[0].stop.coordinates;
    const destination = pts[pts.length - 1].stop.coordinates;
    const waypoints = pts
      .slice(1, -1)
      .map(p => `${p.stop.coordinates.lat},${p.stop.coordinates.lng}`)
      .join('|');
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}${
      waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : ''
    }&travelmode=driving`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Could not open Google Maps');
    }
  }, [prepared]);

  if (prepared.length === 0) {
    return (
      <View style={s.emptyCard}>
        <MaterialCommunityIcons name="map-search-outline" size={28} color={C.textDim} />
        <Text style={s.emptyText}>
          No stops with coordinates available to render the route map.
        </Text>
      </View>
    );
  }

  const headerTitle =
    title ||
    finalItinerary.summary ||
    `A ${finalItinerary.total_days || 1}-Day Tour`;

  return (
    <View style={s.shell}>
      {/* Map */}
      <View style={s.mapWrap}>
        <MapView
          ref={mapRef}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          style={s.map}
          initialRegion={initialRegion}
          customMapStyle={DARK_MAP_STYLE}
          toolbarEnabled={false}
          loadingEnabled
          loadingBackgroundColor={C.panelBg}
          loadingIndicatorColor={C.primary}
        >
          {polylineCoords.length > 1 && (
            <Polyline
              coordinates={polylineCoords}
              strokeColor={C.routeBlue}
              strokeWidth={3.5}
            />
          )}
          {prepared.map(p => (
            <Marker
              key={`m-${p.stop.sequence_id}-${p.index}`}
              coordinate={{
                latitude: p.stop.coordinates.lat,
                longitude: p.stop.coordinates.lng,
              }}
              title={`${p.index}. ${p.stop.location}`}
              description={`${p.stop.time} · ${p.stop.activity}`}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
            >
              <View style={s.markerWrap}>
                {p.stop.photo_urls && p.stop.photo_urls[0] ? (
                  <Image source={{ uri: p.stop.photo_urls[0] }} style={s.markerImg} />
                ) : (
                  <View style={[s.markerImg, s.markerImgFallback]}>
                    <MaterialCommunityIcons
                      name="map-marker"
                      size={18}
                      color={C.white}
                    />
                  </View>
                )}
                <View style={s.markerNumber}>
                  <Text style={s.markerNumberText}>{p.index}</Text>
                </View>
              </View>
            </Marker>
          ))}
        </MapView>

        {/* Floating header card on map */}
        <View style={s.headerCard}>
          <Text style={s.headerCardTitle} numberOfLines={1}>
            {headerTitle}
          </Text>
          <View style={s.headerActions}>
            <TouchableOpacity
              style={s.headerIconBtn}
              activeOpacity={0.8}
              onPress={openExternal}
              hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
            >
              <MaterialCommunityIcons
                name="open-in-new"
                size={16}
                color={C.text}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.headerIconBtn, s.headerIconBtnPrimary]}
              activeOpacity={0.85}
              onPress={openExternal}
              hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
            >
              <MaterialCommunityIcons
                name="navigation-variant"
                size={16}
                color={C.white}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Stops grouped by time-of-day */}
      <View style={s.listWrap}>
        {PART_ORDER.map(part => {
          const stops = grouped[part];
          if (stops.length === 0) return null;
          return (
            <View key={part} style={s.section}>
              <Text style={s.sectionTitle}>{part}</Text>
              {stops.map(p => (
                <StopCard key={`c-${p.stop.sequence_id}-${p.index}`} item={p} onPress={() => focusStop(p)} />
              ))}
            </View>
          );
        })}
      </View>
    </View>
  );
};

const StopCard: React.FC<{ item: PreparedStop; onPress: () => void }> = ({
  item,
  onPress,
}) => {
  const stop = item.stop;
  const photo = stop.photo_urls?.[0];
  const rating = fakeRating(stop);
  const category = inferCategory(stop);
  const description = stop.notes || stop.ai_insight || stop.activity || '';

  return (
    <TouchableOpacity style={s.card} activeOpacity={0.85} onPress={onPress}>
      <View style={s.cardImageWrap}>
        {photo ? (
          <Image source={{ uri: photo }} style={s.cardImage} />
        ) : (
          <View style={[s.cardImage, s.cardImageFallback]}>
            <MaterialCommunityIcons
              name="image-outline"
              size={18}
              color={C.textDim}
            />
          </View>
        )}
        <View style={s.cardNumber}>
          <Text style={s.cardNumberText}>{item.index}</Text>
        </View>
      </View>
      <View style={s.cardContent}>
        <Text style={s.cardTime}>{stop.time}</Text>
        <Text style={s.cardName} numberOfLines={1}>
          {stop.location}
        </Text>
        <View style={s.cardMetaRow}>
          <FontAwesome5 name="star" solid size={9} color={C.amber} />
          <Text style={s.cardRating}>
            {rating.toFixed(1)} <Text style={s.cardRatingDim}>·</Text>
          </Text>
          <Text style={s.cardCategory} numberOfLines={1}>
            {category}
          </Text>
        </View>
        {description ? (
          <Text style={s.cardDesc} numberOfLines={2}>
            {description}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const BUBBLE_W = SCREEN_W - 20; // chat bubble inset
const MAP_H = 260;

const s = StyleSheet.create({
  shell: {
    width: BUBBLE_W,
    backgroundColor: C.panelBg,
    borderRadius: 14,
    overflow: 'hidden',
  },

  // Map
  mapWrap: {
    position: 'relative',
    height: MAP_H,
    backgroundColor: C.panelBg,
  },
  map: { ...StyleSheet.absoluteFillObject },

  // Floating title card on map
  headerCard: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.92)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  headerCardTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    color: C.text,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 6,
  },
  headerIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconBtnPrimary: {
    backgroundColor: C.primary,
  },

  // Numbered photo markers
  markerWrap: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerImg: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: C.white,
    backgroundColor: C.cardBg,
  },
  markerImgFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primary,
  },
  markerNumber: {
    position: 'absolute',
    top: 0,
    right: 4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: C.badge,
    borderWidth: 1.5,
    borderColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerNumberText: {
    fontSize: 11,
    fontFamily: 'Gilroy-Bold',
    color: C.white,
    lineHeight: 13,
  },

  // List section
  listWrap: {
    paddingTop: 6,
    paddingBottom: 10,
    paddingHorizontal: 10,
  },
  section: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Gilroy-Bold',
    color: C.textSoft,
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 0.2,
  },

  // Card
  card: {
    flexDirection: 'row',
    backgroundColor: C.cardBg,
    borderRadius: 12,
    padding: 8,
    marginBottom: 8,
  },
  cardImageWrap: {
    position: 'relative',
    marginRight: 10,
  },
  cardImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: C.panelBg2,
  },
  cardImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardNumber: {
    position: 'absolute',
    top: -4,
    left: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: C.cardBg,
  },
  cardNumberText: {
    fontSize: 10,
    fontFamily: 'Gilroy-Bold',
    color: C.white,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  cardTime: {
    fontSize: 12,
    fontFamily: 'Gilroy-Medium',
    color: C.textDim,
    marginBottom: 1,
  },
  cardName: {
    fontSize: 14.5,
    fontFamily: 'Gilroy-Bold',
    color: C.text,
    marginBottom: 2,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  cardRating: {
    fontSize: 11.5,
    fontFamily: 'Gilroy-Medium',
    color: C.text,
  },
  cardRatingDim: { color: C.textDim },
  cardCategory: {
    fontSize: 11.5,
    fontFamily: 'Gilroy-Regular',
    color: C.textSoft,
    flexShrink: 1,
  },
  cardDesc: {
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    color: C.textDim,
    lineHeight: 16,
    marginTop: 2,
  },

  // Empty
  emptyCard: {
    backgroundColor: C.panelBg,
    borderRadius: 12,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: 'Gilroy-Regular',
    color: C.textSoft,
    textAlign: 'center',
  },
});

export default TourPlanMapView;
