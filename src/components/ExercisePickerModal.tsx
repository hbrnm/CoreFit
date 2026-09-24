import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, FlatList } from 'react-native';
import { Image } from 'expo-image';
import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';
import exercisesList from '../data/exercises.json';
import { ExerciseItem, LOCAL_EXERCISE_GIFS } from '../lib/exerciseHelper';
export { ExerciseItem };
import { ExerciseDetailModal } from './ExerciseDetailModal';

interface ExercisePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectExercise: (exercise: ExerciseItem) => void;
}

const CATEGORIES = ['Toate', 'Piept', 'Spate', 'Umeri', 'Picioare', 'Brațe', 'Abdomen'];

export function ExercisePickerModal({ visible, onClose, onSelectExercise }: ExercisePickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Toate');
  const [detailExercise, setDetailExercise] = useState<ExerciseItem | null>(null);

  const typedList = exercisesList as ExerciseItem[];

  const filteredExercises = typedList.filter((ex) => {
    const matchesSearch =
      ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.primary.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Toate' || ex.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSelect = (item: ExerciseItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectExercise(item);
    onClose();
  };

  const handleOpenDetail = (item: ExerciseItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDetailExercise(item);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Feather name="book-open" size={22} color="#10B981" />
              <Text style={styles.title}>Bază de Date Exerciții</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchBar}>
            <Feather name="search" size={18} color="rgba(255,255,255,0.4)" />
            <TextInput
              style={styles.searchInput}
              placeholder="Caută exercițiu sau grupă..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Feather name="x-circle" size={16} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            )}
          </View>

          {/* Categorii Chip Carousel */}
          <View style={styles.catRow}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={CATEGORIES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const isActive = selectedCategory === item;
                return (
                  <TouchableOpacity
                    style={[styles.catChip, isActive && styles.catChipActive]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedCategory(item);
                    }}
                  >
                    <Text style={[styles.catText, isActive && styles.catTextActive]}>{item}</Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>

          {/* Lista Exercitii */}
          <FlatList
            data={filteredExercises}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={({ item }) => {
              const localSource = LOCAL_EXERCISE_GIFS[item.id] || (item.images && item.images.length > 0 ? { uri: item.images[0] } : null);

              return (
                <TouchableOpacity
                  style={styles.exerciseCard}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardContentRow}>
                    {/* Thumbnail Ilustrație Exercițiu Fluidă */}
                    {localSource ? (
                      <TouchableOpacity
                        style={styles.thumbWrapper}
                        onPress={() => handleOpenDetail(item)}
                        activeOpacity={0.8}
                      >
                        <Image
                          source={localSource}
                          style={styles.thumbImage}
                          contentFit="contain"
                          autoplay={true}
                          cachePolicy="memory-disk"
                        />
                        <View style={styles.thumbZoomBadge}>
                          <Feather name="maximize-2" size={10} color="#0F172A" />
                        </View>
                      </TouchableOpacity>
                    ) : (
                      <View style={[styles.thumbWrapper, styles.thumbPlaceholder]}>
                        <Feather name="activity" size={20} color="rgba(255,255,255,0.4)" />
                      </View>
                    )}

                    <View style={{ flex: 1 }}>
                      <View style={styles.exTop}>
                        <Text style={styles.exName} numberOfLines={2}>{item.name}</Text>
                      </View>

                      <View style={styles.metaRow}>
                        <Text style={styles.exPrimary}>🎯 {item.primary}</Text>
                        <View style={styles.equipBadge}>
                          <Text style={styles.equipText}>{item.equipment}</Text>
                        </View>
                      </View>

                      <Text style={styles.exNotes} numberOfLines={1}>💡 {item.notes}</Text>
                    </View>

                    {/* Buton Info (i) */}
                    <TouchableOpacity
                      style={styles.infoBtn}
                      onPress={() => handleOpenDetail(item)}
                    >
                      <Feather name="info" size={18} color="#10B981" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Niciun exercițiu găsit pentru căutarea ta.</Text>
              </View>
            }
          />
        </View>
      </View>

      {/* Modal Detaliu Exercițiu cu Ilustrații & Animație Formă Fluidă */}
      <ExerciseDetailModal
        visible={!!detailExercise}
        exercise={detailExercise}
        images={detailExercise?.images || []}
        exerciseName={detailExercise?.name || ''}
        source={detailExercise ? LOCAL_EXERCISE_GIFS[detailExercise.id] : undefined}
        onClose={() => setDetailExercise(null)}
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
    marginBottom: 16,
  },
  title: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
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
  catRow: {
    marginBottom: 16,
    maxHeight: 38,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    marginRight: 8,
  },
  catChipActive: {
    backgroundColor: '#10B981',
  },
  catText: {
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
    fontSize: 13,
  },
  catTextActive: {
    color: '#0F172A',
    fontWeight: 'bold',
  },
  exerciseCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  exTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  exName: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
    flex: 1,
  },
  equipBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  equipText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '700',
  },
  exPrimary: {
    color: '#06B6D4',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  exNotes: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    lineHeight: 15,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    textAlign: 'center',
  },
  cardContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumbWrapper: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    backgroundColor: '#1E293B',
  },
  thumbZoomBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 6,
    padding: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  infoBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(16,185,129,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
