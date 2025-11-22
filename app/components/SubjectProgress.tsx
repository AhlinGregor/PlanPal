import { View, Text, StyleSheet } from 'react-native';
import { AnimatedCircularProgress } from 'react-native-circular-progress';

type SubjectProgressProps = {
  subject: string;
  percent: number;
};

export default function SubjectProgress({ subject, percent }: SubjectProgressProps) {
  return (
    <View style={styles.row}>
      {/* Subject name */}
      <Text style={styles.subjectText}>{subject}</Text>

      {/* Gauge */}
      <AnimatedCircularProgress
        size={60}
        width={8}
        fill={percent}
        tintColor="#ffd33d"
        backgroundColor="#3d5875"
        rotation={0}
        lineCap="round"
      >
        {(fill: number) => (
          <Text style={styles.percentText}>{Math.round(fill)}%</Text>
        )}
      </AnimatedCircularProgress>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '90%',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: '#2f3542',
    borderRadius: 12,
    marginVertical: 10,
  },
  subjectText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  percentText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 2,
  },
});
