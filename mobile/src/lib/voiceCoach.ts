import * as Speech from 'expo-speech';

let isVoiceEnabled = true;

export function setVoiceCoachEnabled(enabled: boolean) {
  isVoiceEnabled = enabled;
  if (!enabled) {
    Speech.stop();
  }
}

export function getVoiceCoachEnabled(): boolean {
  return isVoiceEnabled;
}

export function speakText(text: string) {
  if (!isVoiceEnabled) return;

  try {
    Speech.stop();
    Speech.speak(text, {
      language: 'ro-RO',
      pitch: 1.0,
      rate: 1.05,
    });
  } catch (err) {
    console.warn('Voice coach error:', err);
  }
}

export const VoiceCues = {
  fiveSecondsWarning: () => speakText('Pregătește-te. 5 secunde. Ia greutățile!'),
  restOver: (nextSetNum?: number) =>
    speakText(nextSetNum ? `Timpul a expirat. Începe seria ${nextSetNum}!` : 'Timpul a expirat. Începe seria!'),
  setDone: (setNum: number) => speakText(`Seria ${setNum} finalizată. Începe odihna.`),
  newPR: (exerciseName: string, weightKg: number) =>
    speakText(`Nou record personal la ${exerciseName}! ${weightKg} kilograme! Bravo!`),
  workoutFinished: () => speakText('Antrenament finalizat cu succes! O sesiune excelentă!'),
};
