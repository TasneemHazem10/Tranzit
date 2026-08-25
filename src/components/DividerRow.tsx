import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';

export default function DividerRow() {
  return (
    <View style={styles.row}>
      <View style={styles.line} />
      <Text style={styles.text}>أو</Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    gap: 12,
  },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  text: {
    color: colors.textGray,
    fontFamily: fonts.medium,
    fontSize: 14,
  },
});
