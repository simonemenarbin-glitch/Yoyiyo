import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Button } from '@/components/Button';
import { colors, fonts, spacing } from '@/lib/theme';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const brand = useSharedValue(0);
  const line = useSharedValue(0);
  const cta = useSharedValue(0);

  useEffect(() => {
    brand.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) });
    line.value = withDelay(
      280,
      withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }),
    );
    cta.value = withDelay(520, withTiming(1, { duration: 600 }));
  }, [brand, line, cta]);

  const brandStyle = useAnimatedStyle(() => ({
    opacity: brand.value,
    transform: [{ translateY: (1 - brand.value) * 18 }],
  }));
  const lineStyle = useAnimatedStyle(() => ({
    opacity: line.value,
    transform: [{ translateY: (1 - line.value) * 12 }],
  }));
  const ctaStyle = useAnimatedStyle(() => ({
    opacity: cta.value,
    transform: [{ translateY: (1 - cta.value) * 10 }],
  }));

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#061820', '#0B3D4A', '#1A6B7A', '#C47A4A']}
        locations={[0, 0.35, 0.72, 1]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          styles.content,
          { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.lg },
        ]}
      >
        <Animated.View style={brandStyle}>
          <Text style={styles.brand}>Yoyiyo</Text>
        </Animated.View>

        <Animated.View style={[styles.copy, lineStyle]}>
          <Text style={styles.headline}>
            Predict when a place will be perfect for you
          </Text>
          <Text style={styles.sub}>
            Not prices. Not generic itineraries. Your Temporal Fit — energy,
            light, crowds, and drift risk — timed to the hour.
          </Text>
        </Animated.View>

        <Animated.View style={[styles.actions, ctaStyle]}>
          <Button
            label="Build your Travel DNA"
            onPress={() => router.push('/dna')}
          />
          <Text style={styles.footnote}>
            Unique Kairos engine · Ready for App Store & Play
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-between',
  },
  brand: {
    fontFamily: fonts.displayItalic,
    fontSize: 56,
    color: colors.mist,
    letterSpacing: -1.5,
  },
  copy: {
    gap: spacing.md,
    maxWidth: 360,
  },
  headline: {
    fontFamily: fonts.display,
    fontSize: 34,
    lineHeight: 40,
    color: colors.mist,
    letterSpacing: -0.6,
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 17,
    lineHeight: 26,
    color: colors.foam,
    opacity: 0.92,
  },
  actions: {
    gap: spacing.md,
  },
  footnote: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.sand,
    textAlign: 'center',
    opacity: 0.85,
  },
});
