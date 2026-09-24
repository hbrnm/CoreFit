import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';
import { useStore } from '../store/useStore';

export function ProfileScreen() {
  const profile = useStore((state) => state.profile);
  const updateProfileName = useStore((state) => state.updateProfileName);
  const updateStepGoal = useStore((state) => state.updateStepGoal);

  const [nameInput, setNameInput] = useState(profile.name);
  const [stepGoalInput, setStepGoalInput] = useState(profile.step_goal.toString());

  const handleSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (nameInput.trim()) {
      updateProfileName(nameInput.trim());
    }
    const numGoal = parseInt(stepGoalInput, 10);
    if (!isNaN(numGoal) && numGoal > 0) {
      updateStepGoal(numGoal);
    }
    Alert.alert('Salvat!', 'Profilul și obiectivele tale au fost actualizate local.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Profil Utilizator</Text>

        <View style={styles.avatarCard}>
          <View style={styles.avatar}>
            <Text style={{ fontSize: 36 }}>👤</Text>
          </View>
          <Text style={styles.profileName}>{profile.name}</Text>
          <Text style={styles.profileSub}>Membru CoreFit Mobile</Text>
        </View>

        <View style={styles.formCard}>
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

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
            <Feather name="check" size={18} color="#0F172A" />
            <Text style={styles.saveBtnText}>Salvează Modificările</Text>
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
  avatarCard: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 2,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  profileName: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  profileSub: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginTop: 4,
  },
  formCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
  },
  fieldLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 10,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    color: '#FFF',
    fontSize: 16,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 15,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 15,
    gap: 8,
  },
  saveBtnText: {
    color: '#0F172A',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
