import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../navigation/MainNavigator';
import {
  roadIssueService,
  type RoadIncident,
  type RoadIssueSeverity,
} from '@services/api/RoadIssueService';
import { getCurrentPosition } from '@utils/geolocation';

type Props = NativeStackScreenProps<MainStackParamList, 'IncidentMapScreen'>;

const badgeColor = (severity: RoadIssueSeverity) => {
  switch (severity) {
    case 'high':
      return '#DC2626';
    case 'medium':
      return '#EA580C';
    default:
      return '#16A34A';
  }
};

const defaultRegion = {
  latitude: 6.9271,
  longitude: 79.8612,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export const IncidentMapScreen: React.FC<Props> = ({ navigation, route }) => {
  const [incidents, setIncidents] = useState<RoadIncident[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const incidentList = Array.isArray(incidents) ? incidents : [];

  const origin = route.params?.origin;
  const destination = route.params?.destination;

  const mapRegion = useMemo(() => {
    if (origin) {
      return {
        latitude: origin.latitude,
        longitude: origin.longitude,
        latitudeDelta: 0.06,
        longitudeDelta: 0.06,
      };
    }

    if (userLocation) {
      return {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.06,
        longitudeDelta: 0.06,
      };
    }

    return defaultRegion;
  }, [origin, userLocation]);

  const loadRoadIncidents = useCallback(
    async (fallbackLocation?: { latitude: number; longitude: number }) => {
      setError(null);

      try {
        const result =
          origin && destination
            ? await roadIssueService.getIncidentsForRoute(
                origin.latitude,
                origin.longitude,
                destination.latitude,
                destination.longitude,
              )
            : await roadIssueService.getNearbyIncidents(
                fallbackLocation?.latitude || userLocation?.latitude || defaultRegion.latitude,
                fallbackLocation?.longitude || userLocation?.longitude || defaultRegion.longitude,
                10,
              );

        if (!result.success) {
          throw new Error(result.error || 'Unable to load incidents');
        }

        setIncidents(Array.isArray(result.data) ? result.data : []);
      } catch (loadError) {
        console.error('[IncidentMap] Failed to load incidents:', loadError);
        setError((loadError as Error).message || 'Failed to load incidents');
        setIncidents([]);
      }
    },
    [destination, origin, userLocation],
  );

  useEffect(() => {
    const init = async () => {
      try {
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: 'Location Permission',
              message: 'Location is used to show incidents near your route.',
              buttonPositive: 'Allow',
              buttonNegative: 'Deny',
            },
          );

          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            await loadRoadIncidents();
            setLoading(false);
            return;
          }
        }

        const current = await getCurrentPosition({
          timeout: 15000,
          enableHighAccuracy: true,
          retryAttempts: 2,
        });

        const coords = { latitude: current.latitude, longitude: current.longitude };
        setUserLocation(coords);
        await loadRoadIncidents(coords);
      } catch (locationError) {
        console.error('[IncidentMap] Failed to get user location:', locationError);
        await loadRoadIncidents();
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [loadRoadIncidents]);

  const confirmIncident = async (incidentId: string) => {
    setConfirmingId(incidentId);
    try {
      const result = await roadIssueService.confirmIncident(incidentId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to confirm incident');
      }

      setIncidents(existing =>
        (Array.isArray(existing) ? existing : []).map(item =>
          item._id === incidentId
            ? { ...item, confirmations: (item.confirmations || 0) + 1 }
            : item,
        ),
      );
    } catch (confirmError) {
      console.error('[IncidentMap] Confirm failed:', confirmError);
      setError((confirmError as Error).message || 'Failed to confirm incident');
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={18} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Road Incidents Map</Text>
          <Text style={styles.subtitle}>
            {origin && destination
              ? 'Route risk view with reported road incidents'
              : 'Nearby reported road incidents'}
          </Text>
        </View>
        <TouchableOpacity onPress={() => loadRoadIncidents()} style={styles.refreshButton}>
          <FontAwesome5 name="sync-alt" size={14} color="#EA580C" />
        </TouchableOpacity>
      </View>

      <View style={styles.mapWrap}>
        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color="#EA580C" />
            <Text style={styles.loaderText}>Loading incident map...</Text>
          </View>
        ) : (
          <MapView
            style={styles.map}
            initialRegion={mapRegion}
            provider={PROVIDER_GOOGLE}
            showsUserLocation
            showsCompass
          >
            {origin && destination ? (
              <Polyline
                coordinates={[origin, destination]}
                strokeColor="#2563EB"
                strokeWidth={4}
                lineDashPattern={[8, 6]}
              />
            ) : null}

            {origin ? <Marker coordinate={origin} title="Route origin" pinColor="#2563EB" /> : null}
            {destination ? (
              <Marker coordinate={destination} title="Route destination" pinColor="#1D4ED8" />
            ) : null}

            {incidentList.map(incident => {
              const latitude = incident.location?.latitude;
              const longitude = incident.location?.longitude;
              if (latitude === undefined || longitude === undefined) {
                return null;
              }

              return (
                <Marker
                  key={incident._id}
                  coordinate={{ latitude, longitude }}
                  title={incident.title || incident.incident_type}
                  description={incident.description}
                >
                  <View style={styles.markerWrap}>
                    <View
                      style={[
                        styles.markerBadge,
                        { backgroundColor: badgeColor(incident.severity || 'low') },
                      ]}
                    >
                      <Text style={styles.markerBadgeText}>
                        {(incident.severity || 'low').toUpperCase()}
                      </Text>
                    </View>
                    <FontAwesome5
                      name="map-marker-alt"
                      size={26}
                      color={badgeColor(incident.severity || 'low')}
                    />
                  </View>
                </Marker>
              );
            })}
          </MapView>
        )}
      </View>

      <View style={styles.listContainer}>
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Reported Incidents</Text>
          <Text style={styles.listCount}>{incidentList.length}</Text>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
          {incidentList.length === 0 && !loading ? (
            <Text style={styles.emptyText}>No incidents found for this area right now.</Text>
          ) : null}

          {incidentList.map(incident => (
            <View key={incident._id} style={styles.incidentCard}>
              <View style={styles.incidentTopRow}>
                <View style={styles.incidentLabelWrap}>
                  <View
                    style={[
                      styles.incidentDot,
                      { backgroundColor: badgeColor(incident.severity || 'low') },
                    ]}
                  />
                  <Text style={styles.incidentTitle}>
                    {incident.title || incident.incident_type}
                  </Text>
                </View>
                <Text
                  style={[styles.severityTag, { color: badgeColor(incident.severity || 'low') }]}
                >
                  {(incident.severity || 'low').toUpperCase()}
                </Text>
              </View>

              <Text style={styles.incidentDescription}>{incident.description}</Text>
              <Text style={styles.incidentMeta}>Confirmations: {incident.confirmations || 0}</Text>

              <TouchableOpacity
                onPress={() => confirmIncident(incident._id)}
                disabled={confirmingId === incident._id}
                style={styles.confirmButton}
              >
                {confirmingId === incident._id ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmButtonText}>Confirm Incident</Text>
                )}
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    marginLeft: 10,
  },
  title: {
    fontSize: 18,
    color: '#111827',
    fontFamily: 'Gilroy-Bold',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Gilroy-Medium',
  },
  refreshButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#FED7AA',
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapWrap: {
    height: '50%',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  map: {
    flex: 1,
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    marginTop: 8,
    color: '#374151',
    fontFamily: 'Gilroy-Medium',
  },
  markerWrap: {
    alignItems: 'center',
  },
  markerBadge: {
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginBottom: 3,
  },
  markerBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: 'Gilroy-Bold',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listTitle: {
    fontSize: 16,
    color: '#111827',
    fontFamily: 'Gilroy-Bold',
  },
  listCount: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: 'Gilroy-SemiBold',
  },
  errorText: {
    marginTop: 8,
    color: '#B91C1C',
    fontFamily: 'Gilroy-Medium',
    fontSize: 12,
  },
  listContent: {
    paddingTop: 10,
    paddingBottom: 20,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 13,
    fontFamily: 'Gilroy-Medium',
  },
  incidentCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    padding: 12,
    marginBottom: 10,
  },
  incidentTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  incidentLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  incidentDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginRight: 7,
  },
  incidentTitle: {
    fontSize: 14,
    color: '#111827',
    fontFamily: 'Gilroy-Bold',
    flexShrink: 1,
  },
  severityTag: {
    fontSize: 11,
    fontFamily: 'Gilroy-Bold',
  },
  incidentDescription: {
    marginTop: 8,
    color: '#374151',
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Gilroy-Medium',
  },
  incidentMeta: {
    marginTop: 6,
    color: '#6B7280',
    fontSize: 11,
    fontFamily: 'Gilroy-Medium',
  },
  confirmButton: {
    marginTop: 10,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#EA580C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Gilroy-Bold',
  },
});
