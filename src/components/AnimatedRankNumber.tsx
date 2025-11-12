import React, { useEffect } from 'react';
import { Text, TextStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';

interface AnimatedRankNumberProps {
  rank: number;
  style?: TextStyle;
  digitCount?: number;
}

const AnimatedText = Animated.createAnimatedComponent(Text);

export const AnimatedRankNumber: React.FC<AnimatedRankNumberProps> = ({
  rank,
  style,
  digitCount = 1
}) => {
  const animatedRank = useSharedValue(rank);
  const scale = useSharedValue(1);

  useEffect(() => {
    // Animate to new rank with spring physics
    animatedRank.value = withSpring(rank, {
      damping: 15,
      stiffness: 200,
      mass: 0.8
    });

    // Brief scale animation for visual emphasis on rank change
    scale.value = withSpring(1.1, {
      damping: 10,
      stiffness: 300
    });

    setTimeout(() => {
      scale.value = withSpring(1, {
        damping: 15,
        stiffness: 200
      });
    }, 150);
  }, [rank]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const animatedTextStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        scale.value,
        [1, 1.1],
        [1, 0.9],
        Extrapolate.CLAMP
      )
    };
  });

  return (
    <Animated.View style={animatedStyle}>
      <AnimatedText style={[style, animatedTextStyle]}>
        {rank}
      </AnimatedText>
    </Animated.View>
  );
};
