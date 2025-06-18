// Fallback for using MaterialIcons on Android and web.

import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleProp, TextStyle } from 'react-native';

type IconMapping = {
  [key: string]: string; // Allow any string key mapping to a string value
};

// Add your SF Symbols to Material Icons mappings here.
// You can also add mappings for other icons if needed.
const MAPPING: IconMapping = {
  'house.fill': 'home',
  'eye.fill': 'visibility', // Example mapping for eye
  'nose.fill': 'face', // Fallback example for nose
  'fitness': 'fitness-center', // Health/Fitness icon
  // Add other mappings as needed
};

const FONT_AWESOME_NAMES = new Set([
  'pencil-square-o', // Inquiry icon
  'heartbeat', // Pulse icon
]);

export type IconSymbolProps = {
  name: string;
  size?: number;
  color: string;
  style?: StyleProp<TextStyle>;
};

/**
 * A cross-platform icon component that uses Material Icons on Android and web,
 * and handles specific FontAwesome icons.
 * On iOS, IconSymbol.ios.tsx is used for SF Symbols.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: IconSymbolProps) {

  // Handle specific FontAwesome icons
  if (FONT_AWESOME_NAMES.has(name)) {
    return <FontAwesome name={name as any} size={size} color={color} style={style} />;
  }

  // Use MaterialIcons with mapping for other icons
  const materialIconName = MAPPING[name] || name; // Use mapping if exists, otherwise use the name directly as a fallback
  return <MaterialIcons name={materialIconName as any} size={size} color={color} style={style} />;
}
