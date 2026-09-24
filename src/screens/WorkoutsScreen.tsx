import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';
import { useStore } from '../store/useStore';
import routinesLibrary from '../data/defaultRoutines.json';

interface SetLog {
  setNumber: number;
  weight: string;
  reps: string;
  completed: boolean;
}

export function WorkoutsScreen() {
  const [selectedRoutineIndex, setSelectedRoutineIndex] = useState(0);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  // Sesiune activa
  const [activeSessionDay, setActiveSessionDay] = useState<number | null>(null);
  const [exerciseSets, setExerciseSets] = useState<{ [key: number]: SetLog[] }>({});

  // Timer odihna
  const [secondsLeft, setSecondsLeft] = useState(90);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const logWorkoutSession = useStore((state) => state.logWorkoutSession);
  
  const currentRoutine = routinesLibrary[selectedRoutineIndex] || routinesLibrary[0];
  const currentDay = currentRoutine.days[selectedDayIndex] || currentRoutine.days[0];

  // Reset day index daca rutina selectata are mai putine zile
  useEffect(() => {
    setSelectedDayIndex(0);
  }, [selectedRoutineIndex]);

  // Timer interval
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
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
  }, [isTimerRunning, secondsLeft]);

  // Initializare sesiune
  const handleStartSession = (dayIdx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const day = currentRoutine.days[dayIdx];
    const initialSets: { [key: number]: SetLog[] } = {};

    day.exercises.forEach((ex, exIdx) => {
      initialSets[exIdx] = Array.from({ length: ex.sets }, (_, i) => ({
        setNumber: i + 1,
        weight: '60',
        reps: ex.reps_range.split('-')[0] || '8',
        completed: false,
      }));
    });

    setExerciseSets(initialSets);
    setActiveSessionDay(dayIdx);
  };

  // Bifare set
  const toggleSetComplete = (exIdx: number, setIdx: number, restSeconds: number) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setExerciseSets((prev) => {
      const sets = [...(prev[exIdx] || [])];
      const isNowCompleted = !sets[setIdx].completed;
      sets[setIdx] = { ...sets[setIdx], completed: isNowCompleted };

      if (isNowCompleted) {
        setSecondsLeft(restSeconds);
        setIsTimerRunning(true);
      }

      return { ...prev, [exIdx]: sets };
    });
  };

  // Finalizare antrenament
  const handleFinishWorkout = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const day = currentRoutine.days[activeSessionDay!];
    
    let completedSetsCount = 0;
    Object.values(exerciseSets).forEach((sets) => {
      sets.forEach((s) => {
        if (s.completed) completedSetsCount++;
      });
    });

    const estimatedKcal = Math.round(completedSetsCount * 22);
    const durationMinutes = Math.max(25, completedSetsCount * 3);

    logWorkoutSession(`${currentRoutine.routine_name} - ${day.day_title}`, durationMinutes * 60, estimatedKcal);

    Alert.alert(
      'Antrenament Finalizat! 🏆',
      `Ai completat ${completedSetsCount} serii din ${day.day_title}.\nEstimare: ~${estimatedKcal} kcal arse salvate în SQLite!`
    );

    setActiveSessionDay(null);
    setIsTimerRunning(false);
  };

  const formatTime = (timeInSeconds: number) => {
    const m = Math.floor(timeInSeconds / 60).toString().padStart(2, '0');
    const s = (timeInSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header cu Buton Schimba Programul */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.badge}>{currentRoutine.level.toUpperCase()}</Text>
            <Text style={styles.mainTitle}>{currentRoutine.routine_name}</Text>
          </View>
          
          <TouchableOpacity
            style={styles.changeRoutineBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setIsGalleryOpen(true);
            }}
            activeOpacity={0.8}
          >
            <Feather name="layers" size={16} color="#10B981" />
            <Text style={styles.changeRoutineText}>Galerie</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.subDesc}>{currentRoutine.description}</Text>

        {/* Floating Timer daca e activ */}
        {isTimerRunning && (
          <View style={styles.timerBanner}>
            <View style={styles.timerLeft}>
              <Feather name="clock" size={20} color="#06B6D4" />
              <Text style={styles.timerBannerText}>Odihnă: {formatTime(secondsLeft)}</Text>
            </View>
            <TouchableOpacity 
              onPress={() => setIsTimerRunning(false)}
              style={styles.skipBtn}
            >
              <Text style={styles.skipBtnText}>Oprește</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Selectie Zi (daca nu e in sesiune activa) */}
        {activeSessionDay === null ? (
          <>
            <View style={styles.tabsRow}>
              {currentRoutine.days.map((day, idx) => (
                <TouchableOpacity
                  key={day.day_number}
                  style={[styles.dayTab, selectedDayIndex === idx && styles.dayTabActive]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedDayIndex(idx);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dayTabText, selectedDayIndex === idx && styles.dayTabTextActive]}>
                    Ziua {day.day_number}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Detalii Zi Curenta */}
            <View style={styles.dayCard}>
              <View style={styles.dayCardHeader}>
                <Text style={styles.dayTitle}>{currentDay.day_title}</Text>
                <Text style={styles.exerciseCount}>{currentDay.exercises.length} Exerciții</Text>
              </View>

              {/* Lista Exercitii */}
              {currentDay.exercises.map((ex, exIdx) => (
                <View key={exIdx} style={styles.exerciseItem}>
                  <View style={styles.exHeader}>
                    <Text style={styles.exNumber}>#{exIdx + 1}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.exName}>{ex.exercise_name}</Text>
                      <Text style={styles.exMuscles}>
                        🎯 {ex.target_muscle} {ex.secondary_muscles && ex.secondary_muscles.length > 0 ? `• ${ex.secondary_muscles.join(', ')}` : ''}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.exMetaRow}>
                    <View style={styles.pill}><Text style={styles.pillText}>{ex.sets} serii x {ex.reps_range} rep</Text></View>
                    <View style={[styles.pill, { backgroundColor: 'rgba(249,115,22,0.15)' }]}><Text style={[styles.pillText, { color: '#F97316' }]}>RIR {ex.rir}</Text></View>
                    <View style={[styles.pill, { backgroundColor: 'rgba(6,182,212,0.15)' }]}><Text style={[styles.pillText, { color: '#06B6D4' }]}>{ex.rest_seconds}s pauză</Text></View>
                  </View>

                  <Text style={styles.exNotes}>💡 {ex.notes}</Text>
                </View>
              ))}

              <TouchableOpacity
                style={styles.startBtn}
                onPress={() => handleStartSession(selectedDayIndex)}
                activeOpacity={0.8}
              >
                <Feather name="play" size={20} color="#0F172A" />
                <Text style={styles.startBtnText}>START SESIUNEA CURENTĂ</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          /* MOD SESIUNE ACTIVĂ */
          <View style={styles.activeSessionContainer}>
            <View style={styles.activeHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.activeBadge}>SESIUNE ACTIVĂ</Text>
                <Text style={styles.activeTitle}>{currentRoutine.days[activeSessionDay].day_title}</Text>
              </View>
              <TouchableOpacity 
                style={styles.finishBtn} 
                onPress={handleFinishWorkout}
                activeOpacity={0.8}
              >
                <Text style={styles.finishBtnText}>Încheie</Text>
              </TouchableOpacity>
            </View>

            {currentRoutine.days[activeSessionDay].exercises.map((ex, exIdx) => (
              <View key={exIdx} style={styles.activeExCard}>
                <Text style={styles.activeExName}>#{exIdx + 1} {ex.exercise_name}</Text>
                <Text style={styles.activeExNotes}>🎯 {ex.target_muscle} • Odihnă: {ex.rest_seconds}s</Text>

                <View style={styles.setTable}>
                  <View style={styles.setRowHeader}>
                    <Text style={[styles.setHeaderText, { width: 45 }]}>SET</Text>
                    <Text style={[styles.setHeaderText, { flex: 1 }]}>KG</Text>
                    <Text style={[styles.setHeaderText, { flex: 1 }]}>REPETĂRI</Text>
                    <Text style={[styles.setHeaderText, { width: 50, textAlign: 'center' }]}>STATUS</Text>
                  </View>

                  {(exerciseSets[exIdx] || []).map((s, setIdx) => (
                    <View key={setIdx} style={[styles.setRow, s.completed && styles.setRowCompleted]}>
                      <Text style={[styles.setCellText, { width: 45, fontWeight: 'bold' }]}>#{s.setNumber}</Text>
                      
                      <TextInput
                        style={styles.setInput}
                        value={s.weight}
                        keyboardType="numeric"
                        onChangeText={(txt) => {
                          const updated = [...exerciseSets[exIdx]];
                          updated[setIdx].weight = txt;
                          setExerciseSets({ ...exerciseSets, [exIdx]: updated });
                        }}
                      />

                      <TextInput
                        style={styles.setInput}
                        value={s.reps}
                        keyboardType="numeric"
                        onChangeText={(txt) => {
                          const updated = [...exerciseSets[exIdx]];
                          updated[setIdx].reps = txt;
                          setExerciseSets({ ...exerciseSets, [exIdx]: updated });
                        }}
                      />

                      <TouchableOpacity
                        style={[styles.checkBtn, s.completed && styles.checkBtnDone]}
                        onPress={() => toggleSetComplete(exIdx, setIdx, ex.rest_seconds)}
                      >
                        <Feather name={s.completed ? "check" : "circle"} size={18} color={s.completed ? "#0F172A" : "rgba(255,255,255,0.4)"} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            ))}

            <TouchableOpacity 
              style={styles.bottomFinishBtn}
              onPress={handleFinishWorkout}
              activeOpacity={0.8}
            >
              <Feather name="check-circle" size={22} color="#0F172A" />
              <Text style={styles.bottomFinishText}>FINALIZEAZĂ ANTRENAMENTUL</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Modal Galerie de Programe */}
      <Modal
        visible={isGalleryOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsGalleryOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Galerie Programe</Text>
              <TouchableOpacity onPress={() => setIsGalleryOpen(false)}>
                <Feather name="x" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {routinesLibrary.map((prog, pIdx) => {
                const isSelected = selectedRoutineIndex === pIdx;
                return (
                  <TouchableOpacity
                    key={prog.id}
                    style={[styles.galleryCard, isSelected && styles.galleryCardActive]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setSelectedRoutineIndex(pIdx);
                      setIsGalleryOpen(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.galleryCardTop}>
                      <Text style={styles.galleryGoal}>{prog.goal.toUpperCase()}</Text>
                      <View style={styles.daysBadge}>
                        <Text style={styles.daysBadgeText}>{prog.frequency_days_per_week} Zile / săpt</Text>
                      </View>
                    </View>

                    <Text style={styles.galleryName}>{prog.routine_name}</Text>
                    <Text style={styles.galleryDesc}>{prog.description}</Text>

                    <View style={styles.galleryFooter}>
                      <Text style={styles.galleryLevel}>Nivel: {prog.level}</Text>
                      {isSelected ? (
                        <View style={styles.activeTag}>
                          <Feather name="check" size={14} color="#10B981" />
                          <Text style={styles.activeTagText}>Selectat</Text>
                        </View>
                      ) : (
                        <Text style={styles.selectText}>Alege Programul →</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  badge: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  mainTitle: {
    color: '#FFF',
    fontSize: 21,
    fontWeight: 'bold',
  },
  changeRoutineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  changeRoutineText: {
    color: '#10B981',
    fontWeight: '700',
    fontSize: 13,
  },
  subDesc: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 18,
  },
  timerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderWidth: 1,
    borderColor: '#06B6D4',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  timerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timerBannerText: {
    color: '#06B6D4',
    fontWeight: 'bold',
    fontSize: 16,
  },
  skipBtn: {
    backgroundColor: '#06B6D4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  skipBtnText: {
    color: '#0F172A',
    fontWeight: 'bold',
    fontSize: 12,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  dayTab: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#1E293B',
    borderRadius: 10,
    alignItems: 'center',
  },
  dayTabActive: {
    backgroundColor: '#10B981',
  },
  dayTabText: {
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '700',
    fontSize: 13,
  },
  dayTabTextActive: {
    color: '#0F172A',
  },
  dayCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
  },
  dayCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  dayTitle: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: 'bold',
    flex: 1,
  },
  exerciseCount: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
  },
  exerciseItem: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  exHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  exNumber: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 2,
  },
  exName: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  exMuscles: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  exMetaRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  pill: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pillText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },
  exNotes: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    lineHeight: 15,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 10,
    gap: 8,
  },
  startBtnText: {
    color: '#0F172A',
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  activeSessionContainer: {
    gap: 16,
  },
  activeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 14,
  },
  activeBadge: {
    color: '#F97316',
    fontSize: 11,
    fontWeight: '800',
  },
  activeTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
  },
  finishBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  finishBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  activeExCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
  },
  activeExName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  activeExNotes: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginBottom: 12,
    marginTop: 2,
  },
  setTable: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 10,
    padding: 8,
  },
  setRowHeader: {
    flexDirection: 'row',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    marginBottom: 6,
  },
  setHeaderText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '700',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 8,
  },
  setRowCompleted: {
    opacity: 0.7,
  },
  setCellText: {
    color: '#FFF',
    fontSize: 13,
  },
  setInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
  checkBtn: {
    width: 50,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBtnDone: {
    backgroundColor: '#10B981',
  },
  bottomFinishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 10,
    gap: 8,
  },
  bottomFinishText: {
    color: '#0F172A',
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  galleryCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  galleryCardActive: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  galleryCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  galleryGoal: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  daysBadge: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  daysBadgeText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '600',
  },
  galleryName: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  galleryDesc: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  galleryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 10,
  },
  galleryLevel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
  activeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activeTagText: {
    color: '#10B981',
    fontWeight: '700',
    fontSize: 13,
  },
  selectText: {
    color: '#06B6D4',
    fontWeight: '700',
    fontSize: 13,
  },
});
