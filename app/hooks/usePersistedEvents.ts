import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
	getEvents, 
	createEvent, 
	updateEvent as updateEventDB, 
	deleteEvent as deleteEventDB, 
	clearAllEvents as clearAllEventsDB,
	CalendarEvent 
} from '../components/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Task {
	id: string;
	title: string;
	date: string; // ISO date string: "2025-11-18"
	startHour: number;
	endHour: number;
	color: string;
}

const STORAGE_KEY = 'planpal_events';
const MIGRATION_KEY = 'planpal_events_migrated';

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

// Convert CalendarEvent (snake_case) to Task (camelCase)
function convertToTask(event: CalendarEvent): Task {
	return {
		id: event.id,
		title: event.title,
		date: event.date,
		startHour: event.start_hour,
		endHour: event.end_hour,
		color: event.color,
	};
}

// Convert Task (camelCase) to CalendarEvent format (snake_case)
function convertToCalendarEvent(task: Task): Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at' | 'user_id'> {
	return {
		title: task.title,
		date: task.date,
		start_hour: task.startHour,
		end_hour: task.endHour,
		color: task.color,
	};
}

export function usePersistedEvents() {
	const [events, setEvents] = useState<Task[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const { user } = useAuth();

	// Load events and migrate from AsyncStorage if needed
	useEffect(() => {
		if (user) {
			loadEvents();
		} else {
			setEvents([]);
			setIsLoading(false);
		}
	}, [user]);

	const loadEvents = async () => {
		try {
			// Check if migration has been done for this user
			const migrationKey = `${MIGRATION_KEY}_${user?.id}`;
			const hasMigrated = await AsyncStorage.getItem(migrationKey);

			// If not migrated, migrate local data to Supabase
			if (!hasMigrated) {
				await migrateLocalEventsToSupabase();
				await AsyncStorage.setItem(migrationKey, 'true');
			}

			// Load events from Supabase
			const dbEvents = await getEvents();
			const tasks = dbEvents.map(convertToTask);
			setEvents(tasks);
		} catch (error) {
			console.error('Failed to load events:', error);
		} finally {
			setIsLoading(false);
		}
	};

	const migrateLocalEventsToSupabase = async () => {
		try {
			const stored = await AsyncStorage.getItem(STORAGE_KEY);
			if (!stored) return;

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
					const monday = getMonday(new Date());
					const eventDate = new Date(monday);
					eventDate.setDate(monday.getDate() + event.day);
					migratedEvent.date = eventDate.toISOString().split('T')[0];
					delete migratedEvent.day;
				}
				
				return migratedEvent;
			});

			// Upload all migrated events to Supabase
			for (const event of migratedEvents) {
				await createEvent(convertToCalendarEvent(event));
			}

			console.log(`Migrated ${migratedEvents.length} events to Supabase`);
		} catch (error) {
			console.error('Failed to migrate events:', error);
		}
	};

	const addEvent = async (newEvent: Task) => {
		try {
			const dbEvent = await createEvent(convertToCalendarEvent(newEvent));
			if (dbEvent) {
				const task = convertToTask(dbEvent);
				setEvents(prev => [...prev, task]);
			}
		} catch (error) {
			console.error('Failed to add event:', error);
		}
	};

	const updateEvent = async (id: string, updatedEvent: Task) => {
		try {
			const success = await updateEventDB(id, convertToCalendarEvent(updatedEvent));
			if (success) {
				setEvents(prev => prev.map(event => (event.id === id ? updatedEvent : event)));
			}
		} catch (error) {
			console.error('Failed to update event:', error);
		}
	};

	const deleteEvent = async (id: string) => {
		try {
			const success = await deleteEventDB(id);
			if (success) {
				setEvents(prev => prev.filter(event => event.id !== id));
			}
		} catch (error) {
			console.error('Failed to delete event:', error);
		}
	};

	const clearAllEvents = async () => {
		try {
			const success = await clearAllEventsDB();
			if (success) {
				setEvents([]);
			}
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
