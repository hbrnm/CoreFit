import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, FlatList } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';
import foodsDatabase from '../data/foods.json';
import { useStore } from '../store/useStore';

interface AddFoodModalProps {
  visible: boolean;
  onClose: () => void;
  defaultMealType?: string;
}

const MEAL_TYPES = ['Mic Dejun', 'Prânz', 'Cină', 'Gustări'];

export function AddFoodModal({ visible, onClose, defaultMealType = 'Prânz' }: AddFoodModalProps) {
  const [selectedMealType, setSelectedMealType] = useState(defaultMealType);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Custom Food Form
  const [customName, setCustomName] = useState('');
  const [customCalories, setCustomCalories] = useState('');
  const [customProtein, setCustomProtein] = useState('');
  const [customCarbs, setCustomCarbs] = useState('');
  const [customFat, setCustomFat] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);

  const addFoodLog = useStore((state) => state.addFoodLog);

  const filteredFoods = foodsDatabase.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectQuickFood = (food: typeof foodsDatabase[0]) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addFoodLog({
      meal_type: selectedMealType,
      name: food.name,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
    });
    onClose();
  };

  const handleSaveCustomFood = () => {
    const cal = parseInt(customCalories, 10);
    if (!customName.trim() || isNaN(cal) || cal <= 0) {
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addFoodLog({
      meal_type: selectedMealType,
      name: customName.trim(),
      calories: cal,
      protein: parseFloat(customProtein) || 0,
      carbs: parseFloat(customCarbs) || 0,
      fat: parseFloat(customFat) || 0,
    });

    setCustomName('');
    setCustomCalories('');
    setCustomProtein('');
    setCustomCarbs('');
    setCustomFat('');
    setIsCustomMode(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Feather name="plus-circle" size={22} color="#10B981" />
              <Text style={styles.title}>Înregistrează Aliment</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Selector Tip Masa */}
          <View style={styles.mealTypeRow}>
            {MEAL_TYPES.map((m) => {
              const active = selectedMealType === m;
              return (
                <TouchableOpacity
                  key={m}
                  style={[styles.mealBtn, active && styles.mealBtnActive]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedMealType(m);
                  }}
                >
                  <Text style={[styles.mealBtnText, active && styles.mealBtnTextActive]}>{m}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Toggle Căutare / Custom */}
          <View style={styles.modeToggleRow}>
            <TouchableOpacity
              style={[styles.modeBtn, !isCustomMode && styles.modeBtnActive]}
              onPress={() => setIsCustomMode(false)}
            >
              <Text style={[styles.modeBtnText, !isCustomMode && styles.modeBtnTextActive]}>
                Bază de Date Alimente
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, isCustomMode && styles.modeBtnActive]}
              onPress={() => setIsCustomMode(true)}
            >
              <Text style={[styles.modeBtnText, isCustomMode && styles.modeBtnTextActive]}>
                + Adăugare Rapidă
              </Text>
            </TouchableOpacity>
          </View>

          {!isCustomMode ? (
            <>
              {/* Search Bar */}
              <View style={styles.searchBar}>
                <Feather name="search" size={18} color="rgba(255,255,255,0.4)" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Caută pui, ouă, orez, ovăz..."
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              {/* Lista Alimente Rapide */}
              <FlatList
                data={filteredFoods}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.foodItem}
                    onPress={() => handleSelectQuickFood(item)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.foodName}>{item.name}</Text>
                      <Text style={styles.foodServing}>Porție standard: {item.serving}</Text>
                    </View>

                    <View style={styles.foodRight}>
                      <Text style={styles.foodCal}>{item.calories} kcal</Text>
                      <Text style={styles.foodMacros}>
                        P: {item.protein}g • C: {item.carbs}g • G: {item.fat}g
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            </>
          ) : (
            /* Formular Personalizat */
            <View style={styles.customForm}>
              <Text style={styles.inputLabel}>NUME ALIMENT / MASĂ</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Friptură de vită cu piure"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={customName}
                onChangeText={setCustomName}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>CALORII (KCAL)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="450"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    keyboardType="numeric"
                    value={customCalories}
                    onChangeText={setCustomCalories}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>PROTEINE (G)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="35"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    keyboardType="numeric"
                    value={customProtein}
                    onChangeText={setCustomProtein}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>CARBOHIDRAȚI (G)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="40"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    keyboardType="numeric"
                    value={customCarbs}
                    onChangeText={setCustomCarbs}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>GRĂSIMI (G)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="12"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    keyboardType="numeric"
                    value={customFat}
                    onChangeText={setCustomFat}
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.saveCustomBtn} onPress={handleSaveCustomFood}>
                <Feather name="plus" size={18} color="#0F172A" />
                <Text style={styles.saveCustomBtnText}>Adaugă în Jurnal</Text>
              </TouchableOpacity>
            </View>
          )}
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
    height: '85%',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  mealTypeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  mealBtn: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    alignItems: 'center',
  },
  mealBtnActive: {
    backgroundColor: '#10B981',
  },
  mealBtnText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '700',
  },
  mealBtnTextActive: {
    color: '#0F172A',
  },
  modeToggleRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    padding: 4,
    marginBottom: 14,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  modeBtnActive: {
    backgroundColor: '#334155',
  },
  modeBtnText: {
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '700',
    fontSize: 12,
  },
  modeBtnTextActive: {
    color: '#FFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 15,
  },
  foodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  foodName: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  foodServing: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
  },
  foodRight: {
    alignItems: 'flex-end',
  },
  foodCal: {
    color: '#10B981',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  foodMacros: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
  },
  customForm: {
    gap: 6,
  },
  inputLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    color: '#FFF',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  saveCustomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 16,
    gap: 8,
  },
  saveCustomBtnText: {
    color: '#0F172A',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
