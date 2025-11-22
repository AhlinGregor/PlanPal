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
