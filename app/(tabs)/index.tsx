import { useState, useEffect } from 'react';
import {
  Text, View, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import SubjectProgress from '../components/SubjectProgress';

export default function Index() {
  const router = useRouter();
  const [loading, setLoading] = useState(true); // for checking login
  const [subjects, setSubjects] = useState([
    { subject: "Math", totalHours: 10, completedHours: 7 },
    { subject: "Science", totalHours: 5, completedHours: 2 },
  ]);

  const [modalVisible, setModalVisible] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newHours, setNewHours] = useState('');

  useEffect(() => {
    const checkLogin = async () => {
      const loggedIn = await AsyncStorage.getItem('loggedIn');
      if (!loggedIn) {
        router.replace('/login');
      } else {
        setLoading(false);
      }
    };
    checkLogin();
  }, []);

  if (loading) return null; // optional: add a loading spinner here

  const addSubject = () => {
    const hours = parseInt(newHours, 10);
    if (!newSubject.trim() || isNaN(hours) || hours <= 0) return;

    setSubjects([...subjects, { subject: newSubject.trim(), totalHours: hours, completedHours: 0 }]);
    setNewSubject('');
    setNewHours('');
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Current progress</Text>

      <ScrollView contentContainerStyle={styles.list}>
        {subjects.map((item, index) => (
          <SubjectProgress
            key={index}
            subject={item.subject}
            totalHours={item.totalHours}
            completedHours={item.completedHours}
            onPressCheck={() => {
              setSubjects(prev =>
                prev.map((s, i) =>
                  i === index
                    ? { ...s, completedHours: Math.min(s.completedHours + 1, s.totalHours) }
                    : s
                )
              );
            }}
            onLongPressCheck={() => {
              setSubjects(prev =>
                prev.map((s, i) =>
                  i === index
                    ? { ...s, completedHours: Math.max(s.completedHours - 1, 0) }
                    : s
                )
              );
            }}
          />
        ))}
      </ScrollView>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.addText}>+</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={{
          marginTop: 20,
          padding: 10,
          backgroundColor: 'red',
          borderRadius: 8,
          alignSelf: 'center',
        }}
        onPress={async () => {
          await AsyncStorage.removeItem('loggedIn');
          router.replace('/login');
        }}
        >
        <Text style={{ color: '#fff' }}>Log out</Text>
      </TouchableOpacity>


      {/* Add Subject Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Add New Subject</Text>

            <TextInput
              style={styles.input}
              placeholder="Subject name"
              placeholderTextColor="#aaa"
              value={newSubject}
              onChangeText={setNewSubject}
            />

            <TextInput
              style={styles.input}
              placeholder="Study hours required"
              placeholderTextColor="#aaa"
              value={newHours}
              onChangeText={setNewHours}
              keyboardType="numeric"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButton} onPress={addSubject}>
                <Text style={styles.modalButtonText}>Add</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#25292e' },
  title: { color: '#fff', fontSize: 22, marginTop: 15, marginBottom: 20, alignSelf: 'center' },
  list: { width: '100%', alignItems: 'center', paddingBottom: 80 },
  addButton: { position: 'absolute', bottom: 30, right: 30, backgroundColor: '#ffd33d', width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', elevation: 5 },
  addText: { fontSize: 34, fontWeight: 'bold', color: '#25292e', marginTop: -2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { width: '80%', backgroundColor: '#2f3542', padding: 20, borderRadius: 12 },
  modalTitle: { color: '#fff', fontSize: 20, marginBottom: 15 },
  input: { backgroundColor: '#1e272e', color: '#fff', padding: 10, borderRadius: 8, marginBottom: 15 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  modalButton: { backgroundColor: '#ffd33d', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  modalButtonText: { color: '#25292e', fontWeight: 'bold' },
});
