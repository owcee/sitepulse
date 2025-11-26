import { DefaultTheme } from 'react-native-paper';

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#2196F3', // Blue for primary actions
    accent: '#FF9800', // Orange for secondary actions
    background: '#F5F5F5', // Light gray background
    surface: '#FFFFFF', // White for cards and surfaces
    error: '#F44336', // Red for urgent/error states
    warning: '#FFC107', // Yellow for warnings
    success: '#4CAF50', // Green for completed/success states
    text: '#212121', // Dark text for readability
    disabled: '#BDBDBD', // Gray for disabled elements
    placeholder: '#757575', // Medium gray for placeholders
    backdrop: 'rgba(0, 0, 0, 0.5)',
  },
  fonts: {
    ...DefaultTheme.fonts,
    regular: {
      fontFamily: 'Roboto',
      fontWeight: '400' as const,
    },
    medium: {
      fontFamily: 'Roboto',
      fontWeight: '500' as const,
    },
    light: {
      fontFamily: 'Roboto',
      fontWeight: '300' as const,
    },
    thin: {
      fontFamily: 'Roboto',
      fontWeight: '100' as const,
    },
  },
  roundness: 12, // Rounded corners for buttons and cards
};

// Construction-specific color scheme
export const constructionColors = {
  urgent: '#F44336', // Red
  warning: '#FFC107', // Yellow
  complete: '#4CAF50', // Green
  inProgress: '#FF9800', // Orange
  notStarted: '#9E9E9E', // Gray
  fieldBackground: '#FAFAFA', // Very light gray for outdoor readability
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const fontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};


