import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, ScrollView, ActivityIndicator } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { ExerciseItem } from '../lib/exerciseHelper';

interface ExerciseDetailModalProps {
  visible: boolean;
  exercise: ExerciseItem | null;
  images: string[];
  exerciseName: string;
  onClose: () => void;
}

export function ExerciseDetailModal({
  visible,
  exercise,
  images,
  exerciseName,
  onClose,
}: ExerciseDetailModalProps) {
  const [isImageLoading, setIsImageLoading] = useState(true);

  const gifUri = (exercise && exercise.gif_url) || images[0] || '';

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <Text style={styles.headerBadge}>{exercise?.category?.toUpperCase() || 'EXERCIȚIU'}</Text>
                <View style={styles.gifBadge}>
                  <Text style={styles.gifBadgeText}>GIF 3D</Text>
                </View>
              </View>
              <Text style={styles.headerTitle} numberOfLines={2}>
                {exercise?.name || exerciseName}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Feather name="x" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Vizualizare Animație GIF 3D */}
            <View style={styles.mediaContainer}>
              {gifUri ? (
                <View style={styles.imageWrapper}>
                  <Image
                    key={gifUri}
                    source={{ uri: gifUri }}
                    style={styles.exerciseImage}
                    resizeMode="contain"
                    onLoadStart={() => setIsImageLoading(true)}
                    onLoadEnd={() => setIsImageLoading(false)}
                  />
                  {isImageLoading && (
                    <View style={styles.loaderOverlay}>
                      <ActivityIndicator size="small" color="#10B981" />
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.noImage}>
                  <Feather name="activity" size={40} color="rgba(255,255,255,0.3)" />
                  <Text style={styles.noImageText}>Fără animație disponibilă</Text>
                </View>
              )}

              {/* Subtitlu & Legendă Anatomică */}
              <View style={styles.legendRow}>
                <View style={styles.legendDot} />
                <Text style={styles.legendText}>
                  Zona marcată cu <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>roșu</Text> reprezintă mușchii vizați
                </Text>
              </View>
            </View>

            {/* Informații Mușchi & Echipament */}
            <View style={styles.infoSection}>
              {exercise?.equipment && (
                <View style={styles.infoRow}>
                  <View style={styles.infoIconWrap}>
                    <Feather name="tool" size={16} color="#06B6D4" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoLabel}>ECHIPAMENT NECESAR</Text>
                    <Text style={styles.infoValue}>{exercise.equipment}</Text>
                  </View>
                </View>
              )}

              {exercise?.primary && (
                <View style={styles.infoRow}>
                  <View style={[styles.infoIconWrap, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
                    <Feather name="target" size={16} color="#10B981" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoLabel}>MUȘCHI PRINCIPAL VIZAT</Text>
                    <Text style={[styles.infoValue, { color: '#10B981', fontWeight: 'bold' }]}>
                      {exercise.primary}
                    </Text>
                  </View>
                </View>
              )}

              {exercise?.secondary && exercise.secondary.length > 0 && (
                <View style={styles.infoRow}>
                  <View style={[styles.infoIconWrap, { backgroundColor: 'rgba(249,115,22,0.15)' }]}>
                    <Feather name="layers" size={16} color="#F97316" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoLabel}>MUȘCHI SECUNDARI / STABILIZATORI</Text>
                    <View style={styles.tagsWrap}>
                      {exercise.secondary.map((sec, idx) => (
                        <View key={idx} style={styles.tagChip}>
                          <Text style={styles.tagText}>{sec}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              )}

              {/* Sfaturi de Execuție & Tehnică */}
              {exercise?.notes && (
                <View style={styles.notesBox}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <Feather name="check-circle" size={16} color="#10B981" />
                    <Text style={styles.notesTitle}>INDICAȚII & SFATURI BIOMECANICE</Text>
                  </View>
                  <Text style={styles.notesText}>{exercise.notes}</Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Buton Închide */}
          <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.doneBtnText}>Am Înțeles Forma Corectă</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    maxHeight: '90%',
    padding: 20,
    paddingBottom: 34,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerBadge: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  gifBadge: {
    backgroundColor: 'rgba(249,115,22,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gifBadgeText: {
    color: '#F97316',
    fontSize: 9,
    fontWeight: '900',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  mediaContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  imageWrapper: {
    width: '100%',
    height: 240,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseImage: {
    width: '100%',
    height: '100%',
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImage: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  noImageText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  legendText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
  },
  infoSection: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  infoIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(6,182,212,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    color: '#FFF',
    fontSize: 13,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  tagChip: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
  },
  notesBox: {
    backgroundColor: 'rgba(16,185,129,0.06)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.2)',
    padding: 14,
  },
  notesTitle: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  notesText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    lineHeight: 18,
  },
  doneBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  doneBtnText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
