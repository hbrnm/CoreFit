import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Line } from 'react-native-svg';

export interface ChartDataPoint {
  label: string;
  value: number;
}

interface LineChartProps {
  data: ChartDataPoint[];
  height?: number;
  color?: string;
  unit?: string;
}

export function LineChart({
  data,
  height = 140,
  color = '#10B981',
  unit = '',
}: LineChartProps) {
  if (!data || data.length === 0) {
    return (
      <View style={[styles.emptyContainer, { height }]}>
        <Text style={styles.emptyText}>Nu există suficiente date pentru grafic.</Text>
      </View>
    );
  }

  // Latimea dinamica a graficului
  const screenWidth = Dimensions.get('window').width - 64; // padding
  const paddingX = 15;
  const paddingY = 20;
  const chartWidth = screenWidth - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal === minVal ? 1 : maxVal - minVal;

  // Calculam coordonatele punctelor
  const points = data.map((d, index) => {
    const x = paddingX + (index / (data.length - 1 || 1)) * chartWidth;
    const y = paddingY + chartHeight - ((d.value - minVal) / range) * chartHeight;
    return { x, y, ...d };
  });

  // Construim calea SVG (curba)
  const pathD = points.reduce((acc, p, idx) => {
    if (idx === 0) return `M ${p.x} ${p.y}`;
    // Curba bezier cubica lina
    const prev = points[idx - 1];
    const cpx1 = prev.x + (p.x - prev.x) / 2;
    const cpy1 = prev.y;
    const cpx2 = prev.x + (p.x - prev.x) / 2;
    const cpy2 = p.y;
    return `${acc} C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${p.x} ${p.y}`;
  }, '');

  // Calea pentru zona umpluta cu gradient de sub grafic
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - 5} L ${points[0].x} ${height - 5} Z`;

  return (
    <View style={styles.container}>
      {/* Header cu Min si Max */}
      <View style={styles.legendRow}>
        <Text style={styles.legendText}>Min: <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{minVal}{unit}</Text></Text>
        <Text style={styles.legendText}>Max: <Text style={{ color: color, fontWeight: 'bold' }}>{maxVal}{unit}</Text></Text>
      </View>

      <Svg width={screenWidth} height={height}>
        <Defs>
          <LinearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.25" />
            <Stop offset="1" stopColor={color} stopOpacity="0.0" />
          </LinearGradient>
        </Defs>

        {/* Linii orizontale de ghidaj */}
        <Line x1={paddingX} y1={paddingY} x2={screenWidth - paddingX} y2={paddingY} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
        <Line x1={paddingX} y1={paddingY + chartHeight / 2} x2={screenWidth - paddingX} y2={paddingY + chartHeight / 2} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
        <Line x1={paddingX} y1={height - 10} x2={screenWidth - paddingX} y2={height - 10} stroke="rgba(255,255,255,0.06)" />

        {/* Zona cu gradient */}
        <Path d={areaD} fill="url(#chartGradient)" />

        {/* Linia principala */}
        <Path d={pathD} stroke={color} strokeWidth={3} fill="none" strokeLinecap="round" />

        {/* Puncte pe grafic */}
        {points.map((p, idx) => (
          <Circle
            key={idx}
            cx={p.x}
            cy={p.y}
            r={idx === points.length - 1 ? 5 : 3.5}
            fill={color}
            stroke="#0F172A"
            strokeWidth={2}
          />
        ))}
      </Svg>

      {/* Etichete Axa X */}
      <View style={[styles.xLabelsRow, { width: screenWidth }]}>
        {points.map((p, idx) => (
          <Text key={idx} style={styles.xLabelText}>{p.label}</Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    alignItems: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 8,
    marginBottom: 6,
  },
  legendText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '600',
  },
  xLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginTop: 4,
  },
  xLabelText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
  },
});
