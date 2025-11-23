import Chat from "@codsod/react-native-chat";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from 'react-native';
import { 
  addCalendarEvent, 
  checkEventConflicts, 
  deleteCalendarEvent, 
  findSimilarEventColor, 
  formatEventsForAI, 
  getCalendarEvents, 
  updateCalendarEvent 
} from '../services/calendarService';
import { EVENTS, eventEmitter } from '../services/eventEmitter';
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
  const previousChatId = React.useRef<string | null>(null);

  useEffect(() => {
    console.log('[ChatComponent] useEffect triggered - chatId:', chatId, 'previousChatId:', previousChatId.current);
    
    // Only reset messages when chatId actually changes (switching chats)
    // Don't reset on every initialMessages prop change (which happens after onMessagesUpdate)
    if (chatId !== previousChatId.current) {
      console.log('[ChatComponent] ChatId changed, resetting messages');
      setMessages(initialMessages);
      previousChatId.current = chatId;
      
      // Load calendar events and set context only when switching chats
      loadCalendarContext();
    }
  }, [chatId]); // Only depend on chatId, NOT initialMessages!

  const loadCalendarContext = async () => {
    try {
      console.log('[ChatComponent] Loading calendar context...');
      const events = await getCalendarEvents();
      const formattedEvents = formatEventsForAI(events);
      geminiService.setCalendarContext(formattedEvents);
      console.log('[ChatComponent] Calendar context loaded with', events.length, 'events');
    } catch (error) {
      console.error('Error loading calendar context:', error);
    }
  };

  const onSendMessage = async (text: string) => {
    console.log('[ChatComponent] onSendMessage called, current messages count:', messages.length);
    
    // Add user message
    const userMessage: ChatMessage = {
      _id: Date.now(), // Use timestamp for unique ID
      text,
      createdAt: new Date(),
      user: {
        _id: 1,
        name: "User",
      },
    };

    const updatedWithUser = [userMessage, ...messages];
    console.log('[ChatComponent] Setting messages with user message, new count:', updatedWithUser.length);
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
      // Get Gemini response with function call handler
      console.log('[ChatComponent] Starting sendMessage...');
      const responseText = await geminiService.sendMessage(text, async (functionName, params) => {
        console.log('[ChatComponent] Function callback triggered:', functionName, 'with params:', params);
        
        // Handle createCalendarEvent
        if (functionName === 'createCalendarEvent') {
          const { title, dates, date, startHour, endHour } = params;
          
          // Support both old format (single date) and new format (array of dates)
          let dateArray: string[];
          if (dates) {
            dateArray = Array.isArray(dates) ? dates : [dates];
          } else if (date) {
            // Backward compatibility with old single-date format
            dateArray = [date];
          } else {
            return {
              success: false,
              error: 'No date(s) provided',
            };
          }
          
          console.log('[ChatComponent] Creating event(s) for', dateArray.length, 'date(s)');
          
          const existingEvents = await getCalendarEvents();
          const createdEvents: any[] = [];
          const conflicts: any[] = [];
          const baseTimestamp = Date.now();
          
          // Create events for each date
          for (let i = 0; i < dateArray.length; i++) {
            const date = dateArray[i];
            
            // Check for conflicts
            const conflictCheck = checkEventConflicts(date, startHour, endHour, existingEvents);
            
            if (conflictCheck.hasConflict) {
              console.log('[ChatComponent] Conflict detected for', date);
              conflicts.push({
                date,
                message: conflictCheck.message,
                conflictingEvents: conflictCheck.conflictingEvents.map(e => ({
                  id: e.id,
                  title: e.title,
                  startHour: e.startHour,
                  endHour: e.endHour
                }))
              });
              continue; // Skip this date
            }
            
            // Get color for the event (use same color for all recurring events)
            const color: string = createdEvents.length > 0 
              ? createdEvents[0].color 
              : findSimilarEventColor(title, existingEvents);
            
            // Create the event with unique ID
            const newEvent: any = {
              id: (baseTimestamp + i).toString(), // Unique ID per event
              title,
              date,
              startHour,
              endHour,
              color,
            };
            
            console.log('[ChatComponent] Creating event:', newEvent);
            const success = await addCalendarEvent(newEvent);
            
            if (success) {
              createdEvents.push(newEvent);
              // Add to existing events for next conflict check
              existingEvents.push(newEvent);
            }
          }
          
          // Notify all listeners (calendar tabs) to refresh
          if (createdEvents.length > 0) {
            eventEmitter.emit(EVENTS.CALENDAR_UPDATED);
          }
          
          console.log('[ChatComponent] Created', createdEvents.length, 'events,', conflicts.length, 'conflicts');
          
          return {
            success: createdEvents.length > 0,
            createdCount: createdEvents.length,
            conflictCount: conflicts.length,
            events: createdEvents,
            conflicts: conflicts.length > 0 ? conflicts : undefined,
            message: createdEvents.length > 0 
              ? `Successfully created ${createdEvents.length} event(s)${conflicts.length > 0 ? ` (${conflicts.length} skipped due to conflicts)` : ''}`
              : 'Failed to create events - all dates had conflicts',
            error: createdEvents.length === 0 ? 'All events conflicted with existing events' : null,
          };
        }
        
        // Handle deleteCalendarEvent
        if (functionName === 'deleteCalendarEvent') {
          const { eventId } = params;
          
          // Calculate how many events will be deleted (before deletion)
          const currentEvents = await getCalendarEvents();
          let deletedCount = 0;
          if (eventId.toLowerCase() === 'all') {
            deletedCount = currentEvents.length;
          } else if (eventId.includes(',')) {
            deletedCount = eventId.split(',').length;
          } else {
            deletedCount = 1;
          }
          
          console.log('[ChatComponent] Deleting event(s):', eventId, `(${deletedCount} events)`);
          const success = await deleteCalendarEvent(eventId);
          console.log('[ChatComponent] Event(s) deleted, success:', success);
          
          // Notify all listeners (calendar tabs) to refresh
          if (success) {
            eventEmitter.emit(EVENTS.CALENDAR_UPDATED);
          }
          
          return {
            success,
            eventId,
            deletedCount,
            message: success ? `Successfully deleted ${deletedCount} event(s)` : 'Failed to delete event(s)',
            error: success ? null : 'Failed to delete event(s)',
          };
        }
        
        // Handle updateCalendarEvent
        if (functionName === 'updateCalendarEvent') {
          const { eventId, ...updates } = params;
          
          const existingEvents = await getCalendarEvents();
          let eventsToUpdate: any[] = [];
          
          // Determine which events to update
          if (eventId.startsWith('title:')) {
            // Match by title: "title:Joga" → find all events with title "Joga"
            const titleToMatch = eventId.substring(6).toLowerCase();
            eventsToUpdate = existingEvents.filter(e => 
              e.title.toLowerCase().includes(titleToMatch)
            );
            console.log('[ChatComponent] Matching events by title:', titleToMatch, 'found:', eventsToUpdate.length);
          } else if (eventId.includes(',')) {
            // Multiple IDs: "123,456,789"
            const ids = eventId.split(',').map((id: string) => id.trim());
            eventsToUpdate = existingEvents.filter(e => ids.includes(e.id));
            console.log('[ChatComponent] Updating multiple events by IDs:', ids.length, 'found:', eventsToUpdate.length);
          } else {
            // Single ID
            const event = existingEvents.find(e => e.id === eventId);
            if (event) {
              eventsToUpdate = [event];
            }
          }
          
          if (eventsToUpdate.length === 0) {
            return {
              success: false,
              error: 'No matching events found',
            };
          }
          
          const updatedEvents: any[] = [];
          const conflicts: any[] = [];
          
          // Update each event
          for (const event of eventsToUpdate) {
            // If updating time, check for conflicts
            if (updates.date || updates.startHour !== undefined || updates.endHour !== undefined) {
              const newDate = updates.date || event.date;
              const newStartHour = updates.startHour !== undefined ? updates.startHour : event.startHour;
              const newEndHour = updates.endHour !== undefined ? updates.endHour : event.endHour;
              
              const conflictCheck = checkEventConflicts(newDate, newStartHour, newEndHour, existingEvents, event.id);
              
              if (conflictCheck.hasConflict) {
                console.log('[ChatComponent] Update would cause conflict for event:', event.id);
                conflicts.push({
                  eventId: event.id,
                  eventTitle: event.title,
                  message: conflictCheck.message,
                  conflictingEvents: conflictCheck.conflictingEvents.map(e => ({
                    id: e.id,
                    title: e.title,
                    startHour: e.startHour,
                    endHour: e.endHour
                  }))
                });
                continue; // Skip this event
              }
            }
            
            // Update the event
            console.log('[ChatComponent] Updating event:', event.id, 'with:', updates);
            const success = await updateCalendarEvent(event.id, updates);
            
            if (success) {
              updatedEvents.push({
                id: event.id,
                title: event.title,
                updates
              });
            }
          }
          
          // Notify all listeners (calendar tabs) to refresh
          if (updatedEvents.length > 0) {
            eventEmitter.emit(EVENTS.CALENDAR_UPDATED);
          }
          
          console.log('[ChatComponent] Updated', updatedEvents.length, 'events,', conflicts.length, 'conflicts');
          
          return {
            success: updatedEvents.length > 0,
            updatedCount: updatedEvents.length,
            conflictCount: conflicts.length,
            updatedEvents,
            conflicts: conflicts.length > 0 ? conflicts : undefined,
            message: updatedEvents.length > 0
              ? `Successfully updated ${updatedEvents.length} event(s)${conflicts.length > 0 ? ` (${conflicts.length} skipped due to conflicts)` : ''}`
              : 'Failed to update events - all would cause conflicts',
            error: updatedEvents.length === 0 ? 'All updates would cause conflicts' : null,
          };
        }
        
        return { success: false, error: 'Unknown function' };
      });
      
      console.log('[ChatComponent] Message exchange complete, refreshing calendar context...');
      // Refresh calendar context AFTER the function call is complete
      await loadCalendarContext();
      
      // Add Gemini's response (either regular or confirmation after function call)
      const geminiMessage: ChatMessage = {
        _id: Date.now() + 1, // Unique ID
        text: responseText,
        createdAt: new Date(),
        user: {
          _id: 2,
          name: "Gemini",
        },
      };

      const finalMessages = [geminiMessage, ...updatedWithUser];
      console.log('[ChatComponent] Setting final messages, count:', finalMessages.length);
      setMessages(finalMessages);
      
      if (chatId) {
        console.log('[ChatComponent] Updating chat messages in DB');
        await updateChatMessages(chatId, finalMessages);
        onMessagesUpdate?.(finalMessages);
        console.log('[ChatComponent] onMessagesUpdate callback completed');
      }
    } catch (error) {
      console.error('Error getting Gemini response:', error);
      // Add error message
      const errorMessage: ChatMessage = {
        _id: Date.now() + 1,
        text: "Sorry, I encountered an error. Please try again.",
        createdAt: new Date(),
        user: {
          _id: 2,
          name: "Gemini",
        },
      };
      const finalMessages = [errorMessage, ...updatedWithUser];
      console.log('[ChatComponent] Error occurred, setting error message, count:', finalMessages.length);
      setMessages(finalMessages);
    } finally {
      setIsTyping(false);
      console.log('[ChatComponent] onSendMessage completed');
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
