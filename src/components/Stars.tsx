import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

type Props = {
  rating: number;
  onChange?: (stars: number) => void;
  size?: number;
};

export default function Stars({ rating, onChange, size = 34 }: Props) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map(i => {
        const filled = i <= Math.round(rating);
        const star = (
          <Ionicons
            name={filled ? 'star' : 'star-outline'}
            size={size}
            color={filled ? colors.orange : colors.border}
          />
        );
        return onChange ? (
          <Pressable key={i} onPress={() => onChange(i)} hitSlop={8}>
            {star}
          </Pressable>
        ) : (
          <View key={i}>{star}</View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    gap: 6,
  },
});
