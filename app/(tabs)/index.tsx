import { useState } from 'react';
import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput
} from 'react-native';
import { Link } from 'expo-router';
import SubjectProgress from '../components/SubjectProgress';

export default function Index() {
  const [subjects, setSubjects] = useState([
    { subject: "Math", percent: 70 },
    { subject: "Science", percent: 40 },
  ]);

  const [modalVisible, setModalVisible] = useState(false);
  const [newSubject, setNewSubject] = useState('');

  const addSubject = () => {
    if (!newSubject.trim()) return;

    setSubjects([...subjects, { subject: newSubject.trim(), percent: 0 }]);
    setNewSubject('');
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
            percent={item.percent}
          />
        ))}
      </ScrollView>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.addText}>+</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
      >
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

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButton} onPress={addSubject}>
                <Text style={styles.modalButtonText}>Add</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton]}
                onPress={() => setModalVisible(false)}
              >
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
  container: {
    flex: 1,
    backgroundColor: '#25292e',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 22,
    marginTop: 15,
    marginBottom: 20,
  },
  list: {
    alignItems: 'center',
    paddingBottom: 80,
  },

  // Floating + button
  addButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    backgroundColor: '#ffd33d',
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
  addText: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#25292e',
    marginTop: -2,
  },

  // Modal styling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    width: '80%',
    backgroundColor: '#2f3542',
    padding: 20,
    borderRadius: 12,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    marginBottom: 15,
  },
  input: {
    backgroundColor: '#1e272e',
    color: '#fff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    backgroundColor: '#ffd33d',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalButtonText: {
    color: '#25292e',
    fontWeight: 'bold',
  },

  link: {
    marginTop: 20,
    color: '#fff',
    textDecorationLine: 'underline',
  },
});
