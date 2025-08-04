import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Animated,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

interface SwipeableItemProps {
  children: React.ReactNode;
  onDelete: () => void;
}

export default function SwipeableItem({ children, onDelete }: SwipeableItemProps) {
  const renderRightActions = (progress: Animated.AnimatedAddition<number>, dragX: Animated.AnimatedAddition<number>) => {
    const trans = dragX.interpolate({
      inputRange: [-100, -80, 0],
      outputRange: [-20, 0, 80],
      extrapolate: 'clamp',
    });
    
    const scale = progress.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.9, 0.95, 1],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.rightAction}>
        <Animated.View style={[styles.actionContainer, { transform: [{ translateX: trans }, { scale }] }]}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={onDelete}
            activeOpacity={0.8}
          >
            <Ionicons name="trash" size={20} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Swipeable renderRightActions={renderRightActions}>
        {children}
      </Swipeable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  rightAction: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionContainer: {
    width: 80,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    width: 80,
    height: '100%',
    backgroundColor: '#ff4444',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});