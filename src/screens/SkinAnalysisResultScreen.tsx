import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Image,
  ScrollView,
} from "react-native";
import FontAwesome from "react-native-vector-icons/FontAwesome";

const SkinAnalysisResultScreen: React.FC = () => {
  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View className="flex-row items-center px-6 pt-6">
        <TouchableOpacity className="mr-4">
          <FontAwesome name="arrow-left" size={18} color="#0f172a" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-slate-900">
          Analysis Complete
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Image Result */}
        <View className="items-center mt-8">
          <View className="w-64 h-64 rounded-3xl overflow-hidden bg-orange-100 items-center justify-center">
            {/* Placeholder image (replace with analyzed image) */}
            <Image
              source={{ uri: "https://i.imgur.com/8Km9tLL.png" }}
              className="w-full h-full"
              resizeMode="cover"
            />

            {/* Confidence Badge */}
            <View className="absolute bottom-4 bg-white px-4 py-2 rounded-full flex-row items-center shadow">
              <FontAwesome
                name="check-circle"
                size={14}
                color="#f97316"
              />
              <Text className="ml-2 font-semibold text-slate-900">
                98% Confidence
              </Text>
            </View>
          </View>
        </View>

        {/* Skin Type */}
        <View className="items-center mt-8">
          <Text className="text-4xl font-extrabold text-slate-900">
            Type III
          </Text>
          <Text className="text-lg text-slate-500 mt-1">
            Medium Skin Tone
          </Text>
        </View>

        {/* Fitzpatrick Scale */}
        <View className="mt-8 px-6">
          <View className="flex-row justify-between mb-3">
            <Text className="text-xs text-slate-400 font-semibold">
              FAIR
            </Text>
            <Text className="text-xs text-slate-400 font-semibold">
              DEEP
            </Text>
          </View>

          <View className="flex-row items-center">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <View
                key={item}
                className={`flex-1 h-3 rounded-full mx-1 ${
                  item === 3
                    ? "bg-orange-500"
                    : "bg-slate-200"
                }`}
              />
            ))}
          </View>

          <View className="items-center mt-4">
            <View className="bg-orange-100 px-4 py-1 rounded-full">
              <Text className="text-orange-600 text-xs font-semibold">
                FITZPATRICK SCALE
              </Text>
            </View>
          </View>
        </View>

        {/* Sun Sensitivity Card */}
        <View className="px-6 mt-8">
          <View className="bg-orange-50 rounded-3xl p-6">
            <View className="flex-row items-center mb-3">
              <View className="bg-white p-3 rounded-full mr-3">
                <FontAwesome
                  name="sun-o"
                  size={18}
                  color="#f97316"
                />
              </View>
              <Text className="text-lg font-bold text-slate-900">
                Sun Sensitivity
              </Text>
            </View>

            <Text className="text-slate-600 text-sm mb-6">
              Your skin has a moderate risk of burning and tans
              gradually. UV damage can occur in less than{" "}
              <Text className="font-semibold">20 minutes</Text>{" "}
              without protection.
            </Text>

            {/* Stats */}
            <View className="flex-row justify-between">
              <View className="flex-1 bg-white rounded-2xl p-4 mr-3">
                <Text className="text-xs text-slate-400 font-semibold mb-1">
                  REC. SPF
                </Text>
                <Text className="text-lg font-extrabold text-slate-900">
                  30 – 50+
                </Text>
              </View>

              <View className="flex-1 bg-white rounded-2xl p-4 ml-3">
                <Text className="text-xs text-slate-400 font-semibold mb-1">
                  MAX EXPOSURE
                </Text>
                <Text className="text-lg font-extrabold text-slate-900">
                  Moderate
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View className="absolute bottom-0 left-0 right-0 px-6 pb-6 bg-white">
        <TouchableOpacity className="bg-orange-500 rounded-full py-5 flex-row justify-center items-center shadow-lg mb-4">
          <Text className="text-white font-extrabold text-lg mr-2">
            Confirm
          </Text>
          <FontAwesome name="check" size={18} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity className="flex-row justify-center items-center">
          <FontAwesome
            name="refresh"
            size={16}
            color="#64748b"
          />
          <Text className="ml-2 text-slate-500 font-semibold">
            Retake Image
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default SkinAnalysisResultScreen;