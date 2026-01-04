import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import FontAwesome from "react-native-vector-icons/FontAwesome";

const SkinAnalysisScreen: React.FC = () => {
  return (
    <View className="flex-1 bg-white px-6">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View className="flex-row items-center mt-6 mb-10">
        <TouchableOpacity className="mr-4">
          <FontAwesome name="arrow-left" size={18} color="#0f172a" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-slate-900">
          Skin Analysis
        </Text>
      </View>

      {/* Title */}
      <Text className="text-3xl font-extrabold text-slate-900 text-center mb-3">
        Let's check your{"\n"}sensitivity.
      </Text>

      <Text className="text-slate-500 text-center text-base mb-8 px-4">
        Upload a clear image in good lighting,{"\n"}
        without filters.
      </Text>

      {/* Image Upload Area */}
      <View className="items-center mb-10">
        <View className="w-full h-80 rounded-3xl border-2 border-dashed border-orange-200 bg-orange-50 items-center justify-center">
          <View className="w-24 h-24 rounded-full bg-white items-center justify-center shadow-sm mb-4">
            <FontAwesome
              name="user"
              size={32}
              color="#f97316"
            />
          </View>

          <Text className="text-lg font-bold text-slate-900 mb-1">
            No Image Selected
          </Text>
          <Text className="text-slate-500 text-sm">
            Use the buttons below to add a photo
          </Text>
        </View>
      </View>

      {/* Camera / Gallery Buttons */}
      <View className="flex-row justify-between mb-10">
        <TouchableOpacity className="flex-1 bg-white border border-slate-200 rounded-2xl py-5 mr-3 items-center">
          <FontAwesome
            name="camera"
            size={22}
            color="#f97316"
          />
          <Text className="mt-2 font-semibold text-slate-900">
            Camera
          </Text>
        </TouchableOpacity>

        <TouchableOpacity className="flex-1 bg-white border border-slate-200 rounded-2xl py-5 ml-3 items-center">
          <FontAwesome
            name="image"
            size={22}
            color="#94a3b8"
          />
          <Text className="mt-2 font-semibold text-slate-900">
            Gallery
          </Text>
        </TouchableOpacity>
      </View>

      {/* CTA */}
      <TouchableOpacity className="bg-orange-500 rounded-full py-5 flex-row justify-center items-center mb-4 shadow-lg">
        <FontAwesome
          name="search"
          size={18}
          color="#ffffff"
        />
        <Text className="text-white font-extrabold text-lg ml-3">
          Analyze Skin Type
        </Text>
      </TouchableOpacity>

      {/* Privacy Note */}
      <View className="flex-row justify-center items-center">
        <FontAwesome
          name="lock"
          size={12}
          color="#94a3b8"
        />
        <Text className="ml-2 text-slate-500 text-xs">
          Your photo is processed locally for privacy.
        </Text>
      </View>
    </View>
  );
};

export default SkinAnalysisScreen;