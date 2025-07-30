import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';

const SWIPE_THRESHOLD = -75;
const DELETE_BUTTON_WIDTH = 80;

interface SwipeableItemProps {
  children: React.ReactNode;
  onDelete: () => void;
}

export default function SwipeableItem({ children, onDelete }: SwipeableItemProps) {
  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      startX.value = translateX.value;
    })
    .onUpdate((event) => {
      // Combine the starting position with the current translation for proper tracking
      const newTranslateX = startX.value + event.translationX;
      // Only allow left swipe (negative values) and clamp to button width
      translateX.value = Math.max(-DELETE_BUTTON_WIDTH, Math.min(0, newTranslateX));
    })
    .onEnd(() => {
      const shouldReveal = translateX.value < SWIPE_THRESHOLD;
      
      if (shouldReveal) {
        translateX.value = withSpring(-DELETE_BUTTON_WIDTH, {
          damping: 25,
          stiffness: 250,
        });
      } else {
        translateX.value = withSpring(0, {
          damping: 25,
          stiffness: 250,
        });
      }
    });

  const containerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const deleteButtonStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-DELETE_BUTTON_WIDTH, 0],
      [1, 0],
      'clamp'
    );
    
    const scale = interpolate(
      translateX.value,
      [-DELETE_BUTTON_WIDTH, -DELETE_BUTTON_WIDTH * 0.5, 0],
      [1, 0.8, 0],
      'clamp'
    );

    return {
      opacity,
      transform: [{ scale }],
    };
  });

  const handleDelete = () => {
    // Reset position first
    translateX.value = withSpring(0, {
      damping: 20,
      stiffness: 300,
    });
    onDelete();
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.deleteButton, deleteButtonStyle]}>
        <TouchableOpacity
          style={styles.deleteButtonTouchable}
          onPress={handleDelete}
          activeOpacity={0.8}
        >
          <Ionicons name="trash" size={20} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
      
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.itemWrapper, containerStyle]}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: 12,
  },
  itemWrapper: {
    zIndex: 1,
  },
  deleteButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: DELETE_BUTTON_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 0,
  },
  deleteButtonTouchable: {
    width: '100%',
    height: '100%',
    backgroundColor: '#ff4444',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});