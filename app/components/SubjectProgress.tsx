import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type SubjectProgressProps = {
  subject: string;
  completedHours: number;
  totalHours: number;
  onPressCheck: () => void;       // increment 1 hour
  onLongPressCheck?: () => void;  // decrement 1 hour (optional)
};

export default function SubjectProgress({
  subject,
  completedHours,
  totalHours,
  onPressCheck,
  onLongPressCheck,
}: SubjectProgressProps) {
  const percent = (completedHours / totalHours) * 100;
  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: percent,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [percent]);

  const fillStyle = {
    width: animatedWidth.interpolate({
      inputRange: [0, 100],
      outputRange: ['0%', '100%'],
    }),
  };

  return (
    <View style={styles.wrapper}>
      <Animated.View style={[styles.fillBar, fillStyle]} />

      <View style={styles.row}>
        <Text style={styles.subjectText}>
          {subject} ({completedHours}/{totalHours}h)
        </Text>

        <TouchableOpacity
          style={styles.checkButton}
          onPress={onPressCheck}
          onLongPress={onLongPressCheck}
        >
          <Ionicons name="checkmark" size={22} color="#25292e" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '95%',
    alignSelf: 'center',
    marginVertical: 10,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#2f3542',
  },
  fillBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#ffd33d',
    opacity: 0.35,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  subjectText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  checkButton: {
    backgroundColor: '#ffd33d',
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
