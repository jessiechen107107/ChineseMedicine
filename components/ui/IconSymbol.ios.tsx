import FontAwesome from '@expo/vector-icons/FontAwesome';
import { SymbolView, SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { StyleProp, TextStyle, ViewStyle } from 'react-native';

// Define the specific FontAwesome icon names we want to use on iOS as well
const FONT_AWESOME_NAMES_ON_IOS = new Set([
  'pencil-square-o', // Inquiry icon
  'heartbeat', // Pulse icon
]);

export type IconSymbolProps = {
  name: SymbolViewProps['name'] | string; // Can be SF Symbol name or FontAwesome name
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle | TextStyle>; // Allow both View and Text styles
  weight?: SymbolWeight; // Only relevant for SF Symbols
};

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  weight = 'regular',
}: IconSymbolProps) {

  // If the name is one of the specific FontAwesome icons, render FontAwesome
  if (FONT_AWESOME_NAMES_ON_IOS.has(name)) {
    // Cast style to TextStyle as FontAwesome expects text styles
    return <FontAwesome name={name as any} size={size} color={color} style={style as StyleProp<TextStyle>} />;
  }

  // Otherwise, render SF Symbol using SymbolView (original iOS logic)
  // Cast style to ViewStyle as SymbolView expects view styles
  return (
    <SymbolView
      weight={weight}
      tintColor={color}
      resizeMode="scaleAspectFit"
      name={name as SymbolViewProps['name']}
      style={[{ width: size, height: size }, style] as StyleProp<ViewStyle>}
    />
  );
} 