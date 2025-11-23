import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Task {
	id: string;
	title: string;
	date: string; // ISO date string: "2025-11-18"
	startHour: number;
	endHour: number;
	color: string;
}

const STORAGE_KEY = 'planpal_events';

// Helper to get date string for current week
function getDateString(weekStart: Date, dayOffset: number): string {
	const date = new Date(weekStart);
	date.setDate(weekStart.getDate() + dayOffset);
	return date.toISOString().split('T')[0];
}

function getMonday(date: Date) {
	const d = new Date(date);
	const day = d.getDay();
	const diff = d.getDate() - day + (day === 0 ? -6 : 1);
	return new Date(d.setDate(diff));
}

const currentMonday = getMonday(new Date());

const DEFAULT_EVENTS: Task[] = [
	{ id: '1', title: 'Team Meeting', date: getDateString(currentMonday, 0), startHour: 9, endHour: 10, color: '#ff6b6b' },
	{ id: '2', title: 'Study Math', date: getDateString(currentMonday, 1), startHour: 14, endHour: 16, color: '#4ecdc4' },
	{ id: '3', title: 'Project Work', date: getDateString(currentMonday, 2), startHour: 10, endHour: 13, color: '#45b7d1' },
	{ id: '4', title: 'Gym', date: getDateString(currentMonday, 3), startHour: 18, endHour: 19.5, color: '#96ceb4' },
	{ id: '5', title: 'Science Lab', date: getDateString(currentMonday, 4), startHour: 13, endHour: 15, color: '#ffeaa7' },
];

export function usePersistedEvents() {
	const [events, setEvents] = useState<Task[]>(DEFAULT_EVENTS);
	const [isLoading, setIsLoading] = useState(true);

	// Load events from AsyncStorage on mount
	useEffect(() => {
		loadEvents();
	}, []);

	const loadEvents = async () => {
		try {
			const stored = await AsyncStorage.getItem(STORAGE_KEY);
			if (stored) {
				const parsedEvents = JSON.parse(stored);
				
				// Migrate old events that have 'duration' instead of 'endHour'
				// OR 'day' (0-6) instead of 'date' (ISO string)
				const migratedEvents = parsedEvents.map((event: any) => {
					let migratedEvent = { ...event };
					
					// Migrate duration -> endHour
					if (event.duration !== undefined && event.endHour === undefined) {
						migratedEvent.endHour = event.startHour + event.duration;
						delete migratedEvent.duration;
					}
					
					// Migrate day (0-6) -> date (ISO string)
					if (event.day !== undefined && event.date === undefined) {
						// Convert old day-of-week to actual date in current week
						const monday = getMonday(new Date());
						const eventDate = new Date(monday);
						eventDate.setDate(monday.getDate() + event.day);
						migratedEvent.date = eventDate.toISOString().split('T')[0];
						delete migratedEvent.day;
					}
					
					return migratedEvent;
				});
				
				setEvents(migratedEvents);
				
				// Save migrated events back to storage
				if (parsedEvents.some((e: any) => e.duration !== undefined || e.day !== undefined)) {
					await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(migratedEvents));
				}
			}
		} catch (error) {
			console.error('Failed to load events:', error);
		} finally {
			setIsLoading(false);
		}
	};

	const saveEvents = async (newEvents: Task[]) => {
		try {
			await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newEvents));
			setEvents(newEvents);
		} catch (error) {
			console.error('Failed to save events:', error);
		}
	};

	const addEvent = async (newEvent: Task) => {
		const updated = [...events, newEvent];
		await saveEvents(updated);
	};

	const updateEvent = async (id: string, updatedEvent: Task) => {
		const updated = events.map(event => (event.id === id ? updatedEvent : event));
		await saveEvents(updated);
	};

	const deleteEvent = async (id: string) => {
		const updated = events.filter(event => event.id !== id);
		await saveEvents(updated);
	};

	const clearAllEvents = async () => {
		try {
			await AsyncStorage.removeItem(STORAGE_KEY);
			setEvents([]); // Empty array instead of DEFAULT_EVENTS
		} catch (error) {
			console.error('Failed to clear events:', error);
		}
	};

	const refetchEvents = async () => {
		await loadEvents();
	};

	return {
		events,
		isLoading,
		addEvent,
		updateEvent,
		deleteEvent,
		clearAllEvents,
		refetchEvents,
	};
}
