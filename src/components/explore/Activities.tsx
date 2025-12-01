import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

interface ActivityItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  rating: number;
  duration: string;
  price?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
}

interface ActivitiesProps {
  activities?: ActivityItem[];
}

const defaultActivities: ActivityItem[] = [
  {
    id: '1',
    title: 'City Walking Tour',
    description: 'Explore historical landmarks and local culture with a guided tour',
    icon: 'walking',
    rating: 4.8,
    duration: '3-4 hours',
    price: '$25',
    difficulty: 'Easy',
  },
  {
    id: '2',
    title: 'Mountain Hiking',
    description: 'Adventure through scenic trails with breathtaking views',
    icon: 'mountain',
    rating: 4.9,
    duration: '5-6 hours',
    price: '$45',
    difficulty: 'Hard',
  },
  {
    id: '3',
    title: 'Cultural Museum Visit',
    description: 'Discover art, history, and local heritage',
    icon: 'university',
    rating: 4.6,
    duration: '2-3 hours',
    price: '$15',
    difficulty: 'Easy',
  },
  {
    id: '4',
    title: 'Food Street Tour',
    description: 'Taste authentic local cuisine and street food',
    icon: 'utensils',
    rating: 4.7,
    duration: '2-3 hours',
    price: '$35',
    difficulty: 'Easy',
  },
];

const categories = [
  { id: 'all', name: 'All', icon: 'list' },
  { id: 'outdoor', name: 'Outdoor', icon: 'tree' },
  { id: 'culture', name: 'Culture', icon: 'landmark' },
  { id: 'food', name: 'Food', icon: 'utensils' },
  { id: 'adventure', name: 'Adventure', icon: 'mountain' },
];

export const Activities: React.FC<ActivitiesProps> = ({ activities = defaultActivities }) => {
  const [selectedCategory, setSelectedCategory] = React.useState('all');

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return '#10B981';
      case 'Medium':
        return '#F59E0B';
      case 'Hard':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  return (
    <View className="px-6">
      <Text className="text-xl font-gilroy-bold text-gray-900 mb-4">Suggested Activities</Text>

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
        <View className="flex-row space-x-3">
          {categories.map(category => (
            <TouchableOpacity
              key={category.id}
              className={`flex-row items-center px-4 py-2 rounded-full ${
                selectedCategory === category.id ? 'bg-primary' : 'bg-gray-100'
              }`}
              onPress={() => setSelectedCategory(category.id)}
            >
              <FontAwesome5
                name={category.icon}
                size={14}
                color={selectedCategory === category.id ? 'white' : '#6B7280'}
              />
              <Text
                className={`text-sm font-gilroy-medium ml-2 ${
                  selectedCategory === category.id ? 'text-white' : 'text-gray-700'
                }`}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Activities List */}
      {activities.map(activity => (
        <TouchableOpacity key={activity.id} className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
          <View className="flex-row items-start">
            <View className="w-12 h-12 bg-primary/10 rounded-full items-center justify-center mr-4">
              <FontAwesome5 name={activity.icon} size={18} color="#F5840E" />
            </View>
            <View className="flex-1">
              <View className="flex-row items-start justify-between mb-2">
                <Text className="text-lg font-gilroy-bold text-gray-900 flex-1">
                  {activity.title}
                </Text>
                {activity.price && (
                  <Text className="text-lg font-gilroy-bold text-primary ml-2">
                    {activity.price}
                  </Text>
                )}
              </View>

              <Text className="text-sm font-gilroy-regular text-gray-600 mb-3 leading-5">
                {activity.description}
              </Text>

              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center space-x-4">
                  <View className="flex-row items-center">
                    <FontAwesome5 name="star" size={12} color="#F59E0B" solid />
                    <Text className="text-sm font-gilroy-medium text-gray-700 ml-1">
                      {activity.rating}
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <FontAwesome5 name="clock" size={12} color="#6B7280" />
                    <Text className="text-sm font-gilroy-medium text-gray-600 ml-1">
                      {activity.duration}
                    </Text>
                  </View>
                  {activity.difficulty && (
                    <View className="flex-row items-center">
                      <View
                        className="w-2 h-2 rounded-full mr-1"
                        style={{ backgroundColor: getDifficultyColor(activity.difficulty) }}
                      />
                      <Text className="text-sm font-gilroy-medium text-gray-600">
                        {activity.difficulty}
                      </Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity className="bg-primary/10 px-4 py-2 rounded-full">
                  <Text className="text-sm font-gilroy-medium text-primary">Book Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      ))}

      {/* Popular Activities Banner */}
      <View className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-2xl p-6 mt-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-lg font-gilroy-bold text-gray-900 mb-2">Popular This Week</Text>
            <Text className="text-sm font-gilroy-regular text-gray-600">
              Discover trending activities in your area
            </Text>
          </View>
          <TouchableOpacity className="bg-primary px-4 py-2 rounded-full">
            <Text className="text-sm font-gilroy-bold text-white">Explore</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};
