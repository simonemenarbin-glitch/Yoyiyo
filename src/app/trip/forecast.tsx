import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { AssignmentRow } from '@/components/AssignmentRow';
import { Button } from '@/components/Button';
import { EnergyStrip } from '@/components/EnergyStrip';
import { useAppState } from '@/lib/store';
import { colors, fonts, spacing } from '@/lib/theme';

export default function ForecastScreen() {
  const insets = useSafeAreaInsets();
  const { forecast } = useAppState();
  const [dayIndex, setDayIndex] = useState(0);

  if (!forecast) {
    return (
      <View style={[styles.empty, { paddingTop: insets.top + spacing.xl }]}>
        <Text style={styles.emptyTitle}>No trip yet</Text>
        <Button label="Create a trip" onPress={() => router.replace('/trip/create')} />
      </View>
    );
  }

  const day = forecast.days[dayIndex] ?? forecast.days[0];

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.deep, '#0E4A58', colors.mist]}
        locations={[0, 0.28, 0.55]}
        style={styles.hero}
      >
        <View style={{ paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.lg }}>
          <Animated.Text entering={FadeInUp.duration(500)} style={styles.brand}>
            Yoyiyo
          </Animated.Text>
          <Animated.Text
            entering={FadeInUp.delay(80).duration(550)}
            style={styles.headline}
          >
            {forecast.headline}
          </Animated.Text>
          <Animated.Text
            entering={FadeInDown.delay(140).duration(550)}
            style={styles.insight}
          >
            {forecast.insight}
          </Animated.Text>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + 100,
          marginTop: -24,
          gap: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.dayPicker}>
          {forecast.days.map((d) => {
            const on = d.dayIndex === dayIndex;
            return (
              <Pressable
                key={d.dayIndex}
                onPress={() => setDayIndex(d.dayIndex)}
                style={[styles.dayChip, on && styles.dayChipOn]}
              >
                <Text style={[styles.dayLabel, on && styles.dayLabelOn]}>
                  Day {d.dayIndex + 1}
                </Text>
                <Text style={[styles.dayDate, on && styles.dayDateOn]}>
                  {d.date.slice(5)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Day {day.dayIndex + 1} forecast</Text>
            <Text style={styles.recovery}>
              Jet-lag recovery {Math.round(day.jetLagRecovery * 100)}%
            </Text>
          </View>

          <EnergyStrip points={day.energyCurve} />

          {day.warnings.length > 0 ? (
            <View style={styles.warnBox}>
              {day.warnings.map((w) => (
                <Text key={w} style={styles.warnText}>
                  {w}
                </Text>
              ))}
            </View>
          ) : (
            <Text style={styles.okText}>No major drift warnings for this day.</Text>
          )}

          <View style={{ marginTop: spacing.md }}>
            {day.assignments.length === 0 ? (
              <Text style={styles.okText}>
                Arrival / recovery buffer — intentionally light.
              </Text>
            ) : (
              day.assignments.map((a) => (
                <AssignmentRow
                  key={`${a.experience.id}-${a.slot.startHour}`}
                  assignment={a}
                />
              ))
            )}
          </View>
        </View>

        <View style={styles.legend}>
          <Text style={styles.legendTitle}>What Kairos scores mean</Text>
          <Text style={styles.legendBody}>
            Temporal Fit blends your energy curve, place-quality windows, chronotype,
            crowd fit, light affinity, and regret weight — then subtracts drift risk
            (the chance you’ll abandon the stop). No other travel app optimizes this
            stack.
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button
          label="New prediction"
          variant="sand"
          onPress={() => router.replace('/')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.mist },
  empty: {
    flex: 1,
    backgroundColor: colors.mist,
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  emptyTitle: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.ink,
  },
  hero: {
    paddingBottom: spacing.xxl,
  },
  brand: {
    fontFamily: fonts.displayItalic,
    fontSize: 22,
    color: colors.sand,
    marginBottom: spacing.sm,
  },
  headline: {
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 34,
    color: colors.mist,
    letterSpacing: -0.5,
    maxWidth: 340,
  },
  insight: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 23,
    color: colors.foam,
    marginTop: spacing.md,
    maxWidth: 380,
    opacity: 0.95,
  },
  dayPicker: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dayChip: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(11,61,74,0.1)',
  },
  dayChipOn: {
    backgroundColor: colors.deep,
    borderColor: colors.deep,
  },
  dayLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.deep,
  },
  dayLabelOn: { color: colors.mist },
  dayDate: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  dayDateOn: { color: colors.foam },
  panel: {
    backgroundColor: '#fff',
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(11,61,74,0.08)',
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  panelTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.ink,
  },
  recovery: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.teal,
  },
  warnBox: {
    marginTop: spacing.md,
    gap: 8,
    padding: spacing.md,
    backgroundColor: 'rgba(196,153,58,0.12)',
  },
  warnText: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.warn,
  },
  okText: {
    marginTop: spacing.md,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
  },
  legend: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  legendTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.deep,
  },
  legendBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.muted,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.mist,
  },
});
