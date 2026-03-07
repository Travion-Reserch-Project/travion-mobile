import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import RNGeocoding from 'react-native-geocoding';
import Config from 'react-native-config';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '@navigation/MainNavigator';
import {
  roadIssueService,
  type RoadIssueSeverity,
  type IncidentType,
} from '@services/api/RoadIssueService';
import { getCurrentPosition } from '@utils/geolocation';

const ISSUE_TYPES = ['Accident', 'Road Block', 'Flooding', 'Debris', 'Pothole', 'Other'];
const SEVERITY_LEVELS: RoadIssueSeverity[] = ['low', 'medium', 'high'];

// Map frontend display types to backend enum values
const incidentTypeMap: Record<string, IncidentType> = {
  Accident: 'accident',
  'Road Block': 'road_block',
  Flooding: 'flooding',
  Debris: 'other',
  Pothole: 'pothole',
  Other: 'other',
};

const severityColor = (severity: RoadIssueSeverity): string => {
  switch (severity) {
    case 'high':
      return '#DC2626';
    case 'medium':
      return '#EA580C';
    default:
      return '#16A34A';
  }
};

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

export const ReportRoadIssueScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  const [selectedIssueType, setSelectedIssueType] = useState('Road Block');
  const [severity, setSeverity] = useState<RoadIssueSeverity>('medium');
  const [description, setDescription] = useState('');
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [locationAddress, setLocationAddress] = useState('Resolving location...');
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [nearbyCount, setNearbyCount] = useState(0);

  useEffect(() => {
    const init = async () => {
      if (Config.GOOGLE_MAPS_API_KEY && Config.GOOGLE_MAPS_API_KEY !== 'YOUR_API_KEY') {
        RNGeocoding.init(Config.GOOGLE_MAPS_API_KEY);
      }

      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'Location helps pin the exact road issue point on the map.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          },
        );

        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          setLoadingLocation(false);
          setLocationAddress('Location permission denied');
          return;
        }
      }

      try {
        const current = await getCurrentPosition({
          timeout: 15000,
          enableHighAccuracy: true,
          retryAttempts: 2,
        });
        const coords = {
          latitude: current.latitude,
          longitude: current.longitude,
        };

        setSelectedLocation(coords);
        await resolveAddress(coords.latitude, coords.longitude);
      } catch (error) {
        console.error('[ReportRoadIssue] Failed to get current location:', error);
        setLocationAddress('Unable to detect location');
      } finally {
        setLoadingLocation(false);
      }
    };

    init();
  }, []);

  useEffect(() => {
    if (!selectedLocation) {
      return;
    }

    const loadNearby = async () => {
      const result = await roadIssueService.getNearbyIncidents(
        selectedLocation.latitude,
        selectedLocation.longitude,
        3,
      );
      if (result.success) {
        setNearbyCount(result.data?.length || 0);
      }
    };

    loadNearby();
  }, [selectedLocation]);

  const mapRegion = useMemo(
    () => ({
      latitude: selectedLocation?.latitude || 6.9271,
      longitude: selectedLocation?.longitude || 79.8612,
      latitudeDelta: 0.015,
      longitudeDelta: 0.015,
    }),
    [selectedLocation],
  );

  const resolveAddress = async (latitude: number, longitude: number) => {
    try {
      const response = await RNGeocoding.from(latitude, longitude);
      const address = response.results?.[0]?.formatted_address;
      setLocationAddress(address || `Lat ${latitude.toFixed(5)}, Lng ${longitude.toFixed(5)}`);
    } catch {
      setLocationAddress(`Lat ${latitude.toFixed(5)}, Lng ${longitude.toFixed(5)}`);
    }
  };

  const updateLocation = async (latitude: number, longitude: number) => {
    setSelectedLocation({ latitude, longitude });
    setLocationAddress('Resolving location...');
    await resolveAddress(latitude, longitude);
  };

  const handleSubmit = async () => {
    if (!selectedLocation) {
      Alert.alert('Location required', 'Please pick a location on the map.');
      return;
    }

    if (!description.trim() || description.trim().length < 10) {
      Alert.alert('Description required', 'Please provide at least 10 characters.');
      return;
    }

    setSubmitting(true);
    try {
      // Generate title from description (first sentence or first 100 chars)
      const descTrimmed = description.trim();
      let title = descTrimmed;
      const periodIdx = descTrimmed.indexOf('.');
      if (periodIdx > 0 && periodIdx < 200) {
        title = descTrimmed.substring(0, periodIdx);
      }
      if (title.length > 200) {
        title = title.substring(0, 200);
      }
      if (title.length < 5) {
        title = descTrimmed.substring(0, Math.min(50, descTrimmed.length));
      }

      const result = await roadIssueService.reportIncident({
        incident_type: incidentTypeMap[selectedIssueType],
        title,
        location: {
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
          address: locationAddress,
        },
        incidentTime: new Date().toISOString(),
        description: descTrimmed,
        severity,
        isAnonymous: true,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to report road issue');
      }

      Alert.alert('Road issue reported', 'Thank you. Your report is now visible to nearby users.', [
        {
          text: 'View incidents map',
          onPress: () => navigation.replace('IncidentMapScreen'),
        },
        {
          text: 'Done',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      Alert.alert('Report failed', (error as Error).message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={18} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Report Road Issue</Text>
          <Text style={styles.subtitle}>Tap or drag marker to the exact road location</Text>
        </View>
      </View>

      {loadingLocation ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#F5840E" />
          <Text style={styles.loadingText}>Preparing map...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.mapCard}>
            <MapView
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              initialRegion={mapRegion}
              onPress={event => {
                const { latitude, longitude } = event.nativeEvent.coordinate;
                updateLocation(latitude, longitude);
              }}
            >
              {selectedLocation ? (
                <Marker
                  coordinate={selectedLocation}
                  draggable
                  pinColor="#DC2626"
                  title="Issue Location"
                  description={locationAddress}
                  onDragEnd={event => {
                    const { latitude, longitude } = event.nativeEvent.coordinate;
                    updateLocation(latitude, longitude);
                  }}
                />
              ) : null}
            </MapView>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Selected location</Text>
            <Text style={styles.locationText}>{locationAddress}</Text>
            <Text style={styles.helperText}>
              Nearby reports found in 3 km: <Text style={styles.helperStrong}>{nearbyCount}</Text>
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Issue Type</Text>
            <View style={styles.chipGrid}>
              {ISSUE_TYPES.map(type => {
                const active = type === selectedIssueType;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[styles.chip, active ? styles.chipActive : undefined]}
                    onPress={() => setSelectedIssueType(type)}
                  >
                    <Text style={[styles.chipText, active ? styles.chipTextActive : undefined]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Severity</Text>
            <View style={styles.severityRow}>
              {SEVERITY_LEVELS.map(level => {
                const active = level === severity;
                return (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.severityButton,
                      active ? styles.severityButtonActive : undefined,
                      active && level === 'low' ? styles.severityButtonLow : undefined,
                      active && level === 'medium' ? styles.severityButtonMedium : undefined,
                      active && level === 'high' ? styles.severityButtonHigh : undefined,
                    ]}
                    onPress={() => setSeverity(level)}
                  >
                    <View
                      style={[
                        styles.severityDot,
                        {
                          backgroundColor: severityColor(level),
                        },
                      ]}
                    />
                    <Text style={styles.severityText}>{level.toUpperCase()}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Description</Text>
            <TextInput
              style={styles.input}
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
              placeholder="What happened? Any lane blocked, vehicles involved, visibility issues, or direction details?"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, submitting ? styles.submitDisabled : undefined]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitText}>Submit Road Issue</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('IncidentMapScreen')}
          >
            <Text style={styles.secondaryButtonText}>View All Road Incidents</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  headerCopy: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    fontSize: 18,
    color: '#111827',
    fontFamily: 'Gilroy-Bold',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    fontFamily: 'Gilroy-Medium',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: '#374151',
    fontFamily: 'Gilroy-Medium',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 28,
  },
  mapCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  map: {
    height: 240,
    width: '100%',
  },
  section: {
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
  },
  sectionLabel: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 8,
    fontFamily: 'Gilroy-Bold',
  },
  locationText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#111827',
    fontFamily: 'Gilroy-Medium',
  },
  helperText: {
    marginTop: 6,
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Gilroy-Medium',
  },
  helperStrong: {
    color: '#111827',
    fontFamily: 'Gilroy-Bold',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 4,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  chipActive: {
    borderColor: '#EA580C',
    backgroundColor: '#FFF7ED',
  },
  chipText: {
    fontSize: 12,
    color: '#374151',
    fontFamily: 'Gilroy-SemiBold',
  },
  chipTextActive: {
    color: '#C2410C',
  },
  severityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  severityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    flex: 1,
    marginHorizontal: 4,
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  severityButtonActive: {
    backgroundColor: '#FFF7ED',
  },
  severityButtonLow: {
    borderColor: '#16A34A',
  },
  severityButtonMedium: {
    borderColor: '#EA580C',
  },
  severityButtonHigh: {
    borderColor: '#DC2626',
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  severityText: {
    fontSize: 11,
    color: '#111827',
    fontFamily: 'Gilroy-Bold',
  },
  input: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#111827',
    fontFamily: 'Gilroy-Regular',
  },
  submitButton: {
    marginTop: 16,
    backgroundColor: '#EA580C',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
  },
  submitDisabled: {
    opacity: 0.7,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Gilroy-Bold',
  },
  secondaryButton: {
    marginTop: 10,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  secondaryButtonText: {
    color: '#111827',
    fontSize: 14,
    fontFamily: 'Gilroy-SemiBold',
  },
});
