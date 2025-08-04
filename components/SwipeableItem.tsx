import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';

const OPEN_THRESHOLD = -30;
const DELETE_BUTTON_WIDTH = 80;

// Global registry for close functions
const swipeableItems: (() => void)[] = [];

export const closeAllSwipeables = () => {
  swipeableItems.forEach(closeFn => closeFn());
};

interface SwipeableItemProps {
  children: React.ReactNode;
  onDelete: () => void;
}

export default function SwipeableItem({ children, onDelete }: SwipeableItemProps) {
  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);

  const closeItem = () => {
    translateX.value = withTiming(0, { duration: 200 });
  };

  const openItem = () => {
    // Close all other items first
    closeAllSwipeables();
    translateX.value = withTiming(-DELETE_BUTTON_WIDTH, { duration: 200 });
  };

  // Register this item's close function
  useEffect(() => {
    swipeableItems.push(closeItem);
    return () => {
      const index = swipeableItems.indexOf(closeItem);
      if (index > -1) {
        swipeableItems.splice(index, 1);
      }
    };
  }, []);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      startX.value = translateX.value;
    })
    .onUpdate((event) => {
      // More responsive following during drag
      const newTranslateX = startX.value + event.translationX;
      translateX.value = Math.max(-DELETE_BUTTON_WIDTH, Math.min(0, newTranslateX));
    })
    .onEnd(() => {
      const wasOpen = startX.value < -10; // Item was already open when drag started
      
      if (wasOpen) {
        // If it was open (-80), close if swiped right past -50 (30px from open position)
        const closePoint = -DELETE_BUTTON_WIDTH + OPEN_THRESHOLD; // -80 + 30 = -50
        if (translateX.value > closePoint) {
          runOnJS(closeItem)();
        } else {
          runOnJS(openItem)();
        }
      } else {
        // If it was closed, open if swiped left past -30
        if (translateX.value < OPEN_THRESHOLD) {
          runOnJS(openItem)();
        } else {
          runOnJS(closeItem)();
        }
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
    closeItem();
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