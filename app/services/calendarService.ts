import AsyncStorage from '@react-native-async-storage/async-storage';

interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO date string: "2025-11-18"
  startHour: number;
  endHour: number;
  color: string;
}

const STORAGE_KEY = 'planpal_events';

const AVAILABLE_COLORS = [
  '#ff6b6b', // red
  '#4ecdc4', // teal
  '#45b7d1', // blue
  '#96ceb4', // green
  '#ffeaa7', // yellow
  '#fd79a8', // pink
  '#a29bfe', // purple
  '#fab1a0', // peach
  '#74b9ff', // light blue
  '#55efc4', // mint
];

const DEFAULT_DURATIONS: Record<string, number> = {
  breakfast: 1,
  lunch: 1,
  dinner: 1.5,
  meal: 1,
  meeting: 1,
  study: 2,
  studying: 2,
  gym: 1.5,
  workout: 1.5,
  class: 1.5,
  lecture: 1.5,
  coffee: 0.5,
  break: 0.5,
};

export async function getCalendarEvents(): Promise<CalendarEvent[]> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return [];
  } catch (error) {
    console.error('Failed to load calendar events:', error);
    return [];
  }
}

export async function addCalendarEvent(event: CalendarEvent): Promise<boolean> {
  try {
    const events = await getCalendarEvents();
    events.push(event);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    return true;
  } catch (error) {
    console.error('Failed to add calendar event:', error);
    return false;
  }
}

export async function deleteCalendarEvent(eventId: string): Promise<boolean> {
  try {
    const events = await getCalendarEvents();
    
    // Handle special case: "all" means delete everything
    if (eventId.toLowerCase() === 'all') {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      return true;
    }
    
    // Handle comma-separated list of IDs
    if (eventId.includes(',')) {
      const ids = eventId.split(',').map(id => id.trim());
      const filteredEvents = events.filter(e => !ids.includes(e.id));
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filteredEvents));
      return true;
    }
    
    // Handle single ID
    const filteredEvents = events.filter(e => e.id !== eventId);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filteredEvents));
    return true;
  } catch (error) {
    console.error('Failed to delete calendar event:', error);
    return false;
  }
}

export async function updateCalendarEvent(eventId: string, updates: Partial<CalendarEvent>): Promise<boolean> {
  try {
    const events = await getCalendarEvents();
    const updatedEvents = events.map(e => 
      e.id === eventId ? { ...e, ...updates } : e
    );
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedEvents));
    return true;
  } catch (error) {
    console.error('Failed to update calendar event:', error);
    return false;
  }
}

export interface EventConflict {
  hasConflict: boolean;
  conflictingEvents: CalendarEvent[];
  message?: string;
}

export function checkEventConflicts(
  date: string,
  startHour: number,
  endHour: number,
  existingEvents: CalendarEvent[],
  excludeEventId?: string
): EventConflict {
  const conflicts = existingEvents.filter(event => {
    // Skip if it's the same event (for updates)
    if (excludeEventId && event.id === excludeEventId) return false;
    
    // Only check events on the same date
    if (event.date !== date) return false;
    
    // Check for time overlap
    // Events overlap if: (start1 < end2) AND (start2 < end1)
    const hasOverlap = startHour < event.endHour && endHour > event.startHour;
    
    return hasOverlap;
  });

  if (conflicts.length > 0) {
    const conflictList = conflicts.map(e => `"${e.title}" (${formatTime(e.startHour)} - ${formatTime(e.endHour)})`).join(', ');
    return {
      hasConflict: true,
      conflictingEvents: conflicts,
      message: `This time slot conflicts with existing event(s): ${conflictList}. Please choose a different time or delete the conflicting event(s) first.`
    };
  }

  return {
    hasConflict: false,
    conflictingEvents: []
  };
}

export function findSimilarEventColor(title: string, existingEvents: CalendarEvent[]): string {
  const titleLower = title.toLowerCase();
  
  // Find events with similar keywords
  for (const event of existingEvents) {
    const eventTitleLower = event.title.toLowerCase();
    
    // Check for common words (excluding very common words)
    const titleWords = titleLower.split(/\s+/).filter(w => w.length > 3);
    const eventWords = eventTitleLower.split(/\s+/).filter(w => w.length > 3);
    
    for (const word of titleWords) {
      if (eventWords.includes(word)) {
        return event.color;
      }
    }
    
    // Check for category matches
    const categories = ['meeting', 'study', 'gym', 'lunch', 'dinner', 'breakfast', 'class', 'project', 'exam'];
    for (const category of categories) {
      if (titleLower.includes(category) && eventTitleLower.includes(category)) {
        return event.color;
      }
    }
  }
  
  // If no similar event found, return a random color
  return AVAILABLE_COLORS[Math.floor(Math.random() * AVAILABLE_COLORS.length)];
}

export function getDefaultDuration(title: string): number {
  const titleLower = title.toLowerCase();
  
  for (const [keyword, duration] of Object.entries(DEFAULT_DURATIONS)) {
    if (titleLower.includes(keyword)) {
      return duration;
    }
  }
  
  // Default duration if no match found
  return 1;
}

export function formatEventsForAI(events: CalendarEvent[]): string {
  if (events.length === 0) {
    return 'No calendar events scheduled yet.';
  }

  // Group events by date
  const eventsByDate = events.reduce((acc, event) => {
    if (!acc[event.date]) {
      acc[event.date] = [];
    }
    acc[event.date].push(event);
    return acc;
  }, {} as Record<string, CalendarEvent[]>);

  // Sort dates
  const sortedDates = Object.keys(eventsByDate).sort();

  // Format events
  let formattedText = 'USER\'S CALENDAR EVENTS:\n\n';
  
  sortedDates.forEach(date => {
    const dateObj = new Date(date + 'T00:00:00');
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    const formattedDate = dateObj.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
    
    formattedText += `${dayName}, ${formattedDate}:\n`;
    
    // Sort events by start time
    const sortedEvents = eventsByDate[date].sort((a, b) => a.startHour - b.startHour);
    
    sortedEvents.forEach(event => {
      const startTime = formatTime(event.startHour);
      const endTime = formatTime(event.endHour);
      formattedText += `  - [ID: ${event.id}] ${event.title}: ${startTime} - ${endTime}\n`;
    });
    
    formattedText += '\n';
  });

  formattedText += '\nNOTE: When deleting or updating events, use the ID shown in brackets [ID: xxx].';

  return formattedText;
}

function formatTime(hour: number): string {
  const hours = Math.floor(hour);
  const minutes = Math.round((hour - hours) * 60);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
  const displayMinutes = minutes.toString().padStart(2, '0');
  return `${displayHour}:${displayMinutes} ${period}`;
}
