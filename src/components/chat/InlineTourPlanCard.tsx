/**
 * InlineTourPlanCard — Polished, Claude-style final tour plan rendered as
 * an assistant chat bubble inside TourGuideChatScreen. Composition:
 *  • Header strip with summary stats
 *  • Embedded Google Map (PROVIDER_GOOGLE on Android) showing all stops +
 *    route polyline
 *  • Reused TimelineItinerary for the day-by-day breakdown
 *  • Cultural tips chip strip
 *  • Footer actions: Save Plan, Refine
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import TimelineItinerary from './TimelineItinerary';
import type { FinalItinerary, CulturalTip } from '../../services/api/TourPlanService';

const C = {
  primary: '#F5840E',
  primaryDark: '#C2410C',
  primaryDeep: '#7C2D06',
  aiBubble: '#FFFFFF',
  dark: '#1C1917',
  textMid: '#44403C',
  textSoft: '#78716C',
  border: '#E7E0D8',
  white: '#FFFFFF',
  success: '#10B981',
  warning: '#F59E0B',
  tagBg: 'rgba(245,132,14,0.12)',
  tagText: '#C2410C',
};

interface Props {
  finalItinerary: FinalItinerary;
  culturalTips?: CulturalTip[] | null;
  matchScore?: number;
  isSaving?: boolean;
  onSave?: () => void;
  onRefine?: () => void;
}

function computeRegion(coords: Array<{ lat: number; lng: number }>): Region {
  if (!coords.length) {
    // Fall back to the centre of Sri Lanka
    return { latitude: 7.8731, longitude: 80.7718, latitudeDelta: 4, longitudeDelta: 4 };
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
  const latitude = (minLat + maxLat) / 2;
  const longitude = (minLng + maxLng) / 2;
  const latitudeDelta = Math.max(0.05, (maxLat - minLat) * 1.6);
  const longitudeDelta = Math.max(0.05, (maxLng - minLng) * 1.6);
  return { latitude, longitude, latitudeDelta, longitudeDelta };
}

export const InlineTourPlanCard: React.FC<Props> = ({
  finalItinerary,
  culturalTips,
  matchScore,
  isSaving,
  onSave,
  onRefine,
}) => {
  const [showMap, setShowMap] = useState(true);

  // Build coordinates for markers and polyline
  const stopCoords = useMemo(() => {
    return (finalItinerary.stops || [])
      .filter(s => s.coordinates && s.coordinates.lat && s.coordinates.lng)
      .map(s => ({
        lat: s.coordinates.lat,
        lng: s.coordinates.lng,
        label: s.location,
        seq: s.sequence_id,
        day: s.day,
        time: s.time,
        activity: s.activity,
      }));
  }, [finalItinerary.stops]);

  const routePolyline = useMemo(() => {
    return (finalItinerary.route_polyline || []).map(p => ({
      latitude: p.lat,
      longitude: p.lng,
    }));
  }, [finalItinerary.route_polyline]);

  const initialRegion = useMemo(
    () => computeRegion(stopCoords.length ? stopCoords : routePolyline.map(p => ({ lat: p.latitude, lng: p.longitude }))),
    [stopCoords, routePolyline],
  );

  const openInGoogleMaps = () => {
    if (stopCoords.length === 0) return;
    const origin = `${stopCoords[0].lat},${stopCoords[0].lng}`;
    const destination = `${stopCoords[stopCoords.length - 1].lat},${stopCoords[stopCoords.length - 1].lng}`;
    const waypoints = stopCoords
      .slice(1, -1)
      .map(c => `${c.lat},${c.lng}`)
      .join('|');
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${
      waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : ''
    }&travelmode=driving`;
    Linking.openURL(url).catch(() => {});
  };

  return (
    <View style={s.row}>
      <LinearGradient
        colors={[C.primary, C.primaryDark]}
        style={s.avatar}
      >
        <Text style={s.avatarLetter}>T</Text>
      </LinearGradient>
      <View style={s.bubble}>
        {/* Header */}
        <View style={s.headerRow}>
          <Text style={s.headerName}>Travion</Text>
          {matchScore != null ? (
            <View style={s.matchPill}>
              <Ionicons name="sparkles" size={10} color={C.primary} />
              <Text style={s.matchPillText}>{Math.round(matchScore)}% match</Text>
            </View>
          ) : null}
        </View>

        <View style={s.titleRow}>
          <MaterialCommunityIcons name="map-marker-radius" size={18} color={C.primary} />
          <Text style={s.title}>Your Tour Plan</Text>
        </View>
        <View style={s.statsRow}>
          <Stat
            icon="calendar-outline"
            label={`${finalItinerary.total_days || 1} day${(finalItinerary.total_days || 1) > 1 ? 's' : ''}`}
          />
          <Stat
            icon="location-outline"
            label={`${finalItinerary.stops?.length ?? 0} stops`}
          />
          {finalItinerary.total_distance_km ? (
            <Stat
              icon="navigate-outline"
              label={`${Math.round(finalItinerary.total_distance_km)} km`}
            />
          ) : null}
        </View>

        {/* Embedded Map */}
        {showMap && stopCoords.length > 0 ? (
          <View style={s.mapWrap}>
            <MapView
              provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
              style={s.map}
              initialRegion={initialRegion}
              showsUserLocation={false}
              toolbarEnabled={false}
              loadingEnabled
              loadingBackgroundColor="#F5F0EB"
              loadingIndicatorColor={C.primary}
            >
              {stopCoords.map((c, i) => (
                <Marker
                  key={`${c.seq}-${i}`}
                  coordinate={{ latitude: c.lat, longitude: c.lng }}
                  title={c.label}
                  description={`Day ${c.day} · ${c.time} — ${c.activity}`}
                  pinColor={C.primary}
                />
              ))}
              {routePolyline.length > 1 ? (
                <Polyline
                  coordinates={routePolyline}
                  strokeColor={C.primary}
                  strokeWidth={3}
                />
              ) : null}
            </MapView>

            <TouchableOpacity
              onPress={openInGoogleMaps}
              activeOpacity={0.85}
              style={s.openMapsBtn}
            >
              <Ionicons name="open-outline" size={12} color={C.white} />
              <Text style={s.openMapsBtnText}>Open in Google Maps</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowMap(false)}
              style={s.collapseMapBtn}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <Ionicons name="chevron-up" size={14} color={C.textMid} />
            </TouchableOpacity>
          </View>
        ) : stopCoords.length > 0 ? (
          <TouchableOpacity
            onPress={() => setShowMap(true)}
            style={s.mapToggleClosed}
            activeOpacity={0.7}
          >
            <Ionicons name="map" size={14} color={C.primary} />
            <Text style={s.mapToggleText}>Show map</Text>
          </TouchableOpacity>
        ) : null}

        {/* Day-by-day timeline */}
        <View style={{ marginTop: 8 }}>
          <TimelineItinerary itinerary={finalItinerary} />
        </View>

        {/* Cultural tips */}
        {culturalTips && culturalTips.length > 0 ? (
          <View style={s.cultureBox}>
            <View style={s.cultureHeader}>
              <Ionicons name="library-outline" size={13} color={C.primary} />
              <Text style={s.cultureHeaderText}>Cultural notes</Text>
            </View>
            {culturalTips.slice(0, 4).map((t, i) => (
              <View key={i} style={s.cultureRow}>
                <Text style={s.cultureLocation}>{t.location}</Text>
                <Text style={s.cultureTip}>{t.tip}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Footer actions */}
        <View style={s.actions}>
          <TouchableOpacity
            onPress={onRefine}
            activeOpacity={0.85}
            style={[s.btn, s.btnSecondary]}
          >
            <Ionicons name="create-outline" size={14} color={C.primary} />
            <Text style={s.btnSecondaryText}>Refine</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onSave}
            disabled={isSaving}
            activeOpacity={0.85}
            style={[s.btn, s.btnPrimaryWrap]}
          >
            <LinearGradient
              colors={[C.primary, C.primaryDark]}
              style={s.btnPrimary}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={C.white} />
              ) : (
                <>
                  <Ionicons name="bookmark" size={14} color={C.white} />
                  <Text style={s.btnPrimaryText}>Save plan</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const Stat: React.FC<{ icon: string; label: string }> = ({ icon, label }) => (
  <View style={s.stat}>
    <Ionicons name={icon as any} size={11} color={C.primary} />
    <Text style={s.statLabel}>{label}</Text>
  </View>
);

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 4,
    marginTop: 2,
    gap: 7,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 13,
    fontFamily: 'Gilroy-Bold',
    color: C.white,
  },
  bubble: {
    flex: 1,
    backgroundColor: C.aiBubble,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(245,132,14,0.18)',
    borderLeftWidth: 3,
    borderLeftColor: C.primary,
    padding: 12,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headerName: {
    fontSize: 11.5,
    fontFamily: 'Gilroy-Bold',
    color: C.primary,
    letterSpacing: 0.3,
  },
  matchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: C.tagBg,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  matchPillText: {
    fontSize: 10.5,
    fontFamily: 'Gilroy-Bold',
    color: C.tagText,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: C.dark,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFFAF5',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(245,132,14,0.2)',
  },
  statLabel: {
    fontSize: 10.5,
    fontFamily: 'Gilroy-Medium',
    color: C.primaryDark,
  },
  mapWrap: {
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F0EBE5',
  },
  map: { ...StyleSheet.absoluteFillObject },
  openMapsBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(28,25,23,0.78)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  openMapsBtnText: {
    fontSize: 11,
    fontFamily: 'Gilroy-Bold',
    color: C.white,
  },
  collapseMapBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapToggleClosed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF7ED',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(245,132,14,0.3)',
  },
  mapToggleText: {
    fontSize: 12,
    fontFamily: 'Gilroy-Bold',
    color: C.primary,
  },
  cultureBox: {
    marginTop: 8,
    backgroundColor: '#FFFAF5',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(245,132,14,0.18)',
  },
  cultureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  cultureHeaderText: {
    fontSize: 12,
    fontFamily: 'Gilroy-Bold',
    color: C.primary,
  },
  cultureRow: { marginBottom: 5 },
  cultureLocation: {
    fontSize: 11.5,
    fontFamily: 'Gilroy-Bold',
    color: C.primaryDark,
  },
  cultureTip: {
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    color: C.textMid,
    lineHeight: 17,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  btn: { flex: 1, height: 38, borderRadius: 10, overflow: 'hidden' },
  btnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: 'rgba(245,132,14,0.4)',
  },
  btnSecondaryText: {
    fontSize: 13,
    fontFamily: 'Gilroy-Bold',
    color: C.primary,
  },
  btnPrimaryWrap: { borderRadius: 10 },
  btnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  btnPrimaryText: {
    fontSize: 13,
    fontFamily: 'Gilroy-Bold',
    color: C.white,
  },
});

export default InlineTourPlanCard;
