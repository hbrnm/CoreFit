import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';
import { CircularProgress } from '../components/CircularProgress';
import { useStore } from '../store/useStore';

export function WorkoutsScreen() {
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [isActive, setIsActive] = useState(false);
  const logWorkoutSession = useStore((state) => state.logWorkoutSession);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isActive && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            setIsActive(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            return 0;
          }
          if (prev % 10 === 0) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isActive, secondsLeft]);

  const toggleTimer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (secondsLeft === 0) {
      setSecondsLeft(60);
    }
    setIsActive(!isActive);
  };

  const handleQuickLog = (name: string, minutes: number, kcal: number) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    logWorkoutSession(name, minutes * 60, kcal);
    Alert.alert('Antrenament Înregistrat! 🏆', `${name} (${minutes} min, ${kcal} kcal) a fost salvat în baza de date locală.`);
  };

  const formatTime = (timeInSeconds: number) => {
    const m = Math.floor(timeInSeconds / 60).toString().padStart(2, '0');
    const s = (timeInSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Antrenament Activ</Text>

        {/* Card Timer Odihna */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>⏱️ Cronometru Odihnă</Text>

          <View style={styles.timerContainer}>
            <CircularProgress
              value={60 - secondsLeft}
              max={60}
              radius={85}
              strokeWidth={14}
              color="#06B6D4"
              hideText={true}
            />
            <View style={styles.timeOverlay}>
              <Text style={styles.timeText}>{formatTime(secondsLeft)}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, isActive ? styles.buttonStop : styles.buttonStart]}
            onPress={toggleTimer}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              {isActive ? 'PAUZĂ' : secondsLeft === 0 ? 'RESTART' : 'START ODIHNĂ'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick Log Antrenament Finalizat */}
        <View style={styles.card}>
          <Text style={[styles.cardTitle, { color: '#10B981' }]}>⚡ Înregistrare Rapidă</Text>
          <Text style={styles.cardSub}>
            Ai terminat o sesiune? Înregistreaz-o direct în baza de date locală SQLite.
          </Text>

          <TouchableOpacity
            style={styles.logBtn}
            onPress={() => handleQuickLog('Push Workout (Piept/Triceps)', 45, 320)}
            activeOpacity={0.8}
          >
            <Feather name="check-circle" size={20} color="#0F172A" />
            <Text style={styles.logBtnText}>+ Înregistrează Sesiune (45m / 320 kcal)</Text>
          </TouchableOpacity>
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
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  cardTitle: {
    color: '#06B6D4',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  cardSub: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  timerContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  timeOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    color: '#FFF',
    fontSize: 38,
    fontWeight: 'bold',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 24,
  },
  buttonStart: {
    backgroundColor: '#06B6D4',
  },
  buttonStop: {
    backgroundColor: '#EF4444',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  logBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
    width: '100%',
  },
  logBtnText: {
    color: '#0F172A',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
