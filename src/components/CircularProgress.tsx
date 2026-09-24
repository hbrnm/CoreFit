import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface CircularProgressProps {
  value: number;
  max: number;
  radius?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
}

export function CircularProgress({
  value,
  max,
  radius = 60,
  strokeWidth = 12,
  color = '#10B981',
  backgroundColor = 'rgba(16, 185, 129, 0.15)',
  hideText = false
}: CircularProgressProps & { hideText?: boolean }) {
  const innerRadius = radius - strokeWidth / 2;
  const circumference = 2 * Math.PI * innerRadius;
  
  // Calculate percentage (capped at 100%)
  const percentage = Math.min(value / max, 1);
  const strokeDashoffset = circumference - percentage * circumference;

  return (
    <View style={{ width: radius * 2, height: radius * 2, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={radius * 2} height={radius * 2} style={{ position: 'absolute' }}>
        {/* Background Circle */}
        <Circle
          cx={radius}
          cy={radius}
          r={innerRadius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Foreground Animated Circle */}
        <Circle
          cx={radius}
          cy={radius}
          r={innerRadius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          transform={`rotate(-90 ${radius} ${radius})`}
        />
      </Svg>
      {/* Center Content */}
      {!hideText && (
        <View style={styles.centerText}>
          <Text style={styles.valueText}>{value}</Text>
          <Text style={styles.labelText}>/ {max / 1000}k</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centerText: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  labelText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '600',
  }
});
