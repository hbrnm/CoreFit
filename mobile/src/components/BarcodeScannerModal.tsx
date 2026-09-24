import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';
import { fetchProductByBarcode, RomanianFoodProduct } from '../lib/openFoodFacts';

interface BarcodeScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onProductFound: (product: RomanianFoodProduct) => void;
}

export function BarcodeScannerModal({ visible, onClose, onProductFound }: BarcodeScannerModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (!isScanning || isLoading) return;

    setIsScanning(false);
    setIsLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      const product = await fetchProductByBarcode(data);

      if (product) {
        onProductFound(product);
        onClose();
      } else {
        Alert.alert(
          'Produs Negăsit',
          `Codul de bare "${data}" nu a fost găsit în baza de date România / Open Food Facts. Poți adăuga produsul manual.`,
          [{ text: 'Reîncearcă', onPress: () => setIsScanning(true) }]
        );
      }
    } catch (e) {
      Alert.alert('Eroare', 'Nu s-a putut verifica codul de bare. Verifică conexiunea la internet.');
      setIsScanning(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
          >
            <Feather name="x" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scanare Cod de Bare</Text>
          <View style={{ width: 40 }} />
        </View>

        {!permission?.granted ? (
          <View style={styles.permissionBox}>
            <Feather name="camera" size={48} color="#10B981" style={{ marginBottom: 16 }} />
            <Text style={styles.permTitle}>Permisiune Cameră Necesară</Text>
            <Text style={styles.permDesc}>
              Aplicația are nevoie de acces la cameră pentru a citi codul de bare de pe ambalajul produselor alimentare.
            </Text>
            <TouchableOpacity style={styles.grantBtn} onPress={requestPermission}>
              <Text style={styles.grantBtnText}>Permite Accesul la Cameră</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cameraContainer}>
            <CameraView
              style={StyleSheet.absoluteFill}
              barcodeScannerSettings={{
                barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr'],
              }}
              onBarcodeScanned={isScanning ? handleBarcodeScanned : undefined}
            />

            {/* Target Reticle Overlay */}
            <View style={styles.overlay}>
              <View style={styles.reticle}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />

                {isLoading && (
                  <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" color="#10B981" />
                    <Text style={styles.loadingText}>Căutare produs în baza de date România...</Text>
                  </View>
                )}
              </View>

              <Text style={styles.tipText}>
                Îndreaptă camera spre codul de bare de pe ambalajul produsului
              </Text>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#0F172A',
    zIndex: 10,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  reticle: {
    width: 270,
    height: 180,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#10B981',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  loadingBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  tipText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginTop: 30,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  permissionBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  permTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  permDesc: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  grantBtn: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  grantBtnText: {
    color: '#0F172A',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
