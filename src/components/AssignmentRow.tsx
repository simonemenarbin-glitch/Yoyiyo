import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing } from '@/lib/theme';
import type { Assignment } from '@/lib/types';

export function AssignmentRow({ assignment }: { assignment: Assignment }) {
  const { experience: exp, slot, score } = assignment;
  const start = formatHour(slot.startHour);
  const end = formatHour(slot.endHour);
  const driftPct = Math.round(score.driftRisk * 100);

  return (
    <View style={styles.row}>
      <View style={styles.timeCol}>
        <Text style={styles.time}>{start}</Text>
        <Text style={styles.timeEnd}>{end}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.name}>{exp.name}</Text>
        <Text style={styles.desc}>{exp.description}</Text>
        <View style={styles.meta}>
          <Text style={[styles.badge, score.total >= 70 ? styles.good : styles.mid]}>
            Kairos {score.total}
          </Text>
          {driftPct >= 45 ? (
            <Text style={[styles.badge, styles.warn]}>Drift {driftPct}%</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function formatHour(h: number): string {
  const hour = Math.floor(h);
  const min = Math.round((h - hour) * 60);
  return `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(11,61,74,0.12)',
  },
  timeCol: {
    width: 52,
  },
  time: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.deep,
  },
  timeEnd: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  body: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.ink,
  },
  desc: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
  },
  meta: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  badge: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: 'hidden',
    borderRadius: 2,
  },
  good: {
    backgroundColor: 'rgba(47,138,106,0.15)',
    color: colors.good,
  },
  mid: {
    backgroundColor: 'rgba(26,107,122,0.12)',
    color: colors.teal,
  },
  warn: {
    backgroundColor: 'rgba(184,74,58,0.12)',
    color: colors.danger,
  },
});
