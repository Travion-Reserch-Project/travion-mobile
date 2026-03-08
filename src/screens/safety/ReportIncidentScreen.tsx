import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
  TextInput,
  Modal,
  StyleSheet,
  Animated,
  Easing,
  Image,
} from 'react-native';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import RNGeocoding from 'react-native-geocoding';
import Config from 'react-native-config';
import { launchImageLibrary } from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../navigation/MainNavigator';
import colors from '../../theme/colors';
import typography from '../../theme/typography';
import { incidentReportService } from '@services/api';
import { getCurrentPosition } from '@utils/geolocation';
import { NotificationService } from '@services/NotificationService';

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

const INCIDENT_TYPES = [
  { id: '1', label: 'Pickpocketing', icon: 'wallet' },
  { id: '2', label: 'Bag Snatching', icon: 'bag' },
  { id: '3', label: 'Scam', icon: 'exclamation-circle' },
  { id: '4', label: 'Money Theft', icon: 'money-bill' },
  { id: '5', label: 'Harassment', icon: 'hand-paper' },
  { id: '6', label: 'Extortion', icon: 'user-shield' },
  { id: '7', label: 'Theft', icon: 'mask' },
  { id: '8', label: 'Other', icon: 'circle' },
];

export const ReportIncidentScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const contentAnimation = useRef(new Animated.Value(0)).current;

  // States
  const [selectedIncidentType, setSelectedIncidentType] = useState<string>('1');
  const [locationName, setLocationName] = useState<string>('Getting location...');
  const [locationCoords, setLocationCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [incidentTime, setIncidentTime] = useState<Date>(new Date());
  const [description, setDescription] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<string>('');
  const [editingTime, setEditingTime] = useState<string>('');
  const [descriptionFocused, setDescriptionFocused] = useState(false);
  const [locationInputFocused, setLocationInputFocused] = useState(false);
  const [timeInputFocused, setTimeInputFocused] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Get current location and time on mount
  useEffect(() => {
    requestLocationPermission();
  }, []);

  // Animate form once loading completes
  useEffect(() => {
    if (!loading) {
      contentAnimation.setValue(0);
      Animated.timing(contentAnimation, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const requestLocationPermission = async () => {
    try {
      // Initialize geocoding with proper error handling
      if (Config.GOOGLE_MAPS_API_KEY && Config.GOOGLE_MAPS_API_KEY !== 'YOUR_API_KEY') {
        try {
          RNGeocoding.init(Config.GOOGLE_MAPS_API_KEY as string);
        } catch (error) {
          console.warn('Failed to initialize RNGeocoding:', error);
        }
      }

      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'We need your location to report incidents accurately.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          setLoading(false);
          return;
        }
      }

      const position = await getCurrentPosition({
        timeout: 15000,
        enableHighAccuracy: true,
        retryAttempts: 2,
      });
      const { latitude, longitude } = position;

      // Save coordinates
      setLocationCoords({ latitude, longitude });

      // Reverse geocode to get location name
      try {
        const results = await RNGeocoding.from(latitude, longitude);
        if (results && results.results && results.results.length > 0) {
          const address = results.results[0];
          const locationString = address.formatted_address || 'Unknown Location';
          setLocationName(locationString);
          setEditingLocation(locationString);
        }
      } catch (err) {
        console.error('Reverse geocoding error:', err);
        setLocationName('Location obtained');
        setEditingLocation('Location obtained');
      }

      // Do not block UI while location fetch happens; show form immediately
      setLoading(false);
    } catch (error) {
      console.error('Permission error:', error);
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    };
    return date.toLocaleDateString('en-US', options) + ' (Auto-filled)';
  };

  const handleLocationEdit = () => {
    setShowLocationModal(true);
  };

  const handleTimeEdit = () => {
    setShowTimeModal(true);
    setEditingTime(incidentTime.toISOString().slice(0, 16));
  };

  const handleSaveLocation = () => {
    if (editingLocation.trim()) {
      setLocationName(editingLocation);
    }
    setShowLocationModal(false);
  };

  const handleSaveTime = () => {
    if (editingTime) {
      const newDate = new Date(editingTime);
      if (!isNaN(newDate.getTime())) {
        setIncidentTime(newDate);
      }
    }
    setShowTimeModal(false);
  };

  const handlePickPhoto = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: 1,
      },
      response => {
        if (response.didCancel) return;
        if (response.errorCode) {
          console.warn('Image picker error:', response.errorMessage || response.errorCode);
          return;
        }
        const asset = response.assets && response.assets[0];
        if (asset?.uri) {
          setPhotoUri(asset.uri);
        }
      },
    );
  };

  const handleSubmit = async () => {
    if (!selectedIncidentType || !description.trim()) {
      setErrorMessage(
        'Please select an incident type and describe what happened before submitting.',
      );
      setShowErrorModal(true);
      return;
    }

    if (description.trim().length < 10) {
      setErrorMessage('Description must be at least 10 characters long.');
      setShowErrorModal(true);
      return;
    }

    setSubmitting(true);

    try {
      const incidentTypeLabel = INCIDENT_TYPES.find(t => t.id === selectedIncidentType)?.label;

      if (!incidentTypeLabel) {
        throw new Error('Invalid incident type selected');
      }

      // Prepare the report data
      const reportData = {
        incidentType: incidentTypeLabel as
          | 'Pickpocketing'
          | 'Bag Snatching'
          | 'Scam'
          | 'Money Theft'
          | 'Harassment'
          | 'Extortion'
          | 'Theft'
          | 'Other',
        location: {
          latitude: locationCoords?.latitude,
          longitude: locationCoords?.longitude,
          address: locationName,
        },
        incidentTime: incidentTime.toISOString(),
        description: description.trim(),
        photoUrl: photoUri || undefined,
        isAnonymous: true, // Reports are anonymous by default
      };

      console.log('[ReportIncident] Submitting report:', reportData);

      // Update device token location to match incident location before submitting
      // This ensures the geospatial push notification query can find nearby devices
      if (locationCoords?.latitude && locationCoords?.longitude) {
        await NotificationService.updateLocation(
          locationCoords.latitude,
          locationCoords.longitude,
        ).catch(err =>
          console.warn('[ReportIncident] Failed to update device location:', err),
        );
      }

      // Submit to backend
      const result = await incidentReportService.createReport(reportData);

      if (result.success) {
        console.log('[ReportIncident] Report submitted successfully:', result.data);
        setSubmitted(true);
      } else {
        throw new Error(result.error || 'Failed to submit report');
      }
    } catch (error) {
      console.error('[ReportIncident] Error submitting report:', error);
      setErrorMessage(
        (error as Error).message || 'Failed to submit incident report. Please try again.',
      );
      setShowErrorModal(true);
    } finally {
      setSubmitting(false);
    }
  };

  // console.log('API Key:', Config.GOOGLE_MAPS_API_KEY);

  // Render success screen
  if (submitted) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background.secondary }}>
        <View className="flex-1 items-center justify-center px-6">
          {/* Success Checkmark Circle */}
          <View
            style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: `${colors.primary}25`,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 32,
            }}
          >
            <View
              style={{
                width: 90,
                height: 90,
                borderRadius: 45,
                backgroundColor: `${colors.primary}40`,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <FontAwesome5 name="check" size={45} color={colors.primary} />
            </View>
          </View>

          {/* Thank You Message */}
          <Text
            className="text-3xl font-gilroy-bold mb-3 text-center"
            style={{ color: colors.gray[900] }}
          >
            Thank You!
          </Text>
          <Text
            className="text-base font-gilroy-regular text-center mb-12"
            style={{ color: colors.gray[600], lineHeight: 24 }}
          >
            Your report helps improve tourist safety.
          </Text>
        </View>

        {/* Find Police Station Button */}
        <View className="px-6 pb-12">
          <TouchableOpacity
            onPress={() => navigation.navigate('PoliceHelpScreen')}
            className="w-full py-4 rounded-full items-center justify-center"
            style={{ backgroundColor: colors.primary }}
          >
            <View className="flex-row items-center gap-3">
              <FontAwesome5 name="shield-alt" size={18} color={colors.white} />
              <Text
                className="text-base font-gilroy-bold"
                style={{ color: colors.white, lineHeight: 16 }}
              >
                Find Nearest Police Station
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-full py-4 rounded-full items-center justify-center mt-3"
            style={{ backgroundColor: colors.background.tertiary }}
          >
            <Text className="text-base font-gilroy-bold" style={{ color: colors.gray[700] }}>
              Back to Home
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Render loading state
  if (loading) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: colors.background.secondary }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-sm text-gray-600 mt-4">Loading...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background.secondary }}>
      {/* Header */}
      <View className="bg-white px-4 py-4 border-b" style={{ borderColor: colors.border.light }}>
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="pr-3">
            <FontAwesome5 name="arrow-left" size={18} color={colors.gray[900]} />
          </TouchableOpacity>
          <Text
            className="text-xl font-gilroy-bold flex-1 text-center"
            style={{ color: colors.gray[900] }}
          >
            Report an Incident
          </Text>
          <View className="w-8" />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <Animated.View
          className="p-4"
          style={{
            opacity: contentAnimation,
            transform: [
              {
                translateY: contentAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [12, 0],
                }),
              },
              {
                scale: contentAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.98, 1],
                }),
              },
            ],
          }}
        >
          {/* Type of Incident Section */}
          <View className="mb-6">
            <Text className="text-lg font-gilroy-bold mb-3" style={{ color: colors.gray[900] }}>
              Type of Incident
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {INCIDENT_TYPES.map(incident => (
                  <TouchableOpacity
                    key={incident.id}
                    onPress={() => setSelectedIncidentType(incident.id)}
                    className={`rounded-full flex-row items-center border-2`}
                    style={{
                      minWidth: 130,
                      height: 42,
                      paddingHorizontal: 16,
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor:
                        selectedIncidentType === incident.id
                          ? colors.primary
                          : colors.background.tertiary,
                      borderColor:
                        selectedIncidentType === incident.id ? colors.primary : colors.border.light,
                    }}
                  >
                    <FontAwesome5
                      name={incident.icon}
                      size={14}
                      color={selectedIncidentType === incident.id ? colors.white : colors.gray[600]}
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      className="text-sm font-gilroy-medium"
                      style={{
                        color:
                          selectedIncidentType === incident.id ? colors.white : colors.gray[700],
                        lineHeight: 14,
                      }}
                    >
                      {incident.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Location Section */}
          <View className="mb-6">
            <Text className="text-lg font-gilroy-bold mb-3" style={{ color: colors.gray[900] }}>
              Location
            </Text>
            <View
              className="flex-row items-center p-4 rounded-lg"
              style={{ backgroundColor: colors.white, borderColor: colors.border.light }}
            >
              <FontAwesome5 name="map-marker-alt" size={18} color={colors.primary} />
              <View className="flex-1 ml-3">
                <Text className="text-sm font-gilroy-medium" style={{ color: colors.gray[700] }}>
                  {locationName}
                </Text>
              </View>
              <TouchableOpacity onPress={handleLocationEdit}>
                <Text className="text-sm font-gilroy-bold" style={{ color: colors.primary }}>
                  Edit
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Time Section */}
          <View className="mb-6">
            <Text className="text-lg font-gilroy-bold mb-3" style={{ color: colors.gray[900] }}>
              Time of Incident
            </Text>
            <TouchableOpacity
              onPress={handleTimeEdit}
              className="flex-row items-center p-4 rounded-lg"
              style={{ backgroundColor: colors.white, borderColor: colors.border.light }}
            >
              <FontAwesome5 name="clock" size={18} color={colors.primary} />
              <View className="flex-1 ml-3">
                <Text className="text-sm font-gilroy-medium" style={{ color: colors.gray[700] }}>
                  {formatDate(incidentTime)}
                </Text>
              </View>
              <Text className="text-sm font-gilroy-bold" style={{ color: colors.primary }}>
                Edit
              </Text>
            </TouchableOpacity>
          </View>

          {/* Description Section */}
          <View className="mb-6">
            <Text className="text-lg font-gilroy-bold mb-3" style={{ color: colors.gray[900] }}>
              Describe What Happened
            </Text>
            <TextInput
              multiline
              numberOfLines={5}
              placeholder="Describe the incident here. Include details like who was involved and what happened."
              value={description}
              onChangeText={setDescription}
              placeholderTextColor={colors.gray[400]}
              className="p-4 rounded-lg text-sm"
              style={{
                backgroundColor: colors.white,
                color: colors.gray[900],
                fontFamily: typography.fontFamily.regular,
                borderWidth: 1,
                borderColor: descriptionFocused ? colors.primary : colors.border.default,
              }}
              onFocus={() => setDescriptionFocused(true)}
              onBlur={() => setDescriptionFocused(false)}
            />
          </View>

          {/* Photo Section */}
          <View className="mb-6">
            <Text className="text-lg font-gilroy-bold mb-3" style={{ color: colors.gray[900] }}>
              Add Photo (Optional)
            </Text>
            {photoUri ? (
              <View>
                <View
                  className="rounded-lg overflow-hidden border"
                  style={{ borderColor: colors.border.light, backgroundColor: colors.white }}
                >
                  <Image
                    source={{ uri: photoUri }}
                    style={{ width: '100%', height: 200 }}
                    resizeMode="cover"
                  />
                </View>
                <View className="flex-row gap-3 mt-3">
                  <TouchableOpacity
                    onPress={handlePickPhoto}
                    className="flex-1 py-3 rounded-lg items-center"
                    style={{ backgroundColor: colors.background.tertiary }}
                  >
                    <Text className="font-gilroy-bold" style={{ color: colors.gray[700] }}>
                      Change Photo
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setPhotoUri(null)}
                    className="flex-1 py-3 rounded-lg items-center"
                    style={{ backgroundColor: colors.primary }}
                  >
                    <Text className="font-gilroy-bold" style={{ color: colors.white }}>
                      Remove
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handlePickPhoto}
                className="items-center justify-center p-8 rounded-lg border-2"
                style={{
                  backgroundColor: colors.white,
                  borderColor: colors.border.light,
                }}
              >
                <FontAwesome5 name="camera" size={32} color={colors.primary} />
                <Text
                  className="text-sm font-gilroy-medium mt-3"
                  style={{ color: colors.gray[600] }}
                >
                  Tap to add a photo
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Info Tip */}
          <View
            className="p-4 rounded-lg mb-8"
            style={{
              backgroundColor: `${colors.primary}15`,
            }}
          >
            <Text
              className="text-sm font-gilroy-medium leading-relaxed"
              style={{ color: colors.gray[700] }}
            >
              Your report is anonymous and helps improve tourist safety. Location data is used only
              for safety analytics.
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting}
            className="w-full py-4 rounded-lg items-center justify-center mb-8"
            style={{ backgroundColor: submitting ? colors.gray[400] : colors.primary }}
          >
            {submitting ? (
              <View className="flex-row items-center">
                <ActivityIndicator size="small" color={colors.white} />
                <Text className="text-base font-gilroy-bold ml-2" style={{ color: colors.white }}>
                  Submitting...
                </Text>
              </View>
            ) : (
              <Text className="text-base font-gilroy-bold" style={{ color: colors.white }}>
                Submit Report
              </Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* Location Edit Modal */}
      <Modal visible={showLocationModal} transparent animationType="slide">
        <View className="flex-1 justify-end" style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setShowLocationModal(false)}
          />
          <View
            className="rounded-t-3xl p-6"
            style={{
              backgroundColor: colors.white,
            }}
          >
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-lg font-gilroy-bold" style={{ color: colors.gray[900] }}>
                Edit Location
              </Text>
              <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                <FontAwesome5 name="times" size={20} color={colors.gray[500]} />
              </TouchableOpacity>
            </View>

            <TextInput
              value={editingLocation}
              onChangeText={setEditingLocation}
              placeholder="Enter location"
              placeholderTextColor={colors.gray[400]}
              className="w-full p-4 rounded-lg mb-4 border"
              style={{
                borderColor: locationInputFocused ? colors.primary : colors.border.default,
                color: colors.gray[900],
                fontFamily: typography.fontFamily.regular,
              }}
              onFocus={() => setLocationInputFocused(true)}
              onBlur={() => setLocationInputFocused(false)}
            />

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setShowLocationModal(false)}
                className="flex-1 py-3 rounded-lg items-center"
                style={{ backgroundColor: colors.background.tertiary }}
              >
                <Text className="font-gilroy-bold" style={{ color: colors.gray[700] }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveLocation}
                className="flex-1 py-3 rounded-lg items-center"
                style={{ backgroundColor: colors.primary }}
              >
                <Text className="font-gilroy-bold" style={{ color: colors.white }}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Time Edit Modal */}
      <Modal visible={showTimeModal} transparent animationType="slide">
        <View className="flex-1 justify-end" style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setShowTimeModal(false)}
          />
          <View
            className="rounded-t-3xl p-6"
            style={{
              backgroundColor: colors.white,
            }}
          >
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-lg font-gilroy-bold" style={{ color: colors.gray[900] }}>
                Edit Time
              </Text>
              <TouchableOpacity onPress={() => setShowTimeModal(false)}>
                <FontAwesome5 name="times" size={20} color={colors.gray[500]} />
              </TouchableOpacity>
            </View>

            <TextInput
              value={editingTime}
              onChangeText={setEditingTime}
              placeholder="YYYY-MM-DDTHH:mm"
              placeholderTextColor={colors.gray[400]}
              className="w-full p-4 rounded-lg mb-4 border"
              style={{
                borderColor: timeInputFocused ? colors.primary : colors.border.default,
                color: colors.gray[900],
                fontFamily: typography.fontFamily.regular,
              }}
              onFocus={() => setTimeInputFocused(true)}
              onBlur={() => setTimeInputFocused(false)}
            />

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setShowTimeModal(false)}
                className="flex-1 py-3 rounded-lg items-center"
                style={{ backgroundColor: colors.background.tertiary }}
              >
                <Text className="font-gilroy-bold" style={{ color: colors.gray[700] }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveTime}
                className="flex-1 py-3 rounded-lg items-center"
                style={{ backgroundColor: colors.primary }}
              >
                <Text className="font-gilroy-bold" style={{ color: colors.white }}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Error Alert Modal */}
      <Modal visible={showErrorModal} transparent animationType="fade">
        <View className="flex-1 items-center justify-center" style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setShowErrorModal(false)}
          />
          <View
            className="mx-6 rounded-2xl p-6"
            style={{
              backgroundColor: colors.white,
              width: '80%',
            }}
          >
            {/* Error Icon */}
            <View className="items-center mb-4">
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: `${colors.error}15`,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <FontAwesome5 name="exclamation-circle" size={32} color="#EF4444" />
              </View>
            </View>

            {/* Error Message */}
            <Text
              className="text-xl font-gilroy-bold text-center mb-2"
              style={{ color: colors.gray[900] }}
            >
              {errorMessage.includes('Failed') ? 'Submission Error' : 'Required Fields Missing'}
            </Text>
            <Text
              className="text-sm font-gilroy-regular text-center mb-6"
              style={{ color: colors.gray[600], lineHeight: 20 }}
            >
              {errorMessage ||
                'Please select an incident type and describe what happened before submitting.'}
            </Text>

            {/* OK Button */}
            <TouchableOpacity
              onPress={() => setShowErrorModal(false)}
              className="w-full py-3 rounded-lg items-center"
              style={{ backgroundColor: colors.primary }}
            >
              <Text className="font-gilroy-bold" style={{ color: colors.white }}>
                Got it
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
});
