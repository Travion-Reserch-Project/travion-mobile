import React from 'react';
import { View, ViewStyle } from 'react-native';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: ViewStyle;
}

// Custom icon component using simple shapes
// Replace with proper SVG library when network is available
export const Icon: React.FC<IconProps> = ({ name, size = 24, color = '#000000', style }) => {
  const iconStyle: ViewStyle = {
    width: size,
    height: size,
    justifyContent: 'center',
    alignItems: 'center',
    ...style,
  };

  // Simple icon representations
  const getIcon = () => {
    switch (name) {
      case 'beach':
        return <View style={[iconStyle, { backgroundColor: color, borderRadius: size / 2 }]} />;
      case 'city':
        return <View style={[iconStyle, { backgroundColor: color }]} />;
      case 'terrain':
        return (
          <View
            style={[
              iconStyle,
              {
                backgroundColor: color,
                transform: [{ rotate: '45deg' }],
              },
            ]}
          />
        );
      case 'account-group':
        return <View style={[iconStyle, { backgroundColor: color, borderRadius: 4 }]} />;
      case 'account':
        return <View style={[iconStyle, { backgroundColor: color, borderRadius: size / 2 }]} />;
      case 'account-heart':
        return <View style={[iconStyle, { backgroundColor: color, borderRadius: size / 2 }]} />;
      case 'paw':
        return <View style={[iconStyle, { backgroundColor: color, borderRadius: size / 3 }]} />;
      default:
        return <View style={[iconStyle, { backgroundColor: color, borderRadius: 2 }]} />;
    }
  };

  return getIcon();
};
