import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';

interface PlateCalculatorModalProps {
  visible: boolean;
  onClose: () => void;
  initialWeight?: number;
}

interface PlateConfig {
  weight: number;
  color: string;
  count: number;
}

const STANDARD_PLATES = [
  { weight: 25, color: '#EF4444' }, // Roșu
  { weight: 20, color: '#3B82F6' }, // Albastru
  { weight: 15, color: '#EAB308' }, // Galben
  { weight: 10, color: '#10B981' }, // Verde
  { weight: 5, color: '#F8FAFC' },  // Alb
  { weight: 2.5, color: '#64748B' }, // Slate
  { weight: 1.25, color: '#94A3B8' }, // Gri
];

export function PlateCalculatorModal({ visible, onClose, initialWeight = 100 }: PlateCalculatorModalProps) {
  const [targetWeightInput, setTargetWeightInput] = useState(initialWeight.toString());
  const [barWeight, setBarWeight] = useState(20); // 20kg bara olimpica standard

  const targetWeight = parseFloat(targetWeightInput) || 0;
  const weightPerSide = Math.max(0, (targetWeight - barWeight) / 2);

  // Calculeaza discurile necesare pe fiecare parte
  const calculatePlates = (): PlateConfig[] => {
    let remaining = weightPerSide;
    const result: PlateConfig[] = [];

    STANDARD_PLATES.forEach((plate) => {
      if (remaining >= plate.weight) {
        const count = Math.floor(remaining / plate.weight);
        result.push({
          weight: plate.weight,
          color: plate.color,
          count: count,
        });
        remaining = Math.round((remaining - count * plate.weight) * 100) / 100;
      }
    });

    return result;
  };

  const platesPerSide = calculatePlates();

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Feather name="disc" size={22} color="#10B981" />
              <Text style={styles.title}>Calculator Discuri (Barbell)</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Input Greutate Țintă */}
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>GREUTATE TOTALĂ DORITĂ (KG)</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.weightInput}
                  value={targetWeightInput}
                  keyboardType="numeric"
                  onChangeText={(val) => setTargetWeightInput(val)}
                />
                <Text style={styles.unitText}>kg</Text>
              </View>

              {/* Selector Bară */}
              <View style={styles.barSelectorRow}>
                <Text style={styles.barLabel}>Greutate Bară:</Text>
                <TouchableOpacity
                  style={[styles.barBtn, barWeight === 20 && styles.barBtnActive]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setBarWeight(20);
                  }}
                >
                  <Text style={[styles.barBtnText, barWeight === 20 && styles.barBtnTextActive]}>20 kg (Băieți/Olimpică)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.barBtn, barWeight === 15 && styles.barBtnActive]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setBarWeight(15);
                  }}
                >
                  <Text style={[styles.barBtnText, barWeight === 15 && styles.barBtnTextActive]}>15 kg (Fete/Tehnică)</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Rezultat pe fiecare parte */}
            <View style={styles.resultCard}>
              <Text style={styles.resultSub}>FIECARE PARTE NECESITĂ:</Text>
              <Text style={styles.resultWeight}>{weightPerSide} kg</Text>

              {/* Vizualizare Discuri */}
              <View style={styles.platesVisual}>
                {/* Barba reprezentata ca bara verticala/orizontala */}
                <View style={styles.barGraphic} />
                
                {platesPerSide.length > 0 ? (
                  platesPerSide.map((p, idx) => (
                    <View key={idx} style={styles.plateGroup}>
                      {Array.from({ length: p.count }).map((_, cIdx) => (
                        <View
                          key={cIdx}
                          style={[
                            styles.plateChip,
                            { backgroundColor: p.color, height: 40 + p.weight * 2 },
                          ]}
                        >
                          <Text style={[styles.plateChipText, p.weight === 5 && { color: '#0F172A' }]}>
                            {p.weight}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyPlatesText}>Încarcă doar bara liberă</Text>
                )}
              </View>

              {/* Tabel Sumar Discuri */}
              <View style={styles.breakdownTable}>
                {platesPerSide.map((p, idx) => (
                  <View key={idx} style={styles.breakdownRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={[styles.colorDot, { backgroundColor: p.color }]} />
                      <Text style={styles.breakdownText}>Disc {p.weight} kg</Text>
                    </View>
                    <Text style={styles.breakdownCount}>
                      {p.count}x / parte <Text style={{ color: 'rgba(255,255,255,0.4)' }}>({p.count * 2} în total)</Text>
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  inputCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  inputLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  weightInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#10B981',
    fontSize: 26,
    fontWeight: 'bold',
  },
  unitText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  barSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  barLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    width: '100%',
    marginBottom: 4,
  },
  barBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  barBtnActive: {
    backgroundColor: '#10B981',
  },
  barBtnText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '600',
  },
  barBtnTextActive: {
    color: '#0F172A',
    fontWeight: 'bold',
  },
  resultCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 18,
    marginBottom: 30,
    alignItems: 'center',
  },
  resultSub: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  resultWeight: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  platesVisual: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 110,
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    paddingHorizontal: 16,
    gap: 6,
    marginBottom: 20,
  },
  barGraphic: {
    width: 14,
    height: 35,
    backgroundColor: '#94A3B8',
    borderRadius: 3,
  },
  plateGroup: {
    flexDirection: 'row',
    gap: 4,
  },
  plateChip: {
    width: 22,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  plateChipText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
    transform: [{ rotate: '-90deg' }],
  },
  emptyPlatesText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
  },
  breakdownTable: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 12,
    gap: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  breakdownText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  breakdownCount: {
    color: '#10B981',
    fontWeight: 'bold',
    fontSize: 13,
  },
});
