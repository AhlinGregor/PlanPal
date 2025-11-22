import Chat from "@codsod/react-native-chat";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from 'react-native';
import { geminiService } from '../services/gemini';
import { ChatMessage, updateChatMessages } from './supabase';

interface ChatComponentProps {
  chatId: string | null;
  initialMessages?: ChatMessage[];
  onMessagesUpdate?: (messages: ChatMessage[]) => void;
  onTitleGenerated?: (title: string) => void;
}

export default function ChatComponent({ chatId, initialMessages = [], onMessagesUpdate, onTitleGenerated }: ChatComponentProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    // Only update if chatId changed (switching chats)
    setMessages(initialMessages);
  }, [chatId]);

  const onSendMessage = async (text: string) => {
    // Add user message
    const userMessage: ChatMessage = {
      _id: messages.length + 1,
      text,
      createdAt: new Date(),
      user: {
        _id: 1,
        name: "User",
      },
    };

    const updatedWithUser = [userMessage, ...messages];
    setMessages(updatedWithUser);
    
    // Generate title if this is the first message
    if (messages.length === 0 && onTitleGenerated) {
      geminiService.generateChatTitle(text).then(title => {
        onTitleGenerated(title);
      });
    }

    // Show typing indicator
    setIsTyping(true);

    try {
      // Get Gemini response
      const response = await geminiService.sendMessage(text);
      
      // Add Gemini's response
      const geminiMessage: ChatMessage = {
        _id: messages.length + 2,
        text: response,
        createdAt: new Date(),
        user: {
          _id: 2,
          name: "Gemini",
        },
      };

      const finalMessages = [geminiMessage, ...updatedWithUser];
      setMessages(finalMessages);
      
      if (chatId) {
        await updateChatMessages(chatId, finalMessages);
        onMessagesUpdate?.(finalMessages);
      }
    } catch (error) {
      console.error('Error getting Gemini response:', error);
      // Add error message
      const errorMessage: ChatMessage = {
        _id: messages.length + 2,
        text: "Sorry, I encountered an error. Please try again.",
        createdAt: new Date(),
        user: {
          _id: 2,
          name: "Gemini",
        },
      };
      const finalMessages = [errorMessage, ...updatedWithUser];
      setMessages(finalMessages);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      <Chat
        messages={messages}
        setMessages={(val) => onSendMessage(val)}
        themeColor="orange"
        themeTextColor="white"
        showSenderAvatar={false}
        showReceiverAvatar={true}
        inputBorderColor="orange"
        user={{
          _id: 1,
          name: "User",
        }}
        backgroundColor="#25292e"
        inputBackgroundColor="white"
        placeholder="Enter Your Message"
        placeholderColor="gray"
        showEmoji={true}
        onPressEmoji={() => console.log("Emoji Button Pressed..")}
        showAttachment={true}
        onPressAttachment={() => console.log("Attachment Button Pressed..")}
        timeContainerColor="red"
        timeContainerTextColor="white"
      />
      {isTyping && (
        <View style={{
          position: 'absolute',
          bottom: 80,
          left: 20,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#1a1d21',
          padding: 10,
          borderRadius: 20,
        }}>
          <ActivityIndicator size="small" color="orange" />
        </View>
      )}
    </>
  );
}
