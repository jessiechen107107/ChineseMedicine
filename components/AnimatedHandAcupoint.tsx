import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming
} from 'react-native-reanimated';
import Svg, { Circle, Defs, G, Line, Path, RadialGradient, Stop, Text as SvgText } from 'react-native-svg';

const AnimatedSvg = Animated.createAnimatedComponent(Svg);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface AcupointData {
  id: string;
  name: string;
  x: number;
  y: number;
  category: 'primary' | 'secondary' | 'tertiary';
  description: string;
  meridian?: string;
}

interface AnimatedHandAcupointProps {
  acupoints: AcupointData[];
  onAcupointPress?: (acupoint: AcupointData) => void;
  healthData?: any;
}

// 原始 SVG viewBox: 824x624
const SVG_WIDTH = 824;
const SVG_HEIGHT = 624;

// 手掌 SVG 路徑（從原始文件提取）
const HAND_PATH = "M0 3120 l0 -3120 4120 0 4120 0 0 3120 0 3120 -4120 0 -4120 0 0 -3120z m5860 2534 c107 -91 137 -358 145 -1314 2 -256 15 -378 48 -475 14 -40 14 -40 70 -43 53 -3 55 -2 61 25 18 84 36 333 36 513 0 113 5 261 11 330 5 69 13 215 18 325 9 215 24 286 79 388 92 171 262 127 301 -78 6 -29 9 -372 9 -800 0 -454 4 -780 10 -825 6 -41 16 -113 22 -160 13 -104 33 -185 61 -250 26 -60 45 -64 111 -20 57 38 71 55 92 110 21 55 89 171 131 225 20 26 35 61 43 98 16 83 74 197 127 252 100 103 259 140 357 82 23 -14 51 -38 60 -55 17 -29 17 -30 -28 -123 -50 -102 -69 -159 -108 -319 -17 -69 -36 -118 -54 -145 -16 -22 -55 -85 -87 -140 -32 -55 -91 -154 -130 -220 -40 -66 -96 -167 -125 -225 -29 -58 -66 -124 -82 -147 -15 -23 -58 -116 -94 -205 -129 -320 -223 -470 -366 -583 -53 -41 -73 -88 -99 -235 -20 -108 -15 -395 11 -655 11 -121 24 -254 27 -296 l6 -76 -46 -35 c-55 -42 -218 -111 -325 -139 -136 -35 -291 -45 -482 -31 -117 8 -189 18 -230 32 -80 27 -262 113 -277 131 -9 11 -10 37 -2 105 49 455 49 664 -2 1104 -15 131 -25 181 -38 201 -34 47 -88 163 -114 244 -46 148 -115 439 -137 575 -12 74 -32 196 -45 270 -13 74 -29 171 -35 215 -7 44 -23 141 -35 215 -13 74 -28 164 -34 200 -6 36 -26 102 -45 146 -30 72 -61 170 -94 299 -6 22 -25 85 -43 140 -39 123 -46 258 -16 313 20 36 71 72 102 72 34 0 90 -56 127 -127 60 -114 187 -418 209 -500 11 -43 32 -98 46 -123 14 -25 34 -74 45 -110 21 -70 54 -130 69 -130 28 0 -58 638 -143 1060 -35 176 -37 190 -37 351 -1 176 11 238 58 288 23 24 37 31 68 31 63 0 123 -37 160 -99 44 -73 59 -130 84 -306 11 -82 36 -233 54 -335 31 -166 46 -263 59 -370 5 -44 82 -412 96 -462 11 -38 23 -45 48 -29 28 17 35 191 33 761 -2 597 8 880 34 968 11 35 30 68 59 97 38 41 47 45 89 45 35 0 53 -6 77 -26z m-3412 -39 c39 -33 59 -77 82 -182 23 -107 27 -372 16 -1103 -8 -523 -9 -517 44 -522 22 -3 26 3 42 62 26 94 75 399 83 510 3 52 17 147 31 210 14 63 34 160 45 215 76 381 140 565 209 600 71 37 135 2 169 -91 37 -98 30 -238 -33 -609 -13 -82 -32 -203 -41 -267 -8 -64 -24 -152 -35 -194 -11 -42 -20 -92 -20 -110 0 -18 -11 -109 -25 -204 -14 -95 -25 -192 -25 -218 0 -49 20 -82 51 -82 25 0 75 108 142 310 30 91 67 191 81 223 14 32 26 67 26 78 0 33 58 197 91 260 17 31 43 69 59 84 51 49 121 31 155 -42 30 -63 30 -120 0 -234 -15 -57 -31 -131 -35 -164 -13 -97 -38 -199 -69 -282 -16 -43 -32 -100 -36 -128 -9 -67 -67 -314 -105 -445 -38 -132 -64 -268 -84 -440 -31 -264 -39 -316 -58 -409 -36 -172 -111 -351 -237 -564 -28 -46 -55 -104 -61 -128 -17 -74 -24 -430 -11 -579 15 -167 50 -494 57 -536 5 -28 1 -35 -48 -73 -76 -61 -144 -93 -300 -139 -333 -100 -601 -94 -841 17 -77 36 -122 70 -165 124 -39 49 -39 46 1 277 28 155 60 423 77 632 12 146 9 157 -64 237 -136 148 -330 411 -414 561 -48 86 -159 362 -193 479 -43 148 -80 220 -278 536 -44 71 -83 145 -87 164 -8 51 -57 220 -116 399 -31 97 -48 163 -44 178 4 14 25 34 54 51 61 36 150 37 230 3 103 -44 204 -191 235 -341 11 -54 23 -78 64 -128 27 -33 71 -98 98 -143 27 -46 66 -109 88 -142 39 -58 40 -58 79 -53 22 3 45 10 50 15 5 5 20 69 34 143 13 74 35 188 49 254 13 66 27 158 30 205 4 47 11 105 17 130 5 25 13 316 18 655 7 559 9 618 28 702 23 104 45 143 98 168 31 15 42 15 81 4 25 -6 60 -26 78 -43 65 -62 98 -245 84 -471 -5 -71 -5 -139 -2 -150 3 -11 7 -123 8 -250 1 -165 6 -254 18 -315 9 -47 21 -144 26 -215 17 -223 40 -287 106 -299 21 -4 41 -4 45 1 5 4 20 85 35 178 20 128 29 231 36 420 22 658 29 801 49 950 25 194 32 216 76 255 46 40 108 42 152 5z";

const FINGER_PATH = "M5743 5605 c-33 -23 -55 -92 -64 -205 -14 -155 -21 -991 -9 -1081 6 -50 6 -118 0 -191 -6 -62 -11 -165 -13 -228 l-2 -115 -55 -27 c-30 -15 -69 -28 -86 -28 -48 0 -97 65 -63 85 6 4 8 14 4 23 -11 30 -86 408 -95 481 -12 92 -45 285 -65 371 -8 36 -22 119 -29 185 -42 360 -83 463 -187 468 -54 3 -70 -42 -77 -208 -5 -135 6 -248 35 -360 8 -33 19 -87 23 -120 13 -97 61 -377 71 -415 11 -44 37 -259 49 -408 5 -62 14 -121 20 -133 9 -17 6 -25 -23 -54 -29 -29 -43 -35 -76 -35 -26 0 -41 5 -42 13 -3 27 -5 34 -27 76 -13 24 -32 70 -43 103 -10 34 -28 75 -38 92 -21 34 -42 93 -61 171 -6 28 -25 76 -41 108 -16 32 -29 68 -30 80 0 12 -3 17 -5 10 -3 -7 -22 -17 -42 -24 -20 -6 -49 -20 -64 -30 -32 -23 -54 -24 -62 -3 -8 20 33 60 86 84 39 17 44 17 60 4 30 -28 -96 237 -133 280 -37 41 -37 41 -58 22 -50 -46 -46 -155 14 -344 19 -59 35 -115 35 -124 0 -24 73 -243 100 -304 22 -47 86 -369 95 -482 3 -29 11 -81 19 -116 8 -34 17 -80 20 -101 6 -55 42 -280 61 -390 39 -221 144 -583 195 -673 52 -90 219 -194 380 -238 91 -24 121 -52 80 -74 -29 -15 -219 50 -311 106 -40 25 -73 43 -75 41 -2 -2 1 -43 7 -93 43 -376 49 -598 24 -914 -9 -107 -17 -216 -18 -243 l-2 -47 100 -46 c154 -70 183 -75 426 -81 236 -6 328 4 466 51 92 31 215 89 231 108 11 13 10 42 -3 160 -27 241 -45 496 -45 624 0 109 25 314 45 366 6 16 4 16 -37 3 -143 -48 -221 -47 -190 2 4 7 52 24 105 37 54 14 121 38 149 53 110 59 236 206 315 368 17 33 58 131 92 217 34 86 78 180 96 210 19 29 57 98 84 153 48 96 167 301 307 529 61 99 70 122 99 241 18 73 33 155 33 182 0 36 10 71 36 128 20 43 34 81 31 83 -3 3 -32 8 -64 10 -117 8 -218 -52 -278 -165 -36 -66 -65 -169 -57 -199 4 -14 -5 -28 -33 -50 -46 -38 -119 -162 -153 -264 -22 -62 -30 -75 -48 -75 -12 0 -45 -18 -74 -40 -76 -58 -77 -59 -104 -44 -20 10 -37 10 -92 0 -249 -49 -445 -226 -618 -559 -45 -89 -65 -117 -80 -117 -36 0 -27 42 31 152 173 329 377 517 625 578 l69 17 -15 37 c-63 144 -83 293 -98 731 -6 201 -9 374 -5 385 11 34 9 854 -3 920 -17 94 -52 145 -100 145 -30 0 -84 -61 -106 -120 -39 -104 -45 -135 -48 -290 -2 -85 -8 -202 -14 -260 -6 -58 -13 -231 -15 -386 -3 -154 -11 -339 -19 -409 -13 -115 -13 -130 1 -140 42 -31 -21 -81 -115 -92 -92 -10 -201 44 -175 87 8 12 9 29 3 52 -30 107 -40 323 -55 1143 -4 224 -31 440 -66 522 -26 60 -71 79 -116 48z";

// 基於 824x624 viewBox 的絕對座標穴位位置 - 根據中醫手部穴位圖調整
const DEFAULT_ACUPOINTS: AcupointData[] = [
  // 主要經絡穴位
  {
    id: 'laogong',
    name: 'Laogong',
    x: 412, // 手心中央
    y: 380,
    category: 'primary',
    description: 'Pericardium meridian point, center of palm',
    meridian: 'Pericardium'
  },
  {
    id: 'shenmen',
    name: 'Shenmen',
    x: 310, // 手腕尺側
    y: 500,
    category: 'primary',
    description: 'Heart meridian point, ulnar side of wrist',
    meridian: 'Heart'
  },
  {
    id: 'hegu',
    name: 'Hegu',
    x: 540, // 虎口位置
    y: 320,
    category: 'primary',
    description: 'Large Intestine meridian point, tiger mouth',
    meridian: 'Large Intestine'
  },
  {
    id: 'yangchi',
    name: 'Yangchi',
    x: 412, // 手腕背側中央
    y: 520,
    category: 'primary',
    description: 'Triple Heater meridian point, back of wrist center',
    meridian: 'Triple Heater'
  },
  
  // 手指穴位
  {
    id: 'shaoshang',
    name: 'Shaoshang',
    x: 360, // 拇指尖
    y: 150,
    category: 'secondary',
    description: 'Lung meridian point, thumb tip',
    meridian: 'Lung'
  },
  {
    id: 'shangyang',
    name: 'Shangyang',
    x: 480, // 食指尖
    y: 120,
    category: 'secondary',
    description: 'Large Intestine meridian point, index finger tip',
    meridian: 'Large Intestine'
  },
  {
    id: 'zhongchong',
    name: 'Zhongchong',
    x: 430, // 中指尖
    y: 100,
    category: 'secondary',
    description: 'Pericardium meridian point, middle finger tip',
    meridian: 'Pericardium'
  },
  {
    id: 'guanchong',
    name: 'Guanchong',
    x: 400, // 無名指尖
    y: 110,
    category: 'secondary',
    description: 'Triple Heater meridian point, ring finger tip',
    meridian: 'Triple Heater'
  },
  {
    id: 'shaoze',
    name: 'Shaoze',
    x: 370, // 小指尖
    y: 130,
    category: 'secondary',
    description: 'Small Intestine meridian point, little finger tip',
    meridian: 'Small Intestine'
  },
  
  // 手掌反射區
  {
    id: 'heart_area',
    name: 'Heart Area',
    x: 380, // 心臟反射區
    y: 350,
    category: 'tertiary',
    description: 'Heart reflex zone',
    meridian: 'Reflex Zone'
  },
  {
    id: 'liver_area',
    name: 'Liver Area',
    x: 450, // 肝臟反射區
    y: 370,
    category: 'tertiary',
    description: 'Liver reflex zone',
    meridian: 'Reflex Zone'
  },
  {
    id: 'lung_area',
    name: 'Lung Area',
    x: 420, // 肺部反射區
    y: 320,
    category: 'tertiary',
    description: 'Lung reflex zone',
    meridian: 'Reflex Zone'
  },
  {
    id: 'kidney_area',
    name: 'Kidney Area',
    x: 380, // 腎臟反射區
    y: 420,
    category: 'tertiary',
    description: 'Kidney reflex zone',
    meridian: 'Reflex Zone'
  },
  {
    id: 'stomach_area',
    name: 'Stomach Area',
    x: 410, // 胃部反射區
    y: 400,
    category: 'tertiary',
    description: 'Stomach reflex zone',
    meridian: 'Reflex Zone'
  },
  {
    id: 'spleen_area',
    name: 'Spleen Area',
    x: 350, // 脾臟反射區
    y: 380,
    category: 'tertiary',
    description: 'Spleen reflex zone',
    meridian: 'Reflex Zone'
  },
  
  // 手腕穴位
  {
    id: 'taiyuan',
    name: 'Taiyuan',
    x: 380, // 太淵穴
    y: 510,
    category: 'primary',
    description: 'Lung meridian point, radial artery pulse point',
    meridian: 'Lung'
  },
  {
    id: 'daling',
    name: 'Daling',
    x: 412, // 大陵穴
    y: 500,
    category: 'primary',
    description: 'Pericardium meridian point, wrist crease center',
    meridian: 'Pericardium'
  },
  
  // 手背穴位
  {
    id: 'houxi',
    name: 'Houxi',
    x: 320, // 後溪穴
    y: 450,
    category: 'secondary',
    description: 'Small Intestine meridian point, ulnar side of hand',
    meridian: 'Small Intestine'
  },
  {
    id: 'yanggu',
    name: 'Yanggu',
    x: 300, // 陽谷穴
    y: 480,
    category: 'secondary',
    description: 'Small Intestine meridian point, wrist ulnar side',
    meridian: 'Small Intestine'
  },
  
  // 拇指區域穴位
  {
    id: 'yuji',
    name: 'Yuji',
    x: 370, // 魚際穴
    y: 400,
    category: 'secondary',
    description: 'Lung meridian point, thenar eminence',
    meridian: 'Lung'
  },
  {
    id: 'shaoshang_area',
    name: 'Ear Point',
    x: 340, // 耳朵反射區
    y: 300,
    category: 'tertiary',
    description: 'Ear reflex zone on thumb',
    meridian: 'Reflex Zone'
  }
];

const AnimatedHandAcupoint: React.FC<AnimatedHandAcupointProps> = ({
  acupoints = DEFAULT_ACUPOINTS,
  onAcupointPress,
  healthData
}) => {
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  
  // 計算適合螢幕的縮放比例
  const scale = Math.min(screenWidth / SVG_WIDTH, (screenHeight * 0.6) / SVG_HEIGHT) * 0.9;
  const scaledWidth = SVG_WIDTH * scale;
  const scaledHeight = SVG_HEIGHT * scale;

  // 動畫值
  const handOpacity = useSharedValue(0);
  const handScale = useSharedValue(0.8);

  // 穴位動畫值
  const acupointAnimations = acupoints.reduce((acc, acupoint) => {
    acc[acupoint.id] = {
      opacity: useSharedValue(0),
      scale: useSharedValue(0),
      pulse: useSharedValue(1),
    };
    return acc;
  }, {} as Record<string, { opacity: any; scale: any; pulse: any }>);

  useEffect(() => {
    // 手掌出現動畫
    handOpacity.value = withTiming(1, { duration: 1200, easing: Easing.out(Easing.cubic) });
    handScale.value = withTiming(1, { duration: 1200, easing: Easing.out(Easing.back(1.2)) });

    // 穴位依序出現動畫
    acupoints.forEach((acupoint, index) => {
      const animation = acupointAnimations[acupoint.id];
      if (animation) {
        // 延遲出現
        animation.opacity.value = withDelay(
          1000 + index * 200,
          withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) })
        );
        animation.scale.value = withDelay(
          1000 + index * 200,
          withTiming(1, { duration: 400, easing: Easing.out(Easing.back(1.5)) })
        );

        // 脈動效果
        animation.pulse.value = withDelay(
          1500 + index * 200,
          withRepeat(
            withSequence(
              withTiming(1.4, { duration: 800, easing: Easing.inOut(Easing.sin) }),
              withTiming(1, { duration: 800, easing: Easing.inOut(Easing.sin) })
            ),
            -1,
            false
          )
        );
      }
    });
  }, []);

  // 手掌動畫樣式
  const handAnimatedStyle = useAnimatedStyle(() => ({
    opacity: handOpacity.value,
    transform: [{ scale: handScale.value }],
  }));

  // 獲取穴位顏色
  const getAcupointColor = (category: string) => {
    switch (category) {
      case 'primary': return '#FF4444';
      case 'secondary': return '#44AAFF';
      case 'tertiary': return '#FFAA44';
      default: return '#888888';
    }
  };

  // 處理穴位按壓
  const handleAcupointPress = (acupoint: AcupointData) => {
    onAcupointPress?.(acupoint);
  };

  return (
    <View style={styles.container}>
      <AnimatedSvg
        width={scaledWidth}
        height={scaledHeight}
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        style={handAnimatedStyle}
      >
        <Defs>
          <RadialGradient id="primaryGradient" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#FF6666" stopOpacity="0.9" />
            <Stop offset="100%" stopColor="#FF4444" stopOpacity="1" />
          </RadialGradient>
          <RadialGradient id="secondaryGradient" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#66AAFF" stopOpacity="0.9" />
            <Stop offset="100%" stopColor="#44AAFF" stopOpacity="1" />
          </RadialGradient>
          <RadialGradient id="tertiaryGradient" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#FFCC66" stopOpacity="0.9" />
            <Stop offset="100%" stopColor="#FFAA44" stopOpacity="1" />
          </RadialGradient>
        </Defs>

        {/* 手掌主體路徑 - 只保留白色線條輪廓 */}
        <G transform="translate(0, 624) scale(0.1, -0.1)">
          <Path
            d={HAND_PATH}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d={FINGER_PATH}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </G>

        {/* 經絡線條 */}
        <G opacity="0.6">
          {/* 心包經線條 */}
          <Line x1="430" y1="100" x2="412" y2="380" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="5,5" opacity="0.7" />
          <Line x1="412" y1="380" x2="412" y2="500" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="5,5" opacity="0.7" />
          
          {/* 肺經線條 */}
          <Line x1="360" y1="150" x2="370" y2="400" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.6" />
          <Line x1="370" y1="400" x2="380" y2="510" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.6" />
          
          {/* 大腸經線條 */}
          <Line x1="480" y1="120" x2="540" y2="320" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="4,4" opacity="0.6" />
          
          {/* 小腸經線條 */}
          <Line x1="370" y1="130" x2="320" y2="450" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="2,2" opacity="0.5" />
          <Line x1="320" y1="450" x2="300" y2="480" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="2,2" opacity="0.5" />
          
          {/* 心經線條 */}
          <Line x1="310" y1="500" x2="380" y2="350" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="6,3" opacity="0.6" />
          
          {/* 三焦經線條 */}
          <Line x1="400" y1="110" x2="412" y2="520" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="4,2" opacity="0.5" />
        </G>

        {/* 穴位點 */}
        {acupoints.map((acupoint) => {
          const animation = acupointAnimations[acupoint.id];
          if (!animation) return null;

          return (
            <G key={acupoint.id}>
              <AnimatedCircle
                cx={acupoint.x}
                cy={acupoint.y}
                r="12"
                fill={`url(#${acupoint.category}Gradient)`}
                stroke="#FFFFFF"
                strokeWidth="2"
                opacity={animation.opacity}
                transform={[
                  { scale: animation.scale },
                  { scale: animation.pulse }
                ]}
                onPress={() => handleAcupointPress(acupoint)}
              />
              {/* 穴位名稱 */}
              <SvgText
                x={acupoint.x}
                y={acupoint.y - 20}
                textAnchor="middle"
                fontSize="12"
                fill="#FFFFFF"
                fontWeight="bold"
                opacity={animation.opacity}
              >
                {acupoint.name}
              </SvgText>
            </G>
          );
        })}
      </AnimatedSvg>

      {/* 圖例 */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#FF4444' }]} />
          <Text style={styles.legendText}>Primary Points</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#44AAFF' }]} />
          <Text style={styles.legendText}>Secondary Points</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#FFAA44' }]} />
          <Text style={styles.legendText}>Reflex Zones</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#FFFFFF',
  },
});

export default AnimatedHandAcupoint; 