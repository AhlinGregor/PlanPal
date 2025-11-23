import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export interface ChatMessage {
  _id: number;
  text: string;
  createdAt: Date;
  user: {
    _id: number;
    name: string;
  };
}

export interface Chat {
  id: string;
  title: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export async function createChat(title: string = 'New Chat'): Promise<Chat | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('No user logged in');
      return null;
    }

    const { data, error } = await supabase
      .from('chats')
      .insert([
        {
          title,
          messages: [],
          user_id: user.id,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating chat:', error);
    return null;
  }
}

export async function getChatHistory(): Promise<Chat[]> {
  try {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return [];
  }
}

export async function getChat(chatId: string): Promise<Chat | null> {
  try {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('id', chatId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching chat:', error);
    return null;
  }
}

export async function updateChatMessages(
  chatId: string,
  messages: ChatMessage[]
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('chats')
      .update({
        messages,
        updated_at: new Date().toISOString(),
      })
      .eq('id', chatId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating chat messages:', error);
    return false;
  }
}

export async function updateChatTitle(
  chatId: string,
  title: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('chats')
      .update({
        title,
        updated_at: new Date().toISOString(),
      })
      .eq('id', chatId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating chat title:', error);
    return false;
  }
}

export async function deleteChat(chatId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('chats')
      .delete()
      .eq('id', chatId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting chat:', error);
    return false;
  }
}

// Event types and functions
export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO date string: "2025-11-18"
  start_hour: number;
  end_hour: number;
  color: string;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
}

export async function createEvent(event: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at' | 'user_id'>): Promise<CalendarEvent | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('No user logged in');
      return null;
    }

    const { data, error } = await supabase
      .from('events')
      .insert([
        {
          title: event.title,
          date: event.date,
          start_hour: event.start_hour,
          end_hour: event.end_hour,
          color: event.color,
          user_id: user.id,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    
    // Transform snake_case to camelCase for consistency with existing code
    return {
      id: data.id,
      title: data.title,
      date: data.date,
      start_hour: data.start_hour,
      end_hour: data.end_hour,
      color: data.color,
      created_at: data.created_at,
      updated_at: data.updated_at,
      user_id: data.user_id,
    };
  } catch (error) {
    console.error('Error creating event:', error);
    return null;
  }
}

export async function getEvents(): Promise<CalendarEvent[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('No user logged in');
      return [];
    }

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: true })
      .order('start_hour', { ascending: true });

    if (error) throw error;
    
    // Transform snake_case to camelCase
    return (data || []).map(event => ({
      id: event.id,
      title: event.title,
      date: event.date,
      start_hour: event.start_hour,
      end_hour: event.end_hour,
      color: event.color,
      created_at: event.created_at,
      updated_at: event.updated_at,
      user_id: event.user_id,
    }));
  } catch (error) {
    console.error('Error fetching events:', error);
    return [];
  }
}

export async function updateEvent(
  eventId: string,
  updates: Partial<Omit<CalendarEvent, 'id' | 'created_at' | 'user_id'>>
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('No user logged in');
      return false;
    }

    const { error } = await supabase
      .from('events')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', eventId)
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating event:', error);
    return false;
  }
}

export async function deleteEvent(eventId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('No user logged in');
      return false;
    }

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting event:', error);
    return false;
  }
}

export async function clearAllEvents(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('No user logged in');
      return false;
    }

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error clearing all events:', error);
    return false;
  }
}
