import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, FlatList, ActivityIndicator } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';
import foodsDatabase from '../data/foods.json';
import { useStore } from '../store/useStore';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { searchRomanianFoods, RomanianFoodProduct } from '../lib/openFoodFacts';

interface AddFoodModalProps {
  visible: boolean;
  onClose: () => void;
  defaultMealType?: string;
}

const MEAL_TYPES = ['Mic Dejun', 'Prânz', 'Cină', 'Gustări'];

export function AddFoodModal({ visible, onClose, defaultMealType = 'Prânz' }: AddFoodModalProps) {
  const [selectedMealType, setSelectedMealType] = useState(defaultMealType);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Rezultate online Open Food Facts Romania
  const [onlineResults, setOnlineResults] = useState<RomanianFoodProduct[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);

  // Formular Produs Selectat / Ajustare Gramaj
  const [selectedFood, setSelectedFood] = useState<RomanianFoodProduct | null>(null);
  const [portionGrams, setPortionGrams] = useState('100');

  // Formular Manual Rapid
  const [customName, setCustomName] = useState('');
  const [customCalories, setCustomCalories] = useState('');
  const [customProtein, setCustomProtein] = useState('');
  const [customCarbs, setCustomCarbs] = useState('');
  const [customFat, setCustomFat] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);

  const addFoodLog = useStore((state) => state.addFoodLog);

  // Căutare combinată: Bază locală + Open Food Facts România
  const localFiltered = foodsDatabase.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (searchQuery.trim().length >= 3) {
      setIsSearchingOnline(true);
      const timer = setTimeout(async () => {
        const results = await searchRomanianFoods(searchQuery);
        setOnlineResults(results);
        setIsSearchingOnline(false);
      }, 500);

      return () => clearTimeout(timer);
    } else {
      setOnlineResults([]);
      setIsSearchingOnline(false);
    }
  }, [searchQuery]);

  // Cand utilizatorul alege un aliment (din local, online sau scanat)
  const handleSelectFoodForPortion = (food: RomanianFoodProduct) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedFood(food);
    setPortionGrams('100');
  };

  // Salveaza portia ajustata
  const handleConfirmPortion = () => {
    if (!selectedFood) return;

    const grams = parseFloat(portionGrams) || 100;
    const ratio = grams / 100;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addFoodLog({
      meal_type: selectedMealType,
      name: `${selectedFood.name} (${grams}g)`,
      calories: Math.round(selectedFood.calories * ratio),
      protein: Math.round(selectedFood.protein * ratio * 10) / 10,
      carbs: Math.round(selectedFood.carbs * ratio * 10) / 10,
      fat: Math.round(selectedFood.fat * ratio * 10) / 10,
    });

    setSelectedFood(null);
    onClose();
  };

  const handleSaveCustomFood = () => {
    const cal = parseInt(customCalories, 10);
    if (!customName.trim() || isNaN(cal) || cal <= 0) return;

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

          {/* Daca e selectat un aliment pentru ajustarea gramajului */}
          {selectedFood ? (
            <View style={styles.portionCard}>
              <Text style={styles.portionTitle}>{selectedFood.name}</Text>
              <Text style={styles.portionPer100}>
                Valori per 100g: {selectedFood.calories} kcal • P: {selectedFood.protein}g • C: {selectedFood.carbs}g • G: {selectedFood.fat}g
              </Text>

              <Text style={styles.inputLabel}>CANTITATE CONSUMATĂ (GRAME)</Text>
              <View style={styles.gramsRow}>
                <TextInput
                  style={styles.gramsInput}
                  value={portionGrams}
                  keyboardType="numeric"
                  onChangeText={setPortionGrams}
                  autoFocus
                />
                <Text style={styles.gramsUnit}>grame</Text>
              </View>

              {/* Valori calculate pe loc */}
              {(() => {
                const g = parseFloat(portionGrams) || 0;
                const r = g / 100;
                return (
                  <View style={styles.calculatedBox}>
                    <Text style={styles.calculatedCal}>{Math.round(selectedFood.calories * r)} kcal</Text>
                    <Text style={styles.calculatedMacros}>
                      P: {Math.round(selectedFood.protein * r * 10) / 10}g • C: {Math.round(selectedFood.carbs * r * 10) / 10}g • G: {Math.round(selectedFood.fat * r * 10) / 10}g
                    </Text>
                  </View>
                );
              })()}

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <TouchableOpacity style={styles.cancelPortionBtn} onPress={() => setSelectedFood(null)}>
                  <Text style={styles.cancelPortionText}>Înapoi</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.confirmPortionBtn} onPress={handleConfirmPortion}>
                  <Feather name="check" size={18} color="#0F172A" />
                  <Text style={styles.confirmPortionText}>Adaugă la {selectedMealType}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
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

              {/* Buton Mare Scanare Cod de Bare */}
              <TouchableOpacity
                style={styles.scanBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setIsScannerOpen(true);
                }}
                activeOpacity={0.8}
              >
                <Feather name="camera" size={20} color="#0F172A" />
                <Text style={styles.scanBtnText}>Scanează Cod de Bare (Supermarket)</Text>
              </TouchableOpacity>

              {/* Mode Toggle */}
              <View style={styles.modeToggleRow}>
                <TouchableOpacity
                  style={[styles.modeBtn, !isCustomMode && styles.modeBtnActive]}
                  onPress={() => setIsCustomMode(false)}
                >
                  <Text style={[styles.modeBtnText, !isCustomMode && styles.modeBtnTextActive]}>
                    Căutare Alimente (România)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeBtn, isCustomMode && styles.modeBtnActive]}
                  onPress={() => setIsCustomMode(true)}
                >
                  <Text style={[styles.modeBtnText, isCustomMode && styles.modeBtnTextActive]}>
                    + Manual
                  </Text>
                </TouchableOpacity>
              </View>

              {!isCustomMode ? (
                <>
                  <View style={styles.searchBar}>
                    <Feather name="search" size={18} color="rgba(255,255,255,0.4)" />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Ex: Napolact, Covalact, pui, orez, lapte..."
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                    {isSearchingOnline && <ActivityIndicator size="small" color="#10B981" />}
                  </View>

                  <FlatList
                    data={[
                      ...localFiltered.map((l) => ({
                        ...l,
                        brand: 'Bază de date locală',
                      })),
                      ...onlineResults,
                    ]}
                    keyExtractor={(item, idx) => item.id || idx.toString()}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 30 }}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.foodItem}
                        onPress={() => handleSelectFoodForPortion(item)}
                        activeOpacity={0.7}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.foodName}>{item.name}</Text>
                          <Text style={styles.foodServing}>
                            {item.brand ? `Marcă: ${item.brand}` : 'Aliment de bază'}
                          </Text>
                        </View>

                        <View style={styles.foodRight}>
                          <Text style={styles.foodCal}>{item.calories} kcal</Text>
                          <Text style={styles.foodMacros}>
                            P: {item.protein}g • C: {item.carbs}g • G: {item.fat}g
                          </Text>
                        </View>
                      </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                      <View style={{ padding: 25, alignItems: 'center' }}>
                        <Text style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
                          Tastează minim 3 litere pentru a căuta în baza de date România sau scanează codul de bare de pe cutie!
                        </Text>
                      </View>
                    }
                  />
                </>
              ) : (
                /* Formular Manual */
                <View style={styles.customForm}>
                  <Text style={styles.inputLabel}>NUME ALIMENT / MASĂ</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: Ciorbă de văcuță cu smântână"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    value={customName}
                    onChangeText={setCustomName}
                  />

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>CALORII (KCAL)</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="350"
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
                        placeholder="25"
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
                        placeholder="30"
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
                        placeholder="10"
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
            </>
          )}
        </View>
      </View>

      {/* Modal Scanner Cameră */}
      <BarcodeScannerModal
        visible={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onProductFound={(prod) => {
          handleSelectFoodForPortion(prod);
        }}
      />
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
    height: '90%',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  mealTypeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
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
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
    marginBottom: 12,
  },
  scanBtnText: {
    color: '#0F172A',
    fontWeight: '900',
    fontSize: 14,
  },
  modeToggleRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    padding: 4,
    marginBottom: 12,
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
  portionCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginTop: 10,
  },
  portionTitle: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  portionPer100: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginBottom: 16,
  },
  gramsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  gramsInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#10B981',
    fontSize: 22,
    fontWeight: 'bold',
    width: 120,
    textAlign: 'center',
  },
  gramsUnit: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  calculatedBox: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  calculatedCal: {
    color: '#10B981',
    fontSize: 22,
    fontWeight: 'bold',
  },
  calculatedMacros: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  cancelPortionBtn: {
    flex: 1,
    backgroundColor: '#334155',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelPortionText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  confirmPortionBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingVertical: 12,
    gap: 6,
  },
  confirmPortionText: {
    color: '#0F172A',
    fontWeight: 'bold',
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
