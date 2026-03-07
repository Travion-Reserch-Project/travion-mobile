import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

export interface MapRoute {
  route_id: string;
  transport_type: string;
  polyline: string;
  color?: string;
  navigation_steps?: Array<{
    instruction: string;
    maneuver?: string;
    duration: number;
    distance: number;
    travel_mode: string;
  }>;
}

export interface ChatMapData {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  routes: MapRoute[];
}

interface RouteMapModalProps {
  visible: boolean;
  mapData: ChatMapData | null;
  selectedRouteId: string | null;
  onSelectRoute: (routeId: string) => void;
  onClose: () => void;
}

interface RouteCoordinate {
  latitude: number;
  longitude: number;
}

const decodePolyline = (encoded: string): RouteCoordinate[] => {
  if (!encoded) return [];
  const points: RouteCoordinate[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result += (byte % 32) * Math.pow(2, shift);
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = result % 2 !== 0 ? -(Math.floor(result / 2) + 1) : Math.floor(result / 2);
    latitude += deltaLat;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result += (byte % 32) * Math.pow(2, shift);
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = result % 2 !== 0 ? -(Math.floor(result / 2) + 1) : Math.floor(result / 2);
    longitude += deltaLng;

    points.push({ latitude: latitude / 1e5, longitude: longitude / 1e5 });
  }

  return points;
};

const getRegionFromEndpoints = (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
) => {
  const latitude = (origin.lat + destination.lat) / 2;
  const longitude = (origin.lng + destination.lng) / 2;
  const latitudeDelta = Math.max(Math.abs(origin.lat - destination.lat) * 1.7, 0.03);
  const longitudeDelta = Math.max(Math.abs(origin.lng - destination.lng) * 1.7, 0.03);

  return {
    latitude,
    longitude,
    latitudeDelta,
    longitudeDelta,
  };
};

export const RouteMapModal: React.FC<RouteMapModalProps> = ({
  visible,
  mapData,
  selectedRouteId,
  onSelectRoute,
  onClose,
}) => {
  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View className="flex-1 bg-white">
        <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-200">
          <Text className="text-lg font-gilroy-bold text-gray-900">Route Map</Text>
          <TouchableOpacity onPress={onClose}>
            <FontAwesome5 name="times" size={20} color="#374151" />
          </TouchableOpacity>
        </View>

        {mapData ? (
          <>
            <View className="px-4 py-3 border-b border-gray-100">
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {mapData.routes.map((route, index) => {
                    const selected = selectedRouteId === route.route_id;
                    return (
                      <TouchableOpacity
                        key={route.route_id}
                        onPress={() => onSelectRoute(route.route_id)}
                        className={`px-3 py-2 rounded-full border ${
                          selected ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'
                        }`}
                      >
                        <Text
                          className={`text-xs font-gilroy-bold ${
                            selected ? 'text-white' : 'text-gray-700'
                          }`}
                        >
                          Option {index + 1} • {route.transport_type.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            <View className="flex-1">
              <MapView
                className="flex-1"
                initialRegion={getRegionFromEndpoints(mapData.origin, mapData.destination)}
              >
                <Marker
                  coordinate={{ latitude: mapData.origin.lat, longitude: mapData.origin.lng }}
                  title="Origin"
                  pinColor="green"
                />
                <Marker
                  coordinate={{
                    latitude: mapData.destination.lat,
                    longitude: mapData.destination.lng,
                  }}
                  title="Destination"
                  pinColor="red"
                />

                {mapData.routes.map(route => {
                  const coordinates = decodePolyline(route.polyline);
                  if (coordinates.length === 0) return null;

                  const selected = selectedRouteId === route.route_id;
                  return (
                    <Polyline
                      key={route.route_id}
                      coordinates={coordinates}
                      strokeColor={route.color || '#3B82F6'}
                      strokeWidth={selected ? 5 : 3}
                      zIndex={selected ? 3 : 1}
                    />
                  );
                })}
              </MapView>
            </View>

            {(() => {
              const selectedRoute = mapData.routes.find(r => r.route_id === selectedRouteId);
              if (!selectedRoute?.navigation_steps?.length) return null;

              return (
                <View className="max-h-64 border-t border-gray-200 bg-gray-50">
                  <Text className="px-4 pt-3 pb-2 text-sm font-gilroy-bold text-gray-900">
                    Steps ({selectedRoute.navigation_steps.length})
                  </Text>
                  <ScrollView className="px-4 pb-3" showsVerticalScrollIndicator={false}>
                    {selectedRoute.navigation_steps.map((step, idx) => (
                      <View key={`${selectedRoute.route_id}-step-${idx}`} className="flex-row mb-2">
                        <Text className="text-xs font-gilroy-bold text-blue-700 mr-2">
                          {idx + 1}.
                        </Text>
                        <Text className="flex-1 text-xs font-gilroy-regular text-gray-700">
                          {step.instruction.split('\n')[0]}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              );
            })()}
          </>
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text className="text-gray-600 font-gilroy-regular">No map data available.</Text>
          </View>
        )}
      </View>
    </Modal>
  );
};
