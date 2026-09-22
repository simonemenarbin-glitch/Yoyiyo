import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { DESTINATIONS } from '@/lib/destinations';
import { useAppState } from '@/lib/store';
import { colors, fonts, spacing } from '@/lib/theme';
import type { TripInput } from '@/lib/types';

const HOME_TZ = [
  { label: 'Rome (+1)', offset: 1 },
  { label: 'London (0)', offset: 0 },
  { label: 'NYC (−5)', offset: -5 },
  { label: 'LA (−8)', offset: -8 },
];

export default function CreateTripScreen() {
  const insets = useSafeAreaInsets();
  const { predict } = useAppState();
  const [destinationId, setDestinationId] = useState(DESTINATIONS[0].id);
  const [nights, setNights] = useState(3);
  const [arrivalHour, setArrivalHour] = useState(14);
  const [homeOffset, setHomeOffset] = useState(1);

  const dest = useMemo(
    () => DESTINATIONS.find((d) => d.id === destinationId)!,
    [destinationId],
  );

  const startDate = '2026-10-10';
  const endDate = useMemo(() => {
    const d = new Date(`${startDate}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + nights);
    return d.toISOString().slice(0, 10);
  }, [nights]);

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.md }]}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + 120,
          gap: spacing.xl,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Text style={styles.kicker}>Step 2</Text>
          <Text style={styles.title}>Where are you going?</Text>
          <Text style={styles.sub}>
            Yoyiyo maps your DNA onto place-quality windows and jet-lag recovery.
          </Text>
        </View>

        <View style={styles.destList}>
          {DESTINATIONS.map((d) => {
            const on = d.id === destinationId;
            return (
              <Pressable
                key={d.id}
                onPress={() => setDestinationId(d.id)}
                style={[styles.dest, on && styles.destOn]}
              >
                <Text style={[styles.destName, on && styles.destNameOn]}>
                  {d.name}
                </Text>
                <Text style={[styles.destMeta, on && styles.destMetaOn]}>
                  {d.country} · {d.tagline}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text style={styles.section}>Trip length</Text>
          <View style={styles.row}>
            {[2, 3, 4, 5].map((n) => (
              <Pressable
                key={n}
                onPress={() => setNights(n)}
                style={[styles.chip, nights === n && styles.chipOn]}
              >
                <Text style={[styles.chipText, nights === n && styles.chipTextOn]}>
                  {n + 1} days
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text style={styles.section}>Arrival hour (local)</Text>
          <View style={styles.row}>
            {[9, 12, 14, 18, 21].map((h) => (
              <Pressable
                key={h}
                onPress={() => setArrivalHour(h)}
                style={[styles.chip, arrivalHour === h && styles.chipOn]}
              >
                <Text
                  style={[styles.chipText, arrivalHour === h && styles.chipTextOn]}
                >
                  {h}:00
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text style={styles.section}>Home timezone</Text>
          <View style={styles.row}>
            {HOME_TZ.map((tz) => (
              <Pressable
                key={tz.offset}
                onPress={() => setHomeOffset(tz.offset)}
                style={[styles.chip, homeOffset === tz.offset && styles.chipOn]}
              >
                <Text
                  style={[
                    styles.chipText,
                    homeOffset === tz.offset && styles.chipTextOn,
                  ]}
                >
                  {tz.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      <View
        style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}
      >
        <Button
          label="Run Kairos prediction"
          onPress={() => {
            const trip: TripInput = {
              destinationId,
              startDate,
              endDate,
              arrivalHourLocal: arrivalHour,
              homeTimezoneOffset: homeOffset,
              destinationTimezoneOffset: dest.timezoneOffset,
            };
            predict(trip);
            router.push('/trip/forecast');
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.mist },
  kicker: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.teal,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 34,
    color: colors.ink,
    letterSpacing: -0.7,
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.muted,
    marginTop: spacing.sm,
  },
  destList: { gap: spacing.sm },
  dest: {
    padding: spacing.md,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(11,61,74,0.12)',
  },
  destOn: {
    backgroundColor: colors.deep,
    borderColor: colors.deep,
  },
  destName: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.ink,
  },
  destNameOn: { color: colors.mist },
  destMeta: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
    marginTop: 4,
    lineHeight: 20,
  },
  destMetaOn: { color: colors.foam },
  section: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.deep,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(11,61,74,0.15)',
  },
  chipOn: { backgroundColor: colors.teal, borderColor: colors.teal },
  chipText: { fontFamily: fonts.bodyMedium, color: colors.deep, fontSize: 14 },
  chipTextOn: { color: colors.mist },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.mist,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(11,61,74,0.12)',
  },
});
