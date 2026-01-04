import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import FontAwesome from "react-native-vector-icons/FontAwesome";

const FaceCaptureScreen: React.FC = () => {
  return (
    <View className="flex-1 bg-black">
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Top Bar */}
      <View className="absolute top-0 left-0 right-0 z-10 px-6 pt-6 flex-row items-center justify-between">
        <TouchableOpacity>
          <FontAwesome name="arrow-left" size={18} color="#fff" />
        </TouchableOpacity>

        <Text className="text-white font-semibold text-base">
          Skin Analysis
        </Text>

        <TouchableOpacity>
          <FontAwesome name="question-circle" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Camera Preview Placeholder */}
      <View className="flex-1 bg-[#0b0b0b] items-center justify-center">
        {/* Dark Overlay */}
        <View className="absolute inset-0 bg-black/60" />

        {/* Face Frame */}
        <View className="w-72 h-72 rounded-full border-2 border-dashed border-orange-400 items-center justify-center">
          {/* Inner Glow */}
          <View className="w-64 h-64 rounded-full bg-orange-300/30 items-center justify-center">
            {/* Face Icon */}
            <View className="w-20 h-20 rounded-full bg-white/90 items-center justify-center">
              <FontAwesome name="user" size={36} color="#f97316" />
            </View>
          </View>
        </View>

        {/* Instructions */}
        <View className="absolute top-[18%] items-center px-6">
          <Text className="text-white text-lg font-semibold text-center mb-2">
            Position your face within{"\n"}the frame
          </Text>

          <View className="flex-row items-center bg-black/60 px-3 py-1 rounded-full">
            <View className="w-2 h-2 rounded-full bg-green-400 mr-2" />
            <Text className="text-gray-200 text-xs">
              No filters applied
            </Text>
          </View>
        </View>

        <Text className="absolute bottom-[28%] text-gray-300 text-xs text-center px-10">
          Make sure your face is well-lit and{"\n"}clearly visible
        </Text>
      </View>

      {/* Bottom Controls */}
      <View className="px-8 pb-6">
        <View className="flex-row justify-between items-center mb-6">
          {/* Gallery */}
          <TouchableOpacity className="w-12 h-12 rounded-full bg-gray-800 items-center justify-center">
            <FontAwesome name="image" size={18} color="#fff" />
          </TouchableOpacity>

          {/* Capture Button */}
          <TouchableOpacity className="w-20 h-20 rounded-full bg-orange-500 items-center justify-center border-4 border-black">
            <FontAwesome name="camera" size={26} color="#000" />
          </TouchableOpacity>

          {/* Flash */}
          <TouchableOpacity className="w-12 h-12 rounded-full bg-gray-800 items-center justify-center">
            <FontAwesome name="bolt" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Privacy */}
        <View className="flex-row justify-center items-center">
          <FontAwesome name="lock" size={12} color="#9ca3af" />
          <Text className="ml-2 text-gray-400 text-xs">
            Your photo is processed locally and never stored
          </Text>
        </View>
      </View>
    </View>
  );
};

export default FaceCaptureScreen;