import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';
import { useStore } from '../store/useStore';
import { CircularProgress } from '../components/CircularProgress';

export function NutritionScreen() {
  const todayWater = useStore((state) => state.todayWater);
  const waterGoal = useStore((state) => state.profile.water_goal);
  const calorieGoal = useStore((state) => state.profile.calorie_goal);
  const addWater = useStore((state) => state.addWater);

  const handleAddWater = (amount: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addWater(amount);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Nutriție & Hidratare</Text>

        {/* Card Hidratare */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Feather name="droplet" size={20} color="#06B6D4" />
            <Text style={styles.cardTitle}>Hidratare Zilnică</Text>
          </View>

          <View style={styles.centerProgress}>
            <CircularProgress
              value={todayWater}
              max={waterGoal}
              radius={70}
              strokeWidth={14}
              color="#06B6D4"
              backgroundColor="rgba(6, 182, 212, 0.15)"
              hideText={true}
            />
            <View style={styles.progressCenter}>
              <Text style={styles.progressValue}>{todayWater}</Text>
              <Text style={styles.progressSub}>/ {waterGoal} ml</Text>
            </View>
          </View>

          {/* Quick Add Buttons */}
          <View style={styles.quickAddRow}>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => handleAddWater(250)}
              activeOpacity={0.8}
            >
              <Feather name="plus" size={16} color="#06B6D4" />
              <Text style={styles.quickBtnText}>+250 ml</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => handleAddWater(500)}
              activeOpacity={0.8}
            >
              <Feather name="plus" size={16} color="#06B6D4" />
              <Text style={styles.quickBtnText}>+500 ml</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Card Calorii Țintă */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Feather name="pie-chart" size={20} color="#10B981" />
            <Text style={[styles.cardTitle, { color: '#10B981' }]}>Țintă Calorică</Text>
          </View>

          <View style={styles.calRow}>
            <Text style={styles.calNumber}>{calorieGoal} kcal</Text>
            <Text style={styles.calDesc}>Recomandare zilnică pentru menținere & performanță</Text>
          </View>
        </View>
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
  title: {
    color: '#F8FAFC',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 25,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  cardTitle: {
    color: '#06B6D4',
    fontSize: 16,
    fontWeight: 'bold',
  },
  centerProgress: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  progressCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  progressValue: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  progressSub: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  quickAddRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 5,
  },
  quickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
  },
  quickBtnText: {
    color: '#06B6D4',
    fontWeight: '700',
    fontSize: 14,
  },
  calRow: {
    marginTop: 5,
  },
  calNumber: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  calDesc: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
  },
});
