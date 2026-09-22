import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors, fonts, spacing } from '@/lib/theme';

export function EnergyStrip({
  points,
}: {
  points: { hour: number; energy: number }[];
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Energy curve</Text>
      <View style={styles.row}>
        {points
          .filter((_, i) => i % 2 === 0)
          .map((p, i) => (
            <EnergyBar key={p.hour} energy={p.energy} hour={p.hour} delay={i * 40} />
          ))}
      </View>
    </View>
  );
}

function EnergyBar({
  energy,
  hour,
  delay,
}: {
  energy: number;
  hour: number;
  delay: number;
}) {
  const h = useSharedValue(0);
  useEffect(() => {
    h.value = withDelay(
      delay,
      withTiming(energy, { duration: 520, easing: Easing.out(Easing.cubic) }),
    );
  }, [energy, delay, h]);

  const style = useAnimatedStyle(() => ({
    height: 8 + h.value * 52,
    backgroundColor:
      h.value > 0.65 ? colors.sea : h.value > 0.4 ? colors.sand : colors.clay,
  }));

  return (
    <View style={styles.barCol}>
      <Animated.View style={[styles.bar, style]} />
      <Text style={styles.hour}>{hour}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.md,
  },
  title: {
    fontFamily: fonts.bodyMedium,
    color: colors.muted,
    fontSize: 13,
    marginBottom: spacing.sm,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 4,
    minHeight: 72,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  bar: {
    width: '70%',
    borderRadius: 2,
    minHeight: 8,
  },
  hour: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.muted,
  },
});
