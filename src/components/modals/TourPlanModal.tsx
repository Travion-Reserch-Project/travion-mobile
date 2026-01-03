/**
 * Tour Plan Modal Component
 * A floating modal for planning tours with date selection and nearby location recommendations
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    ScrollView,
    Image,
    Animated,
    Dimensions,
    Platform,
    ActivityIndicator,
    StyleSheet,
} from 'react-native';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { aiService, locationService } from '@services/api';
import type { SimpleRecommendationLocation } from '@services/api/AIService';
import type { LocationDetailsResponse } from '@services/api/LocationService';

const { width, height } = Dimensions.get('window');

// App Theme Colors
const THEME = {
    primary: '#F5840E',
    primaryLight: '#FFF7ED',
    primaryDark: '#C2410C',
    secondary: '#5856D6',
    accent: '#FF6B35',
    success: '#10B981',
    warning: '#FBBF24',
    error: '#EF4444',
    dark: '#1F2937',
    gray: {
        50: '#F9FAFB',
        100: '#F3F4F6',
        200: '#E5E7EB',
        300: '#D1D5DB',
        400: '#9CA3AF',
        500: '#6B7280',
        600: '#4B5563',
        700: '#374151',
        800: '#1F2937',
    },
    white: '#FFFFFF',
};

interface SelectedLocation {
    name: string;
    latitude: number;
    longitude: number;
    imageUrl?: string;
    distance_km?: number;
}

interface TourPlanModalProps {
    visible: boolean;
    onClose: () => void;
    selectedLocation: {
        name: string;
        coordinates: {
            latitude: number;
            longitude: number;
        };
        imageUrls?: string[];
    };
    onGeneratePlan: (data: {
        startDate: Date;
        endDate: Date;
        selectedLocations: SelectedLocation[];
    }) => void;
}

export const TourPlanModal: React.FC<TourPlanModalProps> = ({
    visible,
    onClose,
    selectedLocation,
    onGeneratePlan,
}) => {
    const [startDate, setStartDate] = useState<Date>(new Date());
    const [endDate, setEndDate] = useState<Date>(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow;
    });
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [nearbyLocations, setNearbyLocations] = useState<SimpleRecommendationLocation[]>([]);
    const [selectedLocations, setSelectedLocations] = useState<SelectedLocation[]>([]);
    const [isLoadingNearby, setIsLoadingNearby] = useState(false);
    const [locationImages, setLocationImages] = useState<Record<string, string>>({});

    const slideAnim = useRef(new Animated.Value(height)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;

    useEffect(() => {
        if (visible && selectedLocation.coordinates.latitude !== 0) {
            // Initialize with selected location
            setSelectedLocations([{
                name: selectedLocation.name,
                latitude: selectedLocation.coordinates.latitude,
                longitude: selectedLocation.coordinates.longitude,
                imageUrl: selectedLocation.imageUrls?.[0],
            }]);

            // Animate modal in
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 65,
                    friction: 10,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    useNativeDriver: true,
                    tension: 65,
                    friction: 10,
                }),
            ]).start();

            // Load nearby locations
            loadNearbyLocations();
        } else if (!visible) {
            // Reset animations
            slideAnim.setValue(height);
            fadeAnim.setValue(0);
            scaleAnim.setValue(0.9);
        }
    }, [visible, selectedLocation]);

    const loadNearbyLocations = async () => {
        if (selectedLocation.coordinates.latitude === 0 || selectedLocation.coordinates.longitude === 0) {
            return;
        }
        setIsLoadingNearby(true);
        try {
            const response = await aiService.getSimpleRecommendations({
                latitude: selectedLocation.coordinates.latitude,
                longitude: selectedLocation.coordinates.longitude,
                max_distance_km: 50,
                top_k: 4, // Get 4 and filter out the selected one
            });

            // Filter out the current location and limit to 3
            const filtered = response.recommendations
                .filter(loc => loc.name.toLowerCase() !== selectedLocation.name.toLowerCase())
                .slice(0, 3);

            setNearbyLocations(filtered);

            // Fetch images for nearby locations
            if (filtered.length > 0) {
                const imageData = await locationService.getBulkLocationImages(
                    filtered.map(loc => loc.name)
                );
                const images: Record<string, string> = {};
                Object.entries(imageData).forEach(([name, data]) => {
                    if (data.primaryImage) {
                        images[name] = data.primaryImage;
                    } else if (data.imageUrls.length > 0) {
                        images[name] = data.imageUrls[0];
                    }
                });
                setLocationImages(images);
            }
        } catch (error) {
            console.error('Failed to load nearby locations:', error);
        } finally {
            setIsLoadingNearby(false);
        }
    };

    const handleClose = () => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: height,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onClose();
        });
    };

    const handleStartDateConfirm = (date: Date) => {
        setStartDate(date);
        setShowStartDatePicker(false);
        // If end date is before start date, update it
        if (date > endDate) {
            const newEndDate = new Date(date);
            newEndDate.setDate(newEndDate.getDate() + 1);
            setEndDate(newEndDate);
        }
    };

    const handleEndDateConfirm = (date: Date) => {
        setEndDate(date);
        setShowEndDatePicker(false);
    };

    const toggleLocationSelection = (location: SimpleRecommendationLocation) => {
        const exists = selectedLocations.find(
            loc => loc.name.toLowerCase() === location.name.toLowerCase()
        );

        if (exists) {
            // Don't allow removing the primary selected location
            if (location.name.toLowerCase() === selectedLocation.name.toLowerCase()) {
                return;
            }
            setSelectedLocations(prev =>
                prev.filter(loc => loc.name.toLowerCase() !== location.name.toLowerCase())
            );
        } else {
            setSelectedLocations(prev => [
                ...prev,
                {
                    name: location.name,
                    latitude: location.latitude,
                    longitude: location.longitude,
                    imageUrl: locationImages[location.name],
                    distance_km: location.distance_km,
                },
            ]);
        }
    };

    const isLocationSelected = (locationName: string) => {
        return selectedLocations.some(
            loc => loc.name.toLowerCase() === locationName.toLowerCase()
        );
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const getTripDuration = () => {
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const handleGeneratePlan = () => {
        onGeneratePlan({
            startDate,
            endDate,
            selectedLocations,
        });
        handleClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={handleClose}
            statusBarTranslucent
        >
            <View style={styles.modalContainer}>
                {/* Backdrop */}
                <Animated.View
                    style={[styles.backdrop, { opacity: fadeAnim }]}
                >
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        activeOpacity={1}
                        onPress={handleClose}
                    />
                </Animated.View>

                {/* Modal Content */}
                <Animated.View
                    style={[
                        styles.modalContent,
                        {
                            transform: [
                                { translateY: slideAnim },
                                { scale: scaleAnim },
                            ],
                        },
                    ]}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.dragHandle} />
                        <View style={styles.headerContent}>
                            <View style={styles.headerLeft}>
                                <LinearGradient
                                    colors={[THEME.primary, THEME.primaryDark]}
                                    style={styles.headerIcon}
                                >
                                    <MaterialCommunityIcons
                                        name="map-marker-path"
                                        size={20}
                                        color={THEME.white}
                                    />
                                </LinearGradient>
                                <View>
                                    <Text style={styles.headerTitle}>Plan Your Visit</Text>
                                    <Text style={styles.headerSubtitle}>
                                        Create your perfect tour itinerary
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                onPress={handleClose}
                                style={styles.closeButton}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="close" size={22} color={THEME.gray[500]} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.contentWrapper}>
                        <ScrollView
                            style={styles.scrollContent}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.scrollContentContainer}
                            nestedScrollEnabled={true}
                        >
                            {/* Date Selection Section */}
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <View style={[styles.sectionIcon, { backgroundColor: '#DBEAFE' }]}>
                                        <FontAwesome5 name="calendar-alt" size={14} color="#3B82F6" />
                                    </View>
                                    <Text style={styles.sectionTitle}>Trip Duration</Text>
                                </View>

                                <View style={styles.datePickerContainer}>
                                    {/* Start Date */}
                                    <TouchableOpacity
                                        style={styles.datePickerButton}
                                        onPress={() => setShowStartDatePicker(true)}
                                        activeOpacity={0.8}
                                    >
                                        <View style={styles.datePickerLabel}>
                                            <FontAwesome5 name="play-circle" size={12} color={THEME.success} style={{ marginRight: 6 }} />
                                            <Text style={styles.dateLabel}>Start</Text>
                                        </View>
                                        <Text style={styles.dateValue}>{formatDate(startDate)}</Text>
                                        <Ionicons name="chevron-down" size={16} color={THEME.gray[400]} />
                                    </TouchableOpacity>

                                    {/* Duration Badge */}
                                    <View style={styles.durationBadge}>
                                        <LinearGradient
                                            colors={[THEME.primary, THEME.primaryDark]}
                                            style={styles.durationBadgeGradient}
                                        >
                                            <Text style={styles.durationText}>{getTripDuration()}</Text>
                                            <Text style={styles.durationLabel}>
                                                {getTripDuration() === 1 ? 'Day' : 'Days'}
                                            </Text>
                                        </LinearGradient>
                                    </View>

                                    {/* End Date */}
                                    <TouchableOpacity
                                        style={styles.datePickerButton}
                                        onPress={() => setShowEndDatePicker(true)}
                                        activeOpacity={0.8}
                                    >
                                        <View style={styles.datePickerLabel}>
                                            <FontAwesome5 name="stop-circle" size={12} color={THEME.error} style={{ marginRight: 6 }} />
                                            <Text style={styles.dateLabel}>End</Text>
                                        </View>
                                        <Text style={styles.dateValue}>{formatDate(endDate)}</Text>
                                        <Ionicons name="chevron-down" size={16} color={THEME.gray[400]} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Selected Location (Primary) */}
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <View style={[styles.sectionIcon, { backgroundColor: '#D1FAE5' }]}>
                                        <FontAwesome5 name="map-marker-alt" size={14} color={THEME.success} />
                                    </View>
                                    <Text style={styles.sectionTitle}>Your Destination</Text>
                                    <View style={styles.selectedBadge}>
                                        <Ionicons name="checkmark-circle" size={14} color={THEME.success} />
                                        <Text style={styles.selectedBadgeText}>Selected</Text>
                                    </View>
                                </View>

                                <View style={styles.primaryLocationCard}>
                                    <LinearGradient
                                        colors={['rgba(16, 185, 129, 0.1)', 'rgba(16, 185, 129, 0.05)']}
                                        style={styles.primaryLocationGradient}
                                    >
                                        <View style={styles.primaryLocationContent}>
                                            <View style={styles.locationImageWrapper}>
                                                {selectedLocation.imageUrls?.[0] ? (
                                                    <Image
                                                        source={{ uri: selectedLocation.imageUrls[0] }}
                                                        style={styles.primaryLocationImage}
                                                    />
                                                ) : (
                                                    <View style={styles.placeholderImage}>
                                                        <FontAwesome5 name="image" size={24} color={THEME.gray[400]} />
                                                    </View>
                                                )}
                                                <View style={styles.primaryBadge}>
                                                    <FontAwesome5 name="star" size={10} color={THEME.white} solid />
                                                </View>
                                            </View>
                                            <View style={styles.primaryLocationInfo}>
                                                <Text style={styles.primaryLocationName} numberOfLines={2}>
                                                    {selectedLocation.name}
                                                </Text>
                                                <View style={styles.primaryLocationMeta}>
                                                    <FontAwesome5
                                                        name="map-pin"
                                                        size={11}
                                                        color={THEME.gray[400]}
                                                    />
                                                    <Text style={styles.primaryLocationMetaText}>
                                                        Primary destination
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={styles.checkCircle}>
                                                <LinearGradient
                                                    colors={[THEME.success, '#059669']}
                                                    style={styles.checkCircleGradient}
                                                >
                                                    <Ionicons name="checkmark" size={16} color={THEME.white} />
                                                </LinearGradient>
                                            </View>
                                        </View>
                                    </LinearGradient>
                                </View>
                            </View>

                            {/* Nearby Recommendations */}
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <View style={[styles.sectionIcon, { backgroundColor: THEME.primaryLight }]}>
                                        <MaterialCommunityIcons
                                            name="compass-outline"
                                            size={16}
                                            color={THEME.primary}
                                        />
                                    </View>
                                    <Text style={styles.sectionTitle}>Nearby Attractions</Text>
                                    <Text style={styles.sectionHint}>Tap to add</Text>
                                </View>

                                {isLoadingNearby ? (
                                    <View style={styles.loadingContainer}>
                                        <ActivityIndicator size="small" color={THEME.primary} />
                                        <Text style={styles.loadingText}>Finding nearby places...</Text>
                                    </View>
                                ) : nearbyLocations.length === 0 ? (
                                    <View style={styles.emptyContainer}>
                                        <MaterialCommunityIcons
                                            name="map-search-outline"
                                            size={40}
                                            color={THEME.gray[300]}
                                        />
                                        <Text style={styles.emptyText}>No nearby attractions found</Text>
                                    </View>
                                ) : (
                                    <View style={styles.nearbyGrid}>
                                        {nearbyLocations.map((location, index) => {
                                            const isSelected = isLocationSelected(location.name);
                                            return (
                                                <TouchableOpacity
                                                    key={location.name}
                                                    style={[
                                                        styles.nearbyCard,
                                                        isSelected && styles.nearbyCardSelected,
                                                    ]}
                                                    onPress={() => toggleLocationSelection(location)}
                                                    activeOpacity={0.8}
                                                >
                                                    <View style={styles.nearbyImageContainer}>
                                                        {locationImages[location.name] ? (
                                                            <Image
                                                                source={{ uri: locationImages[location.name] }}
                                                                style={styles.nearbyImage}
                                                            />
                                                        ) : (
                                                            <View style={styles.nearbyPlaceholder}>
                                                                <FontAwesome5
                                                                    name="mountain"
                                                                    size={20}
                                                                    color={THEME.gray[300]}
                                                                />
                                                            </View>
                                                        )}
                                                        {isSelected && (
                                                            <View style={styles.selectedOverlay}>
                                                                <LinearGradient
                                                                    colors={[THEME.primary, THEME.primaryDark]}
                                                                    style={styles.selectedCheck}
                                                                >
                                                                    <Ionicons
                                                                        name="checkmark"
                                                                        size={14}
                                                                        color={THEME.white}
                                                                    />
                                                                </LinearGradient>
                                                            </View>
                                                        )}
                                                        <View style={styles.distanceBadge}>
                                                            <FontAwesome5
                                                                name="location-arrow"
                                                                size={8}
                                                                color={THEME.white}
                                                            />
                                                            <Text style={styles.distanceText}>
                                                                {location.distance_km.toFixed(1)} km
                                                            </Text>
                                                        </View>
                                                    </View>
                                                    <View style={styles.nearbyInfo}>
                                                        <Text
                                                            style={[
                                                                styles.nearbyName,
                                                                isSelected && styles.nearbyNameSelected,
                                                            ]}
                                                            numberOfLines={2}
                                                        >
                                                            {location.name}
                                                        </Text>
                                                        <View style={styles.nearbyMeta}>
                                                            <View style={styles.matchScore}>
                                                                <FontAwesome5
                                                                    name="heart"
                                                                    size={9}
                                                                    color={THEME.primary}
                                                                    solid
                                                                />
                                                                <Text style={styles.matchScoreText}>
                                                                    {Math.round(location.similarity_score * 100)}% match
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    </View>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                )}
                            </View>

                            {/* Selected Summary */}
                            {selectedLocations.length > 1 && (
                                <View style={styles.summarySection}>
                                    <View style={styles.summaryHeader}>
                                        <MaterialCommunityIcons
                                            name="check-decagram"
                                            size={18}
                                            color={THEME.primary}
                                        />
                                        <Text style={styles.summaryTitle}>
                                            {selectedLocations.length} locations selected
                                        </Text>
                                    </View>
                                    <View style={styles.summaryLocations}>
                                        {selectedLocations.map((loc, index) => (
                                            <View key={loc.name} style={styles.summaryItem}>
                                                <View style={styles.summaryDot} />
                                                <Text style={styles.summaryItemText} numberOfLines={1}>
                                                    {loc.name}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}
                        </ScrollView>

                        {/* Generate Button */}
                        <View style={styles.footer}>
                            <TouchableOpacity
                                style={styles.generateButton}
                                onPress={handleGeneratePlan}
                                activeOpacity={0.9}
                            >
                                <LinearGradient
                                    colors={[THEME.primary, THEME.primaryDark]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.generateButtonGradient}
                                >
                                    <MaterialCommunityIcons
                                        name="auto-fix"
                                        size={22}
                                        color={THEME.white}
                                    />
                                    <Text style={styles.generateButtonText}>Generate Tour Plan</Text>
                                    <View style={styles.generateArrow}>
                                        <Ionicons name="arrow-forward" size={18} color={THEME.white} />
                                    </View>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>

                {/* Date Pickers */}
                <DateTimePickerModal
                    isVisible={showStartDatePicker}
                    mode="date"
                    onConfirm={handleStartDateConfirm}
                    onCancel={() => setShowStartDatePicker(false)}
                    minimumDate={new Date()}
                    date={startDate}
                    confirmTextIOS="Select"
                    cancelTextIOS="Cancel"
                />

                <DateTimePickerModal
                    isVisible={showEndDatePicker}
                    mode="date"
                    onConfirm={handleEndDateConfirm}
                    onCancel={() => setShowEndDatePicker(false)}
                    minimumDate={startDate}
                    date={endDate}
                    confirmTextIOS="Select"
                    cancelTextIOS="Cancel"
                />
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: THEME.white,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        height: height * 0.75,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 24,
    },
    header: {
        paddingTop: 12,
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: THEME.gray[100],
        backgroundColor: THEME.white,
    },
    dragHandle: {
        width: 40,
        height: 4,
        backgroundColor: THEME.gray[300],
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    headerIcon: {
        width: 42,
        height: 42,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Gilroy-Bold',
        color: THEME.dark,
    },
    headerSubtitle: {
        fontSize: 13,
        fontFamily: 'Gilroy-Regular',
        color: THEME.gray[500],
        marginTop: 2,
    },
    closeButton: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: THEME.gray[100],
        alignItems: 'center',
        justifyContent: 'center',
    },
    contentWrapper: {
        flex: 1,
    },
    scrollContent: {
        flex: 1,
    },
    scrollContentContainer: {
        paddingBottom: 20,
    },
    section: {
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
    },
    sectionIcon: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    sectionTitle: {
        fontSize: 15,
        fontFamily: 'Gilroy-Bold',
        color: THEME.dark,
        flex: 1,
    },
    sectionHint: {
        fontSize: 12,
        fontFamily: 'Gilroy-Medium',
        color: THEME.gray[400],
    },
    selectedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#D1FAE5',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        gap: 4,
    },
    selectedBadgeText: {
        fontSize: 11,
        fontFamily: 'Gilroy-SemiBold',
        color: THEME.success,
    },

    // Date Picker Styles
    datePickerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    datePickerButton: {
        flex: 1,
        backgroundColor: THEME.gray[50],
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: THEME.gray[200],
    },
    datePickerLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    dateLabel: {
        fontSize: 11,
        fontFamily: 'Gilroy-Medium',
        color: THEME.gray[500],
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    dateValue: {
        fontSize: 13,
        fontFamily: 'Gilroy-SemiBold',
        color: THEME.dark,
        marginBottom: 4,
    },
    durationBadge: {
        marginHorizontal: 8,
    },
    durationBadgeGradient: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: THEME.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    durationText: {
        fontSize: 18,
        fontFamily: 'Gilroy-Bold',
        color: THEME.white,
    },
    durationLabel: {
        fontSize: 9,
        fontFamily: 'Gilroy-Medium',
        color: 'rgba(255,255,255,0.85)',
        marginTop: -2,
    },

    // Primary Location Card
    primaryLocationCard: {
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: THEME.success,
    },
    primaryLocationGradient: {
        padding: 14,
    },
    primaryLocationContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    locationImageWrapper: {
        position: 'relative',
    },
    primaryLocationImage: {
        width: 64,
        height: 64,
        borderRadius: 14,
    },
    placeholderImage: {
        width: 64,
        height: 64,
        borderRadius: 14,
        backgroundColor: THEME.gray[200],
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: THEME.warning,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: THEME.white,
    },
    primaryLocationInfo: {
        flex: 1,
        marginLeft: 14,
    },
    primaryLocationName: {
        fontSize: 16,
        fontFamily: 'Gilroy-Bold',
        color: THEME.dark,
        marginBottom: 6,
    },
    primaryLocationMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    primaryLocationMetaText: {
        fontSize: 12,
        fontFamily: 'Gilroy-Regular',
        color: THEME.gray[500],
    },
    checkCircle: {
        marginLeft: 10,
    },
    checkCircleGradient: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Loading & Empty States
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 30,
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        fontFamily: 'Gilroy-Medium',
        color: THEME.gray[500],
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 14,
        fontFamily: 'Gilroy-Regular',
        color: THEME.gray[400],
        marginTop: 12,
    },

    // Nearby Cards Grid
    nearbyGrid: {
        gap: 12,
    },
    nearbyCard: {
        flexDirection: 'row',
        backgroundColor: THEME.gray[50],
        borderRadius: 16,
        padding: 12,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    nearbyCardSelected: {
        backgroundColor: THEME.primaryLight,
        borderColor: THEME.primary,
    },
    nearbyImageContainer: {
        position: 'relative',
    },
    nearbyImage: {
        width: 72,
        height: 72,
        borderRadius: 14,
    },
    nearbyPlaceholder: {
        width: 72,
        height: 72,
        borderRadius: 14,
        backgroundColor: THEME.gray[200],
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectedOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(245, 132, 14, 0.2)',
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectedCheck: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    distanceBadge: {
        position: 'absolute',
        bottom: 6,
        left: 6,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    distanceText: {
        fontSize: 10,
        fontFamily: 'Gilroy-SemiBold',
        color: THEME.white,
    },
    nearbyInfo: {
        flex: 1,
        marginLeft: 14,
        justifyContent: 'center',
    },
    nearbyName: {
        fontSize: 14,
        fontFamily: 'Gilroy-SemiBold',
        color: THEME.dark,
        marginBottom: 6,
    },
    nearbyNameSelected: {
        color: THEME.primary,
    },
    nearbyMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    matchScore: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    matchScoreText: {
        fontSize: 12,
        fontFamily: 'Gilroy-Medium',
        color: THEME.gray[500],
    },

    // Summary Section
    summarySection: {
        marginHorizontal: 20,
        marginTop: 20,
        backgroundColor: THEME.primaryLight,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#FFEDD5',
    },
    summaryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    summaryTitle: {
        fontSize: 14,
        fontFamily: 'Gilroy-Bold',
        color: THEME.primary,
    },
    summaryLocations: {
        gap: 8,
    },
    summaryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    summaryDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: THEME.primary,
    },
    summaryItemText: {
        fontSize: 13,
        fontFamily: 'Gilroy-Medium',
        color: THEME.gray[700],
        flex: 1,
    },

    // Footer
    footer: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
        borderTopWidth: 1,
        borderTopColor: THEME.gray[100],
        backgroundColor: THEME.white,
    },
    generateButton: {
        borderRadius: 18,
        overflow: 'hidden',
        shadowColor: THEME.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 10,
    },
    generateButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        paddingHorizontal: 24,
        gap: 12,
    },
    generateButtonText: {
        fontSize: 16,
        fontFamily: 'Gilroy-Bold',
        color: THEME.white,
        flex: 1,
        textAlign: 'center',
    },
    generateArrow: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default TourPlanModal;
