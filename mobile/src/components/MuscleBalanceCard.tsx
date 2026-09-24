import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

interface MuscleVolume {
  name: string;
  currentSets: number;
  targetSets: number;
  color: string;
}

interface MuscleBalanceCardProps {
  // Optionale daca vrem sa transmitem date agregate
  customVolumes?: MuscleVolume[];
}

const DEFAULT_MUSCLES: MuscleVolume[] = [
  { name: 'Piept (Chest)', currentSets: 12, targetSets: 16, color: '#10B981' },
  { name: 'Spate (Back)', currentSets: 14, targetSets: 16, color: '#10B981' },
  { name: 'Picioare (Quads/Hamstrings)', currentSets: 10, targetSets: 16, color: '#06B6D4' },
  { name: 'Umeri (Deltoids)', currentSets: 8, targetSets: 12, color: '#06B6D4' },
  { name: 'Brațe (Biceps/Triceps)', currentSets: 10, targetSets: 14, color: '#10B981' },
  { name: 'Abdomen & Core', currentSets: 6, targetSets: 8, color: '#F97316' },
];

export function MuscleBalanceCard({ customVolumes }: MuscleBalanceCardProps) {
  const list = customVolumes && customVolumes.length > 0 ? customVolumes : DEFAULT_MUSCLES;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Feather name="pie-chart" size={18} color="#10B981" />
          <Text style={styles.title}>Balanță Musculară (Săptămâna Asta)</Text>
        </View>
        <Text style={styles.badge}>OPTIM 10-20 SERII</Text>
      </View>

      <Text style={styles.subText}>
        Volumul efectiv de serii (RIR 1-2) per grupă musculară pentru stimulare optimă:
      </Text>

      <View style={styles.listContainer}>
        {list.map((m, idx) => {
          const ratio = Math.min(1, m.currentSets / (m.targetSets || 1));
          const pct = Math.round(ratio * 100);

          return (
            <View key={idx} style={styles.row}>
              <View style={styles.labelRow}>
                <Text style={styles.muscleName}>{m.name}</Text>
                <Text style={styles.setsText}>
                  <Text style={{ color: m.color, fontWeight: 'bold' }}>{m.currentSets}</Text> / {m.targetSets} serii ({pct}%)
                </Text>
              </View>

              <View style={styles.barBg}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${pct}%`,
                      backgroundColor: m.color,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginVertical: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  badge: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 16,
  },
  listContainer: {
    gap: 12,
  },
  row: {
    gap: 4,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  muscleName: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600',
  },
  setsText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
  barBg: {
    height: 7,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
});
