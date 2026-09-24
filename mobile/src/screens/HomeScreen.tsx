import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pedometer } from 'expo-sensors';
import Feather from '@expo/vector-icons/Feather';
import { CircularProgress } from '../components/CircularProgress';
import { LineChart } from '../components/LineChart';
import { MuscleBalanceCard } from '../components/MuscleBalanceCard';
import { useStore } from '../store/useStore';

export function HomeScreen() {
  const [steps, setSteps] = useState(0);
  const profile = useStore((state) => state.profile);
  const todayWater = useStore((state) => state.todayWater);
  const todayMinutes = useStore((state) => state.todayWorkoutMinutes);
  const todayBurnedKcal = useStore((state) => state.todayBurnedKcal);
  const loadInitialData = useStore((state) => state.loadInitialData);

  useEffect(() => {
    loadInitialData();

    const fetchSteps = async () => {
      try {
        const isAvailable = await Pedometer.isAvailableAsync();
        if (isAvailable) {
          const end = new Date();
          const start = new Date();
          start.setHours(0, 0, 0, 0);
          const result = await Pedometer.getStepCountAsync(start, end);
          if (result && result.steps) {
            setSteps(result.steps);
          }
        }
      } catch (err) {
        console.warn('Eroare la citirea pasilor:', err);
      }
    };

    fetchSteps();
  }, [loadInitialData]);

  const stepGoal = profile.step_goal || 10000;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>👤</Text>
          </View>
          <View>
            <Text style={styles.title}>Salut, {profile.name}!</Text>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>AI STATUS: ACTIVE</Text>
            </View>
          </View>
        </View>

        {/* Main Card Obiectiv Pasi */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>⚡ Obiectivul tău de pași</Text>

          <View style={styles.progressContainer}>
            <CircularProgress
              value={steps}
              max={stepGoal}
              radius={75}
              strokeWidth={14}
              color="#10B981"
            />
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>KCAL ARSE</Text>
              <Text style={styles.statValue}>{todayBurnedKcal}</Text>
            </View>
            <View style={[styles.statBox, { alignItems: 'flex-end' }]}>
              <Text style={styles.statLabel}>MINUTE ACTIVE</Text>
              <Text style={styles.statValue}>{todayMinutes}</Text>
            </View>
          </View>
        </View>

        {/* Sub-carduri rapide: Hidratare & Stare */}
        <View style={styles.subGrid}>
          <View style={[styles.miniCard, { borderLeftColor: '#06B6D4' }]}>
            <View style={styles.miniHeader}>
              <Feather name="droplet" size={16} color="#06B6D4" />
              <Text style={styles.miniTitle}>Hidratare</Text>
            </View>
            <Text style={styles.miniVal}>{todayWater} ml</Text>
            <Text style={styles.miniSub}>Țintă: {profile.water_goal} ml</Text>
          </View>

          <View style={[styles.miniCard, { borderLeftColor: '#10B981' }]}>
            <View style={styles.miniHeader}>
              <Feather name="shield" size={16} color="#10B981" />
              <Text style={styles.miniTitle}>Recuperare</Text>
            </View>
            <Text style={styles.miniVal}>Optimă</Text>
            <Text style={styles.miniSub}>Gata de efort</Text>
          </View>
        </View>

        {/* Card Evolutie Activitate (7 zile) */}
        <View style={[styles.card, { marginTop: 16 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Feather name="activity" size={18} color="#06B6D4" />
              <Text style={[styles.cardTitle, { color: '#06B6D4', marginBottom: 0, textAlign: 'left' }]}>
                Evoluție Ardere Calorii
              </Text>
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '700' }}>7 ZILE</Text>
          </View>

          <LineChart
            data={[
              { label: 'Lun', value: 340 },
              { label: 'Mar', value: 480 },
              { label: 'Mie', value: 290 },
              { label: 'Joi', value: 520 },
              { label: 'Vin', value: 410 },
              { label: 'Sâm', value: 380 },
              { label: 'Azi', value: todayBurnedKcal > 0 ? todayBurnedKcal : 450 },
            ]}
            height={120}
            color="#06B6D4"
            unit=" kcal"
          />
        </View>

        {/* Card Balanta Musculara Saptamanala (10-20 serii) */}
        <MuscleBalanceCard />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scroll: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 25,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  avatarText: {
    fontSize: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  statusText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  cardTitle: {
    color: '#F97316',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 15,
  },
  statBox: {
    flex: 1,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    marginBottom: 4,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  statValue: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  subGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  miniCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
  },
  miniHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  miniTitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
  },
  miniVal: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  miniSub: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    marginTop: 4,
  },
});
