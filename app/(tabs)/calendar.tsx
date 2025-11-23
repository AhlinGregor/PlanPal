import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { CalendarComponent, Task } from '../components/CalendarComponent';
import { CreateEventComponent } from '../components/CreateEventComponent';
import { EditEventComponent } from '../components/EditEventComponent';
import { usePersistedEvents } from '../hooks/usePersistedEvents';
import { EVENTS, eventEmitter } from '../services/eventEmitter';

export default function Calendar() {
	const { events, isLoading, addEvent, updateEvent, deleteEvent, refetchEvents } = usePersistedEvents();
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [showEditModal, setShowEditModal] = useState(false);
	const [selectedEvent, setSelectedEvent] = useState<Task | null>(null);

	// Listen for calendar updates from other components (e.g., AI chat)
	useEffect(() => {
		const handleCalendarUpdate = () => {
			console.log('[Calendar] Calendar updated event received, refetching...');
			refetchEvents();
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
}