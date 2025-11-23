import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { CalendarComponent, Task } from '../components/CalendarComponent';
import { CreateEventComponent } from '../components/CreateEventComponent';
import { EditEventComponent } from '../components/EditEventComponent';
import { usePersistedEvents } from '../hooks/usePersistedEvents';
import { EVENTS, eventEmitter } from '../services/eventEmitter';
import { Task as TaskType, getTasks } from '../components/supabase';

export default function Calendar() {
	const { events, isLoading, addEvent, updateEvent, deleteEvent, refetchEvents } = usePersistedEvents();
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [showEditModal, setShowEditModal] = useState(false);
	const [selectedEvent, setSelectedEvent] = useState<Task | null>(null);
	const [tasks, setTasks] = useState<TaskType[]>([]);
	const [totalTaskCount, setTotalTaskCount] = useState(0);

	// Load tasks
	const loadTasks = async () => {
		const fetchedTasks = await getTasks();
		setTasks(fetchedTasks);
		// Calculate total incomplete tasks
		const incompleteCount = fetchedTasks.filter(t => !t.completed).length;
		setTotalTaskCount(incompleteCount);
	};

	useEffect(() => {
		loadTasks();
	}, []);

	// Listen for calendar updates from other components (e.g., AI chat)
	useEffect(() => {
		const handleCalendarUpdate = () => {
			console.log('[Calendar] Calendar updated event received, refetching...');
			refetchEvents();
			loadTasks();
		};

		eventEmitter.on(EVENTS.CALENDAR_UPDATED, handleCalendarUpdate);

		// Cleanup listener on unmount
		return () => {
			eventEmitter.off(EVENTS.CALENDAR_UPDATED, handleCalendarUpdate);
		};
	}, [refetchEvents]);

	// Refresh events when screen comes into focus (e.g., after adding via chat)
	useFocusEffect(
		React.useCallback(() => {
			refetchEvents();
			loadTasks();
		}, [])
	);

	const handleCreateEvent = async (newEvent: Task) => {
		await addEvent(newEvent);
		setShowCreateModal(false);
	};

	const handleEditEvent = (event: Task) => {
		setSelectedEvent(event);
		setShowEditModal(true);
	};

	const handleUpdateEvent = async (updatedEvent: Task) => {
		await updateEvent(updatedEvent.id, updatedEvent);
		setShowEditModal(false);
		setSelectedEvent(null);
	};

	const handleDeleteEvent = async (id: string) => {
		await deleteEvent(id);
		setShowEditModal(false);
		setSelectedEvent(null);
	};

	if (isLoading) {
		return (
			<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#25292e' }}>
				<ActivityIndicator size="large" color="#ffd33d" />
			</View>
		);
	}

	return (
		<View style={{ flex: 1 }}>
			<CalendarComponent 
				events={events}
				tasks={tasks}
				onAddButtonPress={() => setShowCreateModal(true)}
				onEditEvent={handleEditEvent}
			/>
			<CreateEventComponent
				visible={showCreateModal}
				onClose={() => setShowCreateModal(false)}
				onCreateEvent={handleCreateEvent}
			/>
			<EditEventComponent
				visible={showEditModal}
				event={selectedEvent}
				onClose={() => {
					setShowEditModal(false);
					setSelectedEvent(null);
				}}
				onUpdateEvent={handleUpdateEvent}
				onDeleteEvent={handleDeleteEvent}
			/>
		</View>
	);
};