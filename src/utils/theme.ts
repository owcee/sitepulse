import { DefaultTheme } from 'react-native-paper';

// Dark Mode + Orange Theme - Matching reference images
export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#FF6B35', // Bright orange - main brand color (from images)
    accent: '#FF6B35', // Orange for secondary actions
    background: '#121212', // Deep charcoal/black background (from images)
    surface: '#1E1E1E', // Dark gray for cards and surfaces
    error: '#F44336', // Red for urgent/error states
    warning: '#FFC107', // Yellow for warnings
    success: '#4CAF50', // Green for completed/success states
    text: '#FFFFFF', // White text for readability in dark mode
    onSurface: '#E0E0E0', // Light gray text on dark surfaces
    onSurfaceVariant: '#9E9E9E', // Medium gray for secondary text
    disabled: '#616161', // Darker gray for disabled elements
    placeholder: '#757575', // Medium gray for placeholders
    backdrop: 'rgba(0, 0, 0, 0.7)',
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

// Construction-specific color scheme - matching reference images
export const constructionColors = {
  urgent: '#F44336', // Red for delayed tasks
  warning: '#FFC107', // Yellow for at-risk tasks
  complete: '#4CAF50', // Green for completed/on schedule
  inProgress: '#FF6B35', // Orange for in-progress (matches primary)
  notStarted: '#757575', // Gray for not started
  fieldBackground: '#1E1E1E', // Dark gray for cards
};

// Softer dark orange for headers and dashboard icons
export const softDarkOrange = '#D45A2A'; // Softer, darker orange

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


