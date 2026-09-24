import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';
import * as LocalAuthentication from 'expo-local-authentication';
import { useStore } from '../store/useStore';
import { exportAllDataAsJson } from '../lib/db';
import { LineChart, ChartDataPoint } from '../components/LineChart';

export function ProfileScreen() {
  const profile = useStore((state) => state.profile);
  const bodyWeightLogs = useStore((state) => state.bodyWeightLogs);
  const prRecords = useStore((state) => state.prRecords);
  const updateProfileName = useStore((state) => state.updateProfileName);
  const updateStepGoal = useStore((state) => state.updateStepGoal);
  const logBodyWeight = useStore((state) => state.logBodyWeight);
  const isBiometricsEnabled = useStore((state) => state.isBiometricsEnabled);
  const setBiometricsEnabled = useStore((state) => state.setBiometricsEnabled);

  const [nameInput, setNameInput] = useState(profile.name);
  const [stepGoalInput, setStepGoalInput] = useState(profile.step_goal.toString());
  const [newWeightInput, setNewWeightInput] = useState('');

  const handleSaveProfile = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (nameInput.trim()) updateProfileName(nameInput.trim());
    const numGoal = parseInt(stepGoalInput, 10);
    if (!isNaN(numGoal) && numGoal > 0) updateStepGoal(numGoal);
    Alert.alert('Salvat!', 'Profilul tău a fost actualizat cu succes.');
  };

  const handleLogWeight = () => {
    const w = parseFloat(newWeightInput);
    if (!w || w <= 20 || w >= 300) {
      Alert.alert('Greutate invalidă', 'Introdu o greutate validă în kg (ex: 78.5).');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    logBodyWeight(w);
    setNewWeightInput('');
    Alert.alert('Greutate Înregistrată ⚖️', `${w} kg salvat în istoricul tău persistent.`);
  };

  const handleToggleBiometrics = async (val: boolean) => {
    if (val) {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert('Biometrie Indisponibilă', 'Dispozitivul tău nu are Face ID / Touch ID configurat.');
        return;
      }

      const auth = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Confirmă activarea Face ID / Touch ID pentru CoreFit',
      });

      if (auth.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setBiometricsEnabled(true);
        Alert.alert('Securitate Activată 🔒', 'Aplicația este acum protejată biometric.');
      }
    } else {
      setBiometricsEnabled(false);
    }
  };

  const handleExportData = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const jsonStr = exportAllDataAsJson();
    Alert.alert(
      'Export Date SQLite (Format OpenGym)',
      `Datele tale (${jsonStr.length} caractere) sunt pregătite. Format 100% offline-first:\n\n${jsonStr.slice(0, 300)}...`,
      [{ text: 'OK' }]
    );
  };

  const latestWeight = bodyWeightLogs[0]?.weight_kg;
  const previousWeight = bodyWeightLogs[1]?.weight_kg;
  const weightDelta = latestWeight && previousWeight ? Math.round((latestWeight - previousWeight) * 10) / 10 : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Profil & Progres</Text>

        {/* Avatar Card */}
        <View style={styles.avatarCard}>
          <View style={styles.avatar}>
            <Text style={{ fontSize: 36 }}>👤</Text>
          </View>
          <Text style={styles.profileName}>{profile.name}</Text>
          <Text style={styles.profileSub}>Membru CoreFit Pro • OpenGym Engine</Text>
        </View>

        {/* Card Monitorizare Greutate Corporală (OpenGym) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Feather name="trending-up" size={18} color="#10B981" />
            <Text style={styles.cardTitle}>Evoluție Greutate Corporală</Text>
          </View>

          <View style={styles.weightStatsRow}>
            <View>
              <Text style={styles.weightMainVal}>{latestWeight ? `${latestWeight} kg` : 'Nicio înregistrare'}</Text>
              <Text style={styles.weightSub}>Ultima cântărire</Text>
            </View>

            {weightDelta !== null && (
              <View style={[styles.deltaBadge, { backgroundColor: weightDelta > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)' }]}>
                <Text style={{ color: weightDelta > 0 ? '#EF4444' : '#10B981', fontWeight: 'bold' }}>
                  {weightDelta > 0 ? `+${weightDelta} kg` : `${weightDelta} kg`}
                </Text>
              </View>
            )}
          </View>

          {/* Input Cântărire Nouă */}
          <View style={styles.logWeightRow}>
            <TextInput
              style={styles.weightInput}
              placeholder="Ex: 78.5"
              placeholderTextColor="rgba(255,255,255,0.4)"
              keyboardType="numeric"
              value={newWeightInput}
              onChangeText={setNewWeightInput}
            />
            <TouchableOpacity style={styles.logWeightBtn} onPress={handleLogWeight}>
              <Feather name="plus" size={16} color="#0F172A" />
              <Text style={styles.logWeightBtnText}>Adaugă Cântărire</Text>
            </TouchableOpacity>
          </View>

          {/* Grafic Evolutie Greutate */}
          <LineChart
            data={
              bodyWeightLogs.length >= 2
                ? [...bodyWeightLogs].reverse().map((b) => ({
                    label: b.date.slice(5),
                    value: b.weight_kg,
                  }))
                : [
                    { label: 'S-3', value: latestWeight ? latestWeight + 0.8 : 79.5 },
                    { label: 'S-2', value: latestWeight ? latestWeight + 0.4 : 79.0 },
                    { label: 'S-1', value: latestWeight ? latestWeight + 0.1 : 78.7 },
                    { label: 'Azi', value: latestWeight ? latestWeight : 78.5 },
                  ]
            }
            height={130}
            color="#10B981"
            unit=" kg"
          />

          {/* Istoric Cântăriri Recente */}
          {bodyWeightLogs.length > 0 && (
            <View style={styles.weightHistoryList}>
              <Text style={styles.historyTitle}>Istoric recent:</Text>
              {bodyWeightLogs.slice(0, 4).map((log) => (
                <View key={log.id} style={styles.historyRow}>
                  <Text style={styles.historyDate}>{log.date}</Text>
                  <Text style={styles.historyWeight}>{log.weight_kg} kg</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Card Recorduri Personale (PRs) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Feather name="award" size={18} color="#EAB308" />
            <Text style={[styles.cardTitle, { color: '#EAB308' }]}>Recorduri Personale (PRs & 1RM)</Text>
          </View>

          {prRecords.length > 0 ? (
            prRecords.slice(0, 5).map((pr) => (
              <View key={pr.id} style={styles.prItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.prExName}>{pr.exercise_name}</Text>
                  <Text style={styles.prSub}>{pr.max_weight} kg x {pr.reps} reps • {pr.date}</Text>
                </View>
                <View style={styles.pr1rmBadge}>
                  <Text style={styles.pr1rmText}>{pr.est_1rm} kg</Text>
                  <Text style={styles.pr1rmSub}>1RM Est</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyPrText}>
              Bifează serii în timpul antrenamentului pentru a-ți înregistra primele recorduri personale!
            </Text>
          )}
        </View>

        {/* Setări Profil & Biometrie */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Feather name="settings" size={18} color="#06B6D4" />
            <Text style={[styles.cardTitle, { color: '#06B6D4' }]}>Configurare & Securitate</Text>
          </View>

          <Text style={styles.fieldLabel}>NUME / PSEUDONIM</Text>
          <TextInput
            style={styles.input}
            value={nameInput}
            onChangeText={setNameInput}
            placeholder="Numele tău"
            placeholderTextColor="rgba(255,255,255,0.4)"
          />

          <Text style={styles.fieldLabel}>OBIECTIV PAȘI ZILNICI</Text>
          <TextInput
            style={styles.input}
            value={stepGoalInput}
            onChangeText={setStepGoalInput}
            keyboardType="numeric"
            placeholder="10000"
            placeholderTextColor="rgba(255,255,255,0.4)"
          />

          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile} activeOpacity={0.8}>
            <Feather name="check" size={18} color="#0F172A" />
            <Text style={styles.saveBtnText}>Actualizează Nume & Ținte</Text>
          </TouchableOpacity>

          {/* Toggle Securitate Biometrica */}
          <View style={styles.switchRow}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.switchTitle}>Securitate Face ID / Biometrie</Text>
              <Text style={styles.switchDesc}>Protejează datele de sănătate cu autentificare biometrică nativă</Text>
            </View>
            <Switch
              value={isBiometricsEnabled}
              onValueChange={handleToggleBiometrics}
              trackColor={{ false: '#334155', true: '#10B981' }}
              thumbColor="#FFF"
            />
          </View>
        </View>

        {/* Card Export Date (OpenGym Standard) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Feather name="database" size={18} color="#94A3B8" />
            <Text style={[styles.cardTitle, { color: '#94A3B8' }]}>Proprietate & Export Date</Text>
          </View>
          <Text style={styles.cardSub}>
            Conform filozofiei OpenGym, toate datele tale îți aparțin 100% și sunt salvate doar pe dispozitivul tău. Poți descărca oricând un backup complet.
          </Text>

          <TouchableOpacity style={styles.exportBtn} onPress={handleExportData} activeOpacity={0.8}>
            <Feather name="download" size={18} color="#FFF" />
            <Text style={styles.exportBtnText}>Exportă Baza de Date (JSON)</Text>
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
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 20,
  },
  avatarCard: {
    alignItems: 'center',
    marginBottom: 25,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 2,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  profileName: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  profileSub: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 4,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  cardTitle: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardSub: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  weightStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  weightMainVal: {
    color: '#FFF',
    fontSize: 26,
    fontWeight: 'bold',
  },
  weightSub: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  deltaBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  logWeightRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  weightInput: {
    width: 100,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  logWeightBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingVertical: 10,
    gap: 6,
  },
  logWeightBtnText: {
    color: '#0F172A',
    fontWeight: 'bold',
    fontSize: 14,
  },
  weightHistoryList: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 10,
    gap: 6,
  },
  historyTitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  historyDate: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
  },
  historyWeight: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  prItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  prExName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  prSub: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
  },
  pr1rmBadge: {
    alignItems: 'flex-end',
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pr1rmText: {
    color: '#EAB308',
    fontWeight: 'bold',
    fontSize: 14,
  },
  pr1rmSub: {
    color: 'rgba(234, 179, 8, 0.7)',
    fontSize: 9,
    fontWeight: '600',
  },
  emptyPrText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    lineHeight: 18,
  },
  fieldLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 8,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    color: '#FFF',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 10,
    gap: 8,
  },
  saveBtnText: {
    color: '#0F172A',
    fontWeight: 'bold',
    fontSize: 14,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  switchTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  switchDesc: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    lineHeight: 15,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#334155',
    borderRadius: 10,
    paddingVertical: 12,
    gap: 8,
  },
  exportBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
