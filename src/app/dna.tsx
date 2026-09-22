import { useState, type ReactNode } from 'react';
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
import { useAppState } from '@/lib/store';
import { colors, fonts, spacing } from '@/lib/theme';
import type {
  Chronotype,
  CrowdTolerance,
  Pace,
  Priority,
  TravelDna,
} from '@/lib/types';

const PRIORITIES: { id: Priority; label: string }[] = [
  { id: 'food', label: 'Food' },
  { id: 'culture', label: 'Culture' },
  { id: 'nature', label: 'Nature' },
  { id: 'nightlife', label: 'Nightlife' },
  { id: 'photo', label: 'Photo light' },
  { id: 'rest', label: 'Rest' },
];

export default function DnaScreen() {
  const insets = useSafeAreaInsets();
  const { dna, setDna } = useAppState();
  const [draft, setDraft] = useState<TravelDna>(dna);

  const togglePriority = (id: Priority) => {
    setDraft((d) => {
      const has = d.priorities.includes(id);
      const priorities = has
        ? d.priorities.filter((p) => p !== id)
        : [...d.priorities, id].slice(0, 4);
      return { ...d, priorities };
    });
  };

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
          <Text style={styles.kicker}>Step 1</Text>
          <Text style={styles.title}>Your Travel DNA</Text>
          <Text style={styles.sub}>
            The Kairos engine needs your rhythm — not another preference quiz for
            hotels.
          </Text>
        </View>

        <Section label="Chronotype">
          <ChipRow
            options={[
              { id: 'lark', label: 'Lark' },
              { id: 'neutral', label: 'Neutral' },
              { id: 'owl', label: 'Owl' },
            ]}
            value={draft.chronotype}
            onChange={(chronotype) =>
              setDraft((d) => ({ ...d, chronotype: chronotype as Chronotype }))
            }
          />
        </Section>

        <Section label="Pace">
          <ChipRow
            options={[
              { id: 'slow', label: 'Slow' },
              { id: 'balanced', label: 'Balanced' },
              { id: 'intense', label: 'Intense' },
            ]}
            value={draft.pace}
            onChange={(pace) => setDraft((d) => ({ ...d, pace: pace as Pace }))}
          />
        </Section>

        <Section label="Crowds">
          <ChipRow
            options={[
              { id: 'avoid', label: 'Avoid' },
              { id: 'ok', label: 'OK' },
              { id: 'seek', label: 'Seek energy' },
            ]}
            value={draft.crowdTolerance}
            onChange={(crowdTolerance) =>
              setDraft((d) => ({
                ...d,
                crowdTolerance: crowdTolerance as CrowdTolerance,
              }))
            }
          />
        </Section>

        <Section label="What you’d regret missing">
          <View style={styles.priorityGrid}>
            {PRIORITIES.map((p) => {
              const on = draft.priorities.includes(p.id);
              return (
                <Pressable
                  key={p.id}
                  onPress={() => togglePriority(p.id)}
                  style={[styles.priority, on && styles.priorityOn]}
                >
                  <Text style={[styles.priorityText, on && styles.priorityTextOn]}>
                    {p.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        <Section label={`Daily walking comfort · ${draft.walkingKmPerDay} km`}>
          <View style={styles.sliderRow}>
            {[5, 8, 12, 16].map((km) => (
              <Pressable
                key={km}
                onPress={() => setDraft((d) => ({ ...d, walkingKmPerDay: km }))}
                style={[
                  styles.kmChip,
                  draft.walkingKmPerDay === km && styles.kmChipOn,
                ]}
              >
                <Text
                  style={[
                    styles.kmText,
                    draft.walkingKmPerDay === km && styles.kmTextOn,
                  ]}
                >
                  {km}
                </Text>
              </Pressable>
            ))}
          </View>
        </Section>

        <Section
          label={`Decision fatigue · ${Math.round(draft.decisionFatigueSensitivity * 100)}%`}
        >
          <View style={styles.sliderRow}>
            {[0.25, 0.5, 0.75, 1].map((v) => (
              <Pressable
                key={v}
                onPress={() =>
                  setDraft((d) => ({ ...d, decisionFatigueSensitivity: v }))
                }
                style={[
                  styles.kmChip,
                  draft.decisionFatigueSensitivity === v && styles.kmChipOn,
                ]}
              >
                <Text
                  style={[
                    styles.kmText,
                    draft.decisionFatigueSensitivity === v && styles.kmTextOn,
                  ]}
                >
                  {v === 0.25 ? 'Low' : v === 0.5 ? 'Med' : v === 0.75 ? 'High' : 'Max'}
                </Text>
              </Pressable>
            ))}
          </View>
        </Section>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + spacing.md },
        ]}
      >
        <Button
          label="Continue to trip"
          disabled={draft.priorities.length === 0}
          onPress={() => {
            setDna(draft);
            router.push('/trip/create');
          }}
        />
      </View>
    </View>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={styles.section}>{label}</Text>
      {children}
    </View>
  );
}

function ChipRow({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable
            key={o.id}
            onPress={() => onChange(o.id)}
            style={[styles.chip, on && styles.chipOn]}
          >
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.mist,
  },
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
    fontSize: 36,
    color: colors.ink,
    letterSpacing: -0.8,
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.muted,
    marginTop: spacing.sm,
  },
  section: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.deep,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(11,61,74,0.2)',
    backgroundColor: '#fff',
  },
  chipOn: {
    backgroundColor: colors.deep,
    borderColor: colors.deep,
  },
  chipText: {
    fontFamily: fonts.bodyMedium,
    color: colors.deep,
    fontSize: 15,
  },
  chipTextOn: {
    color: colors.mist,
  },
  priorityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  priority: {
    width: '47%',
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(11,61,74,0.15)',
  },
  priorityOn: {
    backgroundColor: colors.sand,
    borderColor: colors.clay,
  },
  priorityText: {
    fontFamily: fonts.bodyMedium,
    color: colors.deep,
    fontSize: 15,
  },
  priorityTextOn: {
    color: colors.ink,
  },
  sliderRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  kmChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(11,61,74,0.15)',
  },
  kmChipOn: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  kmText: {
    fontFamily: fonts.bodyMedium,
    color: colors.deep,
  },
  kmTextOn: {
    color: colors.mist,
  },
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
