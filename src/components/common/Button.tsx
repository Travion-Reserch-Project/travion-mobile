import React from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  ActivityIndicator,
  type TouchableOpacityProps,
} from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?:
    | 'primary'
    | 'minimal'
    | 'secondary'
    | 'outline'
    | 'text'
    | 'success'
    | 'warning'
    | 'error';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'medium',
  loading = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  disabled,
  style,
  ...props
}) => {
  const getButtonClasses = () => {
    const baseClasses = 'rounded-lg items-center justify-center';

    const variantClasses = {
      primary: 'bg-primary',
      minimal: 'bg-black',
      secondary: 'bg-secondary',
      success: 'bg-success',
      warning: 'bg-warning',
      error: 'bg-error',
      outline: 'bg-transparent border border-primary',
      text: 'bg-transparent',
    };

    const sizeClasses = {
      small: 'py-xs px-md',
      medium: 'py-sm px-lg',
      large: 'py-md px-xl',
    };

    const widthClass = fullWidth ? 'w-full' : '';
    const disabledClass = disabled ? 'opacity-50' : '';

    return `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${disabledClass}`.trim();
  };

  const getTextClasses = () => {
    const baseClasses = 'font-semiBold';

    const variantClasses = {
      primary: 'text-white',
      minimal: 'text-white',
      secondary: 'text-white',
      success: 'text-white',
      warning: 'text-black',
      error: 'text-white',
      outline: 'text-primary',
      text: 'text-black',
    };

    const sizeClasses = {
      small: 'text-sm',
      medium: 'text-base',
      large: 'text-lg',
    };

    return `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`.trim();
  };

  const getLoadingColor = () => {
    const colorMap = {
      primary: '#ffffff',
      minimal: '#ffffff',
      secondary: '#ffffff',
      success: '#ffffff',
      warning: '#000000', // Black for yellow/orange background
      error: '#ffffff',
      outline: '#007AFF', // primary color
      text: '#007AFF', // primary color
    };

    return colorMap[variant];
  };

  return (
    <TouchableOpacity
      className={getButtonClasses()}
      style={style}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={getLoadingColor()} />
      ) : (
        <View className="flex-row items-center justify-center">
          {icon && iconPosition === 'left' && <View className="mr-2">{icon}</View>}
          <Text className={`${getTextClasses()} font-gilroy-bold`}>{title}</Text>
          {icon && iconPosition === 'right' && <View className="ml-2">{icon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
};
