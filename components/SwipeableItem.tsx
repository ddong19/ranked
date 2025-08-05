import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import {
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

// Simple global registry for swipeable refs
const swipeableRefs: React.RefObject<any>[] = [];

export const closeAllSwipeables = () => {
  swipeableRefs.forEach(ref => {
    if (ref.current) {
      ref.current.close();
    }
  });
};

const closeOthersImmediately = (currentRef: React.RefObject<any>) => {
  swipeableRefs.forEach(ref => {
    if (ref !== currentRef && ref.current) {
      // Close immediately without animation
      ref.current.close();
    }
  });
};

interface SwipeableItemProps {
  children: React.ReactNode;
  onDelete: () => void;
  onPress?: () => void;
}

export default function SwipeableItem({ children, onDelete, onPress }: SwipeableItemProps) {
  const swipeableRef = useRef<any>(null);

  // Register this swipeable ref globally
  useEffect(() => {
    swipeableRefs.push(swipeableRef);
    return () => {
      const index = swipeableRefs.indexOf(swipeableRef);
      if (index > -1) {
        swipeableRefs.splice(index, 1);
      }
    };
  }, []);

  const handleSwipeableWillOpen = () => {
    // Close others immediately when this one will open (fires earlier)
    closeOthersImmediately(swipeableRef);
  };

  const handleSwipeableOpen = () => {
    // Backup - ensure others are closed when fully open
    closeOthersImmediately(swipeableRef);
  };

  const renderRightActions = () => {
    return (
      <View style={styles.rightAction}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={onDelete}
          activeOpacity={0.8}
        >
          <Ionicons name="trash" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  };

  const childContent = onPress ? (
    <Pressable onPress={onPress} style={{ flex: 1 }}>
      {children}
    </Pressable>
  ) : children;

  return (
    <View style={styles.container}>
      <ReanimatedSwipeable 
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        onSwipeableWillOpen={handleSwipeableWillOpen}
        onSwipeableOpen={handleSwipeableOpen}
        friction={2}
        enableTrackpadTwoFingerGesture
        rightThreshold={5}
      >
        {childContent}
      </ReanimatedSwipeable>
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