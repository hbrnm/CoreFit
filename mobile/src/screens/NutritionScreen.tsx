import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';
import { useStore } from '../store/useStore';
import { CircularProgress } from '../components/CircularProgress';
import { AddFoodModal } from '../components/AddFoodModal';
import recipesData from '../data/recipes.json';

type ActiveTab = 'journal' | 'recipes' | 'water';

const MEAL_CATEGORIES = ['Mic Dejun', 'Prânz', 'Cină', 'Gustări'];

export function NutritionScreen() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('journal');
  const [isAddFoodOpen, setIsAddFoodOpen] = useState(false);
  const [selectedMealCategory, setSelectedMealCategory] = useState('Prânz');

  const profile = useStore((state) => state.profile);
  const todayWater = useStore((state) => state.todayWater);
  const addWater = useStore((state) => state.addWater);
  const todayFoodLogs = useStore((state) => state.todayFoodLogs);
  const todayMacros = useStore((state) => state.todayMacros);
  const addFoodLog = useStore((state) => state.addFoodLog);
  const deleteFoodLog = useStore((state) => state.deleteFoodLog);

  // Calculeaza tintele de macronutrienti conform caloriilor alese
  const calorieGoal = profile.calorie_goal || 2200;
  // 30% Proteine (4 kcal/g), 45% Carbohidrati (4 kcal/g), 25% Grasimi (9 kcal/g)
  const targetProtein = Math.round((calorieGoal * 0.3) / 4);
  const targetCarbs = Math.round((calorieGoal * 0.45) / 4);
  const targetFat = Math.round((calorieGoal * 0.25) / 9);

  const remainingCalories = Math.max(0, calorieGoal - todayMacros.calories);

  const handleAddWater = (amount: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addWater(amount);
  };

  const handleOpenAddFood = (mealType: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMealCategory(mealType);
    setIsAddFoodOpen(true);
  };

  const handleLogRecipe = (recipe: typeof recipesData[0]) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addFoodLog({
      meal_type: recipe.category.includes('Mic Dejun') ? 'Mic Dejun' : 'Prânz',
      name: recipe.title,
      calories: recipe.calories,
      protein: recipe.protein,
      carbs: recipe.carbs,
      fat: recipe.fat,
    });
    Alert.alert('Rețetă Înregistrată! 🥗', `"${recipe.title}" (${recipe.calories} kcal) a fost adăugată în Jurnalul tău de azi.`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header cu Switcher Tab-uri */}
        <View style={styles.header}>
          <Text style={styles.badge}>OPEN NUTRI TRACKER</Text>
          <Text style={styles.title}>Nutriție & Macronutrienți</Text>

          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'journal' && styles.tabBtnActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab('journal');
              }}
            >
              <Feather name="book" size={14} color={activeTab === 'journal' ? '#0F172A' : 'rgba(255,255,255,0.6)'} />
              <Text style={[styles.tabBtnText, activeTab === 'journal' && styles.tabBtnTextActive]}>
                Jurnal Mese
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'recipes' && styles.tabBtnActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab('recipes');
              }}
            >
              <Feather name="coffee" size={14} color={activeTab === 'recipes' ? '#0F172A' : 'rgba(255,255,255,0.6)'} />
              <Text style={[styles.tabBtnText, activeTab === 'recipes' && styles.tabBtnTextActive]}>
                Rețete Fitness
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'water' && styles.tabBtnActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab('water');
              }}
            >
              <Feather name="droplet" size={14} color={activeTab === 'water' ? '#0F172A' : 'rgba(255,255,255,0.6)'} />
              <Text style={[styles.tabBtnText, activeTab === 'water' && styles.tabBtnTextActive]}>
                Apă
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* TAB 1: JURNAL MESE & MACRONUTRIENTI (OpenNutriTracker) */}
        {activeTab === 'journal' && (
          <>
            {/* Card Sumar Calorii & Macro */}
            <View style={styles.card}>
              <View style={styles.summaryTop}>
                <View>
                  <Text style={styles.calRemainingNum}>{remainingCalories}</Text>
                  <Text style={styles.calRemainingLabel}>Calorii Rămase</Text>
                </View>

                <View style={styles.calDivider} />

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.calConsumedText}>
                    <Text style={{ color: '#10B981', fontWeight: 'bold' }}>{todayMacros.calories}</Text> / {calorieGoal} kcal
                  </Text>
                  <Text style={styles.calConsumedLabel}>Total consumat azi</Text>
                </View>
              </View>

              {/* Bare Progres Macronutrienti */}
              <View style={styles.macroBarsRow}>
                {/* Proteine */}
                <View style={styles.macroCol}>
                  <View style={styles.macroHeader}>
                    <Text style={[styles.macroName, { color: '#06B6D4' }]}>PROTEINE</Text>
                    <Text style={styles.macroValText}>{Math.round(todayMacros.protein)}/{targetProtein}g</Text>
                  </View>
                  <View style={styles.macroBarBg}>
                    <View style={[styles.macroBarFill, { width: `${Math.min(100, (todayMacros.protein / targetProtein) * 100)}%`, backgroundColor: '#06B6D4' }]} />
                  </View>
                </View>

                {/* Carbohidrati */}
                <View style={styles.macroCol}>
                  <View style={styles.macroHeader}>
                    <Text style={[styles.macroName, { color: '#F97316' }]}>CARBOHIDRAȚI</Text>
                    <Text style={styles.macroValText}>{Math.round(todayMacros.carbs)}/{targetCarbs}g</Text>
                  </View>
                  <View style={styles.macroBarBg}>
                    <View style={[styles.macroBarFill, { width: `${Math.min(100, (todayMacros.carbs / targetCarbs) * 100)}%`, backgroundColor: '#F97316' }]} />
                  </View>
                </View>

                {/* Grasimi */}
                <View style={styles.macroCol}>
                  <View style={styles.macroHeader}>
                    <Text style={[styles.macroName, { color: '#A855F7' }]}>GRĂSIMI</Text>
                    <Text style={styles.macroValText}>{Math.round(todayMacros.fat)}/{targetFat}g</Text>
                  </View>
                  <View style={styles.macroBarBg}>
                    <View style={[styles.macroBarFill, { width: `${Math.min(100, (todayMacros.fat / targetFat) * 100)}%`, backgroundColor: '#A855F7' }]} />
                  </View>
                </View>
              </View>
            </View>

            {/* Mesele Zilei */}
            {MEAL_CATEGORIES.map((meal) => {
              const items = todayFoodLogs.filter((f) => f.meal_type === meal);
              const mealCal = items.reduce((acc, cur) => acc + cur.calories, 0);

              return (
                <View key={meal} style={styles.mealSectionCard}>
                  <View style={styles.mealSectionHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.mealSectionTitle}>{meal}</Text>
                      <Text style={styles.mealCalTotal}>{mealCal > 0 ? `${mealCal} kcal` : ''}</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.addMealBtn}
                      onPress={() => handleOpenAddFood(meal)}
                    >
                      <Feather name="plus" size={14} color="#10B981" />
                      <Text style={styles.addMealBtnText}>Adaugă</Text>
                    </TouchableOpacity>
                  </View>

                  {items.length > 0 ? (
                    items.map((item) => (
                      <View key={item.id} style={styles.foodRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.loggedFoodName}>{item.name}</Text>
                          <Text style={styles.loggedFoodMacros}>
                            P: {item.protein}g • C: {item.carbs}g • G: {item.fat}g
                          </Text>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <Text style={styles.loggedFoodCal}>{item.calories} kcal</Text>
                          <TouchableOpacity
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              deleteFoodLog(item.id);
                            }}
                          >
                            <Feather name="trash-2" size={15} color="rgba(255,255,255,0.3)" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyMealText}>Niciun aliment înregistrat încă.</Text>
                  )}
                </View>
              );
            })}
          </>
        )}

        {/* TAB 2: REȚETE FITNESS (NutriTrace / Mealie Style) */}
        {activeTab === 'recipes' && (
          <View style={{ gap: 16 }}>
            {recipesData.map((recipe) => (
              <View key={recipe.id} style={styles.recipeCard}>
                <View style={styles.recipeTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recipeBadge}>{recipe.category.toUpperCase()}</Text>
                    <Text style={styles.recipeTitle}>{recipe.title}</Text>
                  </View>
                  <View style={styles.prepTimeRow}>
                    <Feather name="clock" size={12} color="rgba(255,255,255,0.5)" />
                    <Text style={styles.prepTimeText}>{recipe.prep_time_minutes} min</Text>
                  </View>
                </View>

                {/* Macro Chips */}
                <View style={styles.recipeMacroChips}>
                  <View style={styles.macroChip}><Text style={styles.macroChipText}>🔥 {recipe.calories} kcal</Text></View>
                  <View style={[styles.macroChip, { backgroundColor: 'rgba(6,182,212,0.15)' }]}><Text style={[styles.macroChipText, { color: '#06B6D4' }]}>P: {recipe.protein}g</Text></View>
                  <View style={[styles.macroChip, { backgroundColor: 'rgba(249,115,22,0.15)' }]}><Text style={[styles.macroChipText, { color: '#F97316' }]}>C: {recipe.carbs}g</Text></View>
                  <View style={[styles.macroChip, { backgroundColor: 'rgba(168,85,247,0.15)' }]}><Text style={[styles.macroChipText, { color: '#A855F7' }]}>G: {recipe.fat}g</Text></View>
                </View>

                {/* Ingrediente */}
                <Text style={styles.recipeSectionLabel}>Ingrediente:</Text>
                {recipe.ingredients.map((ing, iIdx) => (
                  <Text key={iIdx} style={styles.ingredientText}>• {ing}</Text>
                ))}

                {/* Buton Adaugă la Jurnal */}
                <TouchableOpacity
                  style={styles.logRecipeBtn}
                  onPress={() => handleLogRecipe(recipe)}
                  activeOpacity={0.8}
                >
                  <Feather name="plus-circle" size={16} color="#0F172A" />
                  <Text style={styles.logRecipeBtnText}>+ Înregistrează în Jurnalul de Azi</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* TAB 3: HIDRATARE */}
        {activeTab === 'water' && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Feather name="droplet" size={20} color="#06B6D4" />
              <Text style={styles.cardTitle}>Hidratare Zilnică</Text>
            </View>

            <View style={styles.centerProgress}>
              <CircularProgress
                value={todayWater}
                max={profile.water_goal}
                radius={75}
                strokeWidth={14}
                color="#06B6D4"
                backgroundColor="rgba(6, 182, 212, 0.15)"
                hideText={true}
              />
              <View style={styles.progressCenter}>
                <Text style={styles.progressValue}>{todayWater}</Text>
                <Text style={styles.progressSub}>/ {profile.water_goal} ml</Text>
              </View>
            </View>

            {/* Butoane Rapide */}
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
        )}
      </ScrollView>

      {/* Modal Adaugare Aliment */}
      <AddFoodModal
        visible={isAddFoodOpen}
        defaultMealType={selectedMealCategory}
        onClose={() => setIsAddFoodOpen(false)}
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
  header: {
    marginBottom: 18,
  },
  badge: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  title: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 14,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#1E293B',
    borderRadius: 10,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: '#10B981',
  },
  tabBtnText: {
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '700',
    fontSize: 12,
  },
  tabBtnTextActive: {
    color: '#0F172A',
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  calRemainingNum: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: 'bold',
  },
  calRemainingLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '600',
  },
  calDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  calConsumedText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  calConsumedLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
  },
  macroBarsRow: {
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 14,
  },
  macroCol: {
    gap: 4,
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroName: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  macroValText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  macroBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  mealSectionCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  mealSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  mealSectionTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  mealCalTotal: {
    color: '#10B981',
    fontWeight: '700',
    fontSize: 12,
  },
  addMealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  addMealBtnText: {
    color: '#10B981',
    fontWeight: '700',
    fontSize: 11,
  },
  foodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  loggedFoodName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  loggedFoodMacros: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
  },
  loggedFoodCal: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  emptyMealText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    fontStyle: 'italic',
  },
  recipeCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
  },
  recipeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  recipeBadge: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 2,
  },
  recipeTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  prepTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  prepTimeText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
  },
  recipeMacroChips: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  macroChip: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  macroChipText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  recipeSectionLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  ingredientText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    lineHeight: 18,
  },
  logRecipeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 14,
    gap: 6,
  },
  logRecipeBtnText: {
    color: '#0F172A',
    fontWeight: 'bold',
    fontSize: 13,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
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
    fontSize: 24,
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
});
