import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ChatComponent from '../components/ChatComponent';
import { Chat, ChatMessage, createChat, getChatHistory, updateChatTitle } from '../components/supabase';

export default function Pal() {
  const [chatHistory, setChatHistory] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChatHistory();
  }, []);

  const loadChatHistory = async () => {
    setLoading(true);
    const history = await getChatHistory();
    setChatHistory(history);
    setLoading(false);
  };

  const handleNewChat = async () => {
    const newChat = await createChat();
    if (newChat) {
      setChatHistory([newChat, ...chatHistory]);
      setSelectedChat(newChat);
    }
  };

  const handleSelectChat = (chat: Chat) => {
    setSelectedChat(chat);
  };

  const handleMessagesUpdate = (messages: ChatMessage[]) => {
    if (selectedChat) {
      const updatedChat = { ...selectedChat, messages };
      setSelectedChat(updatedChat);
      setChatHistory(chatHistory.map(c => c.id === updatedChat.id ? updatedChat : c));
    }
  };

  const handleTitleGenerated = async (title: string) => {
    if (selectedChat) {
      const success = await updateChatTitle(selectedChat.id, title);
      if (success) {
        const updatedChat = { ...selectedChat, title };
        setSelectedChat(updatedChat);
        setChatHistory(chatHistory.map(c => c.id === updatedChat.id ? updatedChat : c));
      }
    }
  };

  if (selectedChat) {
    return (
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={100}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedChat(null)} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{selectedChat.title}</Text>
        </View>
        <ChatComponent 
          chatId={selectedChat.id} 
          initialMessages={selectedChat.messages}
          onMessagesUpdate={handleMessagesUpdate}
          onTitleGenerated={handleTitleGenerated}
        />
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>Chat History</Text>
        <TouchableOpacity onPress={handleNewChat} style={styles.newChatButton}>
          <Text style={styles.newChatText}>+ New Chat</Text>
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <ActivityIndicator size="large" color="orange" style={styles.loader} />
      ) : chatHistory.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No chats yet. Start a new chat!</Text>
        </View>
      ) : (
        <FlatList
          data={chatHistory}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.chatItem}
              onPress={() => handleSelectChat(item)}
            >
              <Text style={styles.chatTitle}>{item.title}</Text>
              <Text style={styles.chatPreview}>
                {item.messages.length > 0 
                  ? item.messages[0].text.substring(0, 50) + (item.messages[0].text.length > 50 ? '...' : '')
                  : 'No messages yet'}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: '#25292e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1a1d21',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    marginRight: 12,
  },
  backText: {
    color: 'orange',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1a1d21',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  historyTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  newChatButton: {
    backgroundColor: 'orange',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  newChatText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
  },
  chatItem: {
    backgroundColor: '#1a1d21',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: 'orange',
  },
  chatTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  chatPreview: {
    color: '#888',
    fontSize: 14,
  },
});