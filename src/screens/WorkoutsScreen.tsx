import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, Modal } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';
import { useStore } from '../store/useStore';
import { calculate1RM } from '../lib/db';
import routinesLibrary from '../data/defaultRoutines.json';
import { PlateCalculatorModal } from '../components/PlateCalculatorModal';
import { ExercisePickerModal, ExerciseItem } from '../components/ExercisePickerModal';
import { ExerciseDetailModal } from '../components/ExerciseDetailModal';
import { getExerciseIllustration } from '../lib/exerciseHelper';
import { VoiceCues, setVoiceCoachEnabled, getVoiceCoachEnabled } from '../lib/voiceCoach';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

type SetType = 'N' | 'W' | 'D' | 'F';

interface SetLog {
  setNumber: number;
  type: SetType; // N = Normal, W = Warmup, D = Dropset, F = Failure
  weight: string;
  reps: string;
  completed: boolean;
}

interface ActiveExercise {
  exercise_name: string;
  target_muscle: string;
  secondary_muscles?: string[];
  sets: number;
  reps_range: string;
  rir?: string | number;
  rest_seconds: number;
  notes?: string;
  equipment?: string;
}

export function WorkoutsScreen() {
  const [selectedRoutineIndex, setSelectedRoutineIndex] = useState(0);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  // Modale OpenGym
  const [isPlateCalcOpen, setIsPlateCalcOpen] = useState(false);
  const [plateCalcWeight, setPlateCalcWeight] = useState(100);
  const [isExercisePickerOpen, setIsExercisePickerOpen] = useState(false);

  // Modal Ilustrație & Detaliu Exercițiu
  const [detailModalState, setDetailModalState] = useState<{
    visible: boolean;
    exercise: ExerciseItem | null;
    images: string[];
    name: string;
    source?: any;
  }>({
    visible: false,
    exercise: null,
    images: [],
    name: '',
    source: null,
  });

  const handleOpenExerciseDetail = (name: string, category?: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = getExerciseIllustration(name, category);
    setDetailModalState({
      visible: true,
      exercise: result.exercise || null,
      images: result.images,
      name: name,
      source: result.source,
    });
  };

  // Sesiune activa & exercitii custom
  const [activeSessionDay, setActiveSessionDay] = useState<number | null>(null);
  const [activeExercises, setActiveExercises] = useState<ActiveExercise[]>([]);
  const [exerciseSets, setExerciseSets] = useState<{ [key: number]: SetLog[] }>({});

  // Timer odihna
  const [secondsLeft, setSecondsLeft] = useState(90);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isVoiceMuted, setIsVoiceMuted] = useState(!getVoiceCoachEnabled());

  const logWorkoutSession = useStore((state) => state.logWorkoutSession);
  const recordSetPR = useStore((state) => state.recordSetPR);

  const currentRoutine = routinesLibrary[selectedRoutineIndex] || routinesLibrary[0];
  const currentDay = currentRoutine.days[selectedDayIndex] || currentRoutine.days[0];

  useEffect(() => {
    setSelectedDayIndex(0);
  }, [selectedRoutineIndex]);

  // Mentinem ecranul aprins la sala pe toata durata antrenamentului activ
  useEffect(() => {
    if (activeSessionDay !== null) {
      activateKeepAwakeAsync();
    } else {
      deactivateKeepAwake();
    }
    return () => {
      deactivateKeepAwake();
    };
  }, [activeSessionDay]);

  // Timer interval cu Voice Cues & Haptics
  useEffect(() => {
    let interval: any;
    if (isTimerRunning && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev === 6) {
            VoiceCues.fiveSecondsWarning();
          }
          if (prev <= 1) {
            setIsTimerRunning(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            VoiceCues.restOver();
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

  // Initializare sesiune activa
  const handleStartSession = (dayIdx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const day = currentRoutine.days[dayIdx];
    const exercises: ActiveExercise[] = day.exercises.map((e) => ({ ...e }));
    const initialSets: { [key: number]: SetLog[] } = {};

    exercises.forEach((ex, exIdx) => {
      initialSets[exIdx] = Array.from({ length: ex.sets }, (_, i) => ({
        setNumber: i + 1,
        type: 'N',
        weight: '60',
        reps: ex.reps_range.split('-')[0] || '8',
        completed: false,
      }));
    });

    setActiveExercises(exercises);
    setExerciseSets(initialSets);
    setActiveSessionDay(dayIdx);
  };

  // Schimbare tip serie (Normal -> Warmup -> Dropset -> Failure)
  const cycleSetType = (exIdx: number, setIdx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const types: SetType[] = ['N', 'W', 'D', 'F'];
    setExerciseSets((prev) => {
      const sets = [...(prev[exIdx] || [])];
      const curType = sets[setIdx].type;
      const nextType = types[(types.indexOf(curType) + 1) % types.length];
      sets[setIdx] = { ...sets[setIdx], type: nextType };
      return { ...prev, [exIdx]: sets };
    });
  };

  // Adaugare serie noua la un exercitiu
  const handleAddSet = (exIdx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExerciseSets((prev) => {
      const sets = [...(prev[exIdx] || [])];
      const lastSet = sets[sets.length - 1];
      const newSet: SetLog = {
        setNumber: sets.length + 1,
        type: 'N',
        weight: lastSet ? lastSet.weight : '60',
        reps: lastSet ? lastSet.reps : '8',
        completed: false,
      };
      return { ...prev, [exIdx]: [...sets, newSet] };
    });
  };

  // Adaugare exercitiu nou din biblioteca OpenGym in timpul sesiunii
  const handleAddCustomExercise = (item: ExerciseItem) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const newEx: ActiveExercise = {
      exercise_name: item.name,
      target_muscle: item.primary,
      secondary_muscles: item.secondary,
      sets: 3,
      reps_range: '8-10',
      rir: '1-2',
      rest_seconds: 90,
      notes: item.notes,
      equipment: item.equipment,
    };

    const newIdx = activeExercises.length;
    const newSets: SetLog[] = Array.from({ length: 3 }, (_, i) => ({
      setNumber: i + 1,
      type: 'N',
      weight: '50',
      reps: '10',
      completed: false,
    }));

    setActiveExercises([...activeExercises, newEx]);
    setExerciseSets({ ...exerciseSets, [newIdx]: newSets });
  };

  // Bifare set + Verificare Personal Record (PR)
  const toggleSetComplete = (exIdx: number, setIdx: number, restSeconds: number, exName: string) => {
    setExerciseSets((prev) => {
      const sets = [...(prev[exIdx] || [])];
      const current = sets[setIdx];
      const isNowCompleted = !current.completed;
      sets[setIdx] = { ...current, completed: isNowCompleted };

      if (isNowCompleted) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const w = parseFloat(current.weight) || 0;
        const r = parseInt(current.reps, 10) || 0;

        // Verifica PR
        if (w > 0 && r > 0 && current.type !== 'W') {
          const isPR = recordSetPR(exName, w, r);
          if (isPR) {
            VoiceCues.newPR(exName, w);
            Alert.alert('🏆 NOU RECORD PERSONAL (PR)!', `${exName}: ${w} kg x ${r} reps (1RM Estimat: ${calculate1RM(w, r)} kg)`);
          } else {
            VoiceCues.setDone(setIdx + 1);
          }
        } else {
          VoiceCues.setDone(setIdx + 1);
        }

        setSecondsLeft(restSeconds);
        setIsTimerRunning(true);
      }

      return { ...prev, [exIdx]: sets };
    });
  };

  // Finalizare antrenament
  const handleFinishWorkout = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    VoiceCues.workoutFinished();
    const day = currentRoutine.days[activeSessionDay!];

    let completedSetsCount = 0;
    let totalVolumeKg = 0;

    Object.entries(exerciseSets).forEach(([_, sets]) => {
      sets.forEach((s) => {
        if (s.completed) {
          completedSetsCount++;
          const w = parseFloat(s.weight) || 0;
          const r = parseInt(s.reps, 10) || 0;
          totalVolumeKg += w * r;
        }
      });
    });

    const estimatedKcal = Math.round(completedSetsCount * 22);
    const durationMinutes = Math.max(25, completedSetsCount * 3);

    logWorkoutSession(`${currentRoutine.routine_name} - ${day.day_title}`, durationMinutes * 60, estimatedKcal);

    Alert.alert(
      'Antrenament Încheiat! 🏆',
      `Volum Total Ridicat: ${totalVolumeKg.toLocaleString()} kg\nSerii Finalizate: ${completedSetsCount}\nCalorii Arse: ~${estimatedKcal} kcal\nSalvat în SQLite!`
    );

    setActiveSessionDay(null);
    setIsTimerRunning(false);
  };

  const openPlateCalcForWeight = (weightStr: string) => {
    const val = parseFloat(weightStr) || 100;
    setPlateCalcWeight(val);
    setIsPlateCalcOpen(true);
  };

  const formatTime = (timeInSeconds: number) => {
    const m = Math.floor(timeInSeconds / 60).toString().padStart(2, '0');
    const s = (timeInSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header cu Butoane Utilitare */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.badge}>{currentRoutine.level.toUpperCase()}</Text>
            <Text style={styles.mainTitle}>{currentRoutine.routine_name}</Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={[styles.utilBtn, isVoiceMuted && { opacity: 0.5 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                const nextMuted = !isVoiceMuted;
                setIsVoiceMuted(nextMuted);
                setVoiceCoachEnabled(!nextMuted);
              }}
            >
              <Feather name={isVoiceMuted ? "volume-x" : "volume-2"} size={16} color="#06B6D4" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.utilBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsPlateCalcOpen(true);
              }}
            >
              <Feather name="disc" size={16} color="#06B6D4" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.changeRoutineBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsGalleryOpen(true);
              }}
            >
              <Feather name="layers" size={16} color="#10B981" />
              <Text style={styles.changeRoutineText}>Galerie</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.subDesc}>{currentRoutine.description}</Text>

        {/* Floating Timer daca e activ */}
        {isTimerRunning && (
          <View style={styles.timerBanner}>
            <View style={styles.timerLeft}>
              <Feather name="clock" size={20} color="#06B6D4" />
              <Text style={styles.timerBannerText}>Odihnă: {formatTime(secondsLeft)}</Text>
            </View>
            <TouchableOpacity onPress={() => setIsTimerRunning(false)} style={styles.skipBtn}>
              <Text style={styles.skipBtnText}>Oprește</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Vizualizare Zile / Sesiune Inactiva */}
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

            <View style={styles.dayCard}>
              <View style={styles.dayCardHeader}>
                <Text style={styles.dayTitle}>{currentDay.day_title}</Text>
                <Text style={styles.exerciseCount}>{currentDay.exercises.length} Exerciții</Text>
              </View>

              {currentDay.exercises.map((ex, exIdx) => {
                const illu = getExerciseIllustration(ex.exercise_name, ex.target_muscle);
                const thumbUri = illu.images[0];

                return (
                  <View key={exIdx} style={styles.exerciseItem}>
                    <View style={styles.exHeader}>
                      {/* Thumbnail Ilustrație Locală Rapidă & Fluidă */}
                      <TouchableOpacity
                        style={styles.exThumbWrapper}
                        onPress={() => handleOpenExerciseDetail(ex.exercise_name, ex.target_muscle)}
                        activeOpacity={0.8}
                      >
                        <Image
                          source={illu.source}
                          style={styles.exThumbImg}
                          contentFit="contain"
                          autoplay={true}
                          cachePolicy="memory-disk"
                        />
                        <View style={styles.exThumbZoomBadge}>
                          <Feather name="maximize-2" size={9} color="#0F172A" />
                        </View>
                      </TouchableOpacity>

                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text style={styles.exName}>#{exIdx + 1} {ex.exercise_name}</Text>
                          <TouchableOpacity
                            onPress={() => handleOpenExerciseDetail(ex.exercise_name, ex.target_muscle)}
                            style={styles.smallInfoBtn}
                          >
                            <Feather name="info" size={15} color="#10B981" />
                          </TouchableOpacity>
                        </View>
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
                );
              })}

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
          /* SESIUNE ACTIVĂ STIL OPEN GYM */
          <View style={styles.activeSessionContainer}>
            <View style={styles.activeHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.activeBadge}>SESIUNE ACTIVĂ</Text>
                <Text style={styles.activeTitle}>{currentRoutine.days[activeSessionDay].day_title}</Text>
              </View>
              <TouchableOpacity style={styles.finishBtn} onPress={handleFinishWorkout} activeOpacity={0.8}>
                <Text style={styles.finishBtnText}>Încheie</Text>
              </TouchableOpacity>
            </View>

            {activeExercises.map((ex, exIdx) => {
              const illu = getExerciseIllustration(ex.exercise_name, ex.target_muscle);

              return (
                <View key={exIdx} style={styles.activeExCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    {/* Thumbnail Ilustrație Sesiune Activă */}
                    <TouchableOpacity
                      style={styles.activeExThumbWrapper}
                      onPress={() => handleOpenExerciseDetail(ex.exercise_name, ex.target_muscle)}
                      activeOpacity={0.8}
                    >
                      <Image
                        source={illu.source}
                        style={styles.activeExThumbImg}
                        contentFit="contain"
                        autoplay={true}
                        cachePolicy="memory-disk"
                      />
                      <View style={styles.exThumbZoomBadge}>
                        <Feather name="maximize-2" size={8} color="#0F172A" />
                      </View>
                    </TouchableOpacity>

                    <View style={{ flex: 1, paddingHorizontal: 10 }}>
                      <Text style={styles.activeExName}>#{exIdx + 1} {ex.exercise_name}</Text>
                      <Text style={styles.activeExNotes}>🎯 {ex.target_muscle} • Odihnă: {ex.rest_seconds}s</Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <TouchableOpacity
                        style={styles.smallInfoBtn}
                        onPress={() => handleOpenExerciseDetail(ex.exercise_name, ex.target_muscle)}
                      >
                        <Feather name="info" size={16} color="#10B981" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.plateIconBtn}
                        onPress={() => {
                          const firstWeight = (exerciseSets[exIdx] && exerciseSets[exIdx][0]?.weight) || '100';
                          openPlateCalcForWeight(firstWeight);
                        }}
                      >
                        <Feather name="disc" size={16} color="#06B6D4" />
                      </TouchableOpacity>
                    </View>
                  </View>

                {/* Tabel Seturi OpenGym */}
                <View style={styles.setTable}>
                  <View style={styles.setRowHeader}>
                    <Text style={[styles.setHeaderText, { width: 36, textAlign: 'center' }]}>TIP</Text>
                    <Text style={[styles.setHeaderText, { width: 34 }]}>SET</Text>
                    <Text style={[styles.setHeaderText, { flex: 1 }]}>KG</Text>
                    <Text style={[styles.setHeaderText, { flex: 1 }]}>REPETĂRI</Text>
                    <Text style={[styles.setHeaderText, { width: 65, textAlign: 'center' }]}>1RM EST</Text>
                    <Text style={[styles.setHeaderText, { width: 44, textAlign: 'center' }]}>STATUS</Text>
                  </View>

                  {(exerciseSets[exIdx] || []).map((s, setIdx) => {
                    const w = parseFloat(s.weight) || 0;
                    const r = parseInt(s.reps, 10) || 0;
                    const est1rm = calculate1RM(w, r);

                    return (
                      <View key={setIdx} style={[styles.setRow, s.completed && styles.setRowCompleted]}>
                        {/* Tip Serie (W/N/D/F) */}
                        <TouchableOpacity
                          style={[
                            styles.typeChip,
                            s.type === 'W' && styles.typeWarmup,
                            s.type === 'D' && styles.typeDropset,
                            s.type === 'F' && styles.typeFailure,
                          ]}
                          onPress={() => cycleSetType(exIdx, setIdx)}
                        >
                          <Text style={styles.typeChipText}>{s.type}</Text>
                        </TouchableOpacity>

                        <Text style={[styles.setCellText, { width: 34, fontWeight: 'bold' }]}>#{s.setNumber}</Text>

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

                        {/* 1RM Estimat */}
                        <Text style={styles.est1rmText}>{est1rm > 0 ? `${est1rm}k` : '-'}</Text>

                        {/* Checkbox Status */}
                        <TouchableOpacity
                          style={[styles.checkBtn, s.completed && styles.checkBtnDone]}
                          onPress={() => toggleSetComplete(exIdx, setIdx, ex.rest_seconds, ex.exercise_name)}
                        >
                          <Feather name={s.completed ? "check" : "circle"} size={16} color={s.completed ? "#0F172A" : "rgba(255,255,255,0.4)"} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>

                {/* Buton Adaugă Serie */}
                <TouchableOpacity style={styles.addSetBtn} onPress={() => handleAddSet(exIdx)}>
                  <Feather name="plus" size={14} color="#10B981" />
                  <Text style={styles.addSetText}>Adaugă Serie</Text>
                </TouchableOpacity>
              </View>
            );
          })}

            {/* Buton Adauga Exercitiu din Biblioteca OpenGym */}
            <TouchableOpacity
              style={styles.addExBtn}
              onPress={() => setIsExercisePickerOpen(true)}
              activeOpacity={0.8}
            >
              <Feather name="plus-circle" size={18} color="#10B981" />
              <Text style={styles.addExBtnText}>+ Adaugă Alt Exercițiu la Sesiune</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.bottomFinishBtn} onPress={handleFinishWorkout} activeOpacity={0.8}>
              <Feather name="check-circle" size={22} color="#0F172A" />
              <Text style={styles.bottomFinishText}>FINALIZEAZĂ ANTRENAMENTUL</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Modale */}
      <PlateCalculatorModal
        visible={isPlateCalcOpen}
        initialWeight={plateCalcWeight}
        onClose={() => setIsPlateCalcOpen(false)}
      />

      <ExercisePickerModal
        visible={isExercisePickerOpen}
        onClose={() => setIsExercisePickerOpen(false)}
        onSelectExercise={handleAddCustomExercise}
      />

      {/* Modal Galerie */}
      <Modal visible={isGalleryOpen} animationType="slide" transparent={true} onRequestClose={() => setIsGalleryOpen(false)}>
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

      {/* Modal Detaliu Exercițiu & Animație Formă Fluidă */}
      <ExerciseDetailModal
        visible={detailModalState.visible}
        exercise={detailModalState.exercise}
        images={detailModalState.images}
        exerciseName={detailModalState.name}
        source={detailModalState.source}
        onClose={() => setDetailModalState((prev) => ({ ...prev, visible: false }))}
      />
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
  utilBtn: {
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    borderRadius: 10,
    padding: 9,
    alignItems: 'center',
    justifyContent: 'center',
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
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  exHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  exThumbWrapper: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  exThumbImg: {
    width: '100%',
    height: '100%',
  },
  exThumbZoomBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 5,
    padding: 2,
  },
  activeExThumbWrapper: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  activeExThumbImg: {
    width: '100%',
    height: '100%',
  },
  smallInfoBtn: {
    padding: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(16,185,129,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
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
  plateIconBtn: {
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderRadius: 8,
    padding: 6,
  },
  setTable: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 10,
    padding: 8,
  },
  setRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    marginBottom: 6,
  },
  setHeaderText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '700',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 6,
  },
  setRowCompleted: {
    opacity: 0.7,
  },
  typeChip: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeWarmup: {
    backgroundColor: '#EAB308',
  },
  typeDropset: {
    backgroundColor: '#8B5CF6',
  },
  typeFailure: {
    backgroundColor: '#EF4444',
  },
  typeChipText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  setCellText: {
    color: '#FFF',
    fontSize: 12,
  },
  setInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 8,
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 13,
    textAlign: 'center',
  },
  est1rmText: {
    width: 65,
    color: '#10B981',
    fontWeight: '700',
    fontSize: 11,
    textAlign: 'center',
  },
  checkBtn: {
    width: 44,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBtnDone: {
    backgroundColor: '#10B981',
  },
  addSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginTop: 8,
    gap: 4,
  },
  addSetText: {
    color: '#10B981',
    fontWeight: '700',
    fontSize: 12,
  },
  addExBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  addExBtnText: {
    color: '#10B981',
    fontWeight: 'bold',
    fontSize: 14,
  },
  bottomFinishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 6,
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
