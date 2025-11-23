import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error('EXPO_PUBLIC_GEMINI_API_KEY is not defined in .env file');
}

const genAI = new GoogleGenerativeAI(API_KEY);

export interface ChatMessage {
  role: 'user' | 'model';
  parts: string;
}

export interface CreateEventParams {
  title: string;
  dates: string[]; // Array of ISO date strings YYYY-MM-DD
  startHour: number; // 24-hour format with decimals (e.g., 13.5 for 1:30 PM)
  endHour: number; // 24-hour format with decimals
}

export interface DeleteEventParams {
  eventId: string;
}

export interface UpdateEventParams {
  eventId: string;
  title?: string;
  date?: string;
  startHour?: number;
  endHour?: number;
}

// Define the function declaration for Gemini
const createEventFunction = {
  name: 'createCalendarEvent',
  description: `Creates one or more events in the user's calendar. Use this when the user asks to add, create, schedule, or put something in their calendar.
  
  IMPORTANT: For recurring events (e.g., "every day this week", "Monday to Friday", "all weekend"):
  - Create multiple events by providing an array of dates
  - Use the same title, startHour, and endHour for all dates
  
  Guidelines:
  - Extract a concise, clear title from the user's request
  - Convert relative dates (today, tomorrow, next Monday, etc.) to actual ISO dates based on the current date
  - For "this week", "every day", etc., calculate ALL the dates and include them
  - Convert times to 24-hour format with decimals (e.g., 1:30 PM = 13.5)
  - If no end time is specified, estimate duration based on event type:
    * Meals (breakfast/lunch/dinner): 1 hour
    * Meetings: 1 hour  
    * Study sessions: 2 hours
    * Gym/workout: 1.5 hours
    * Coffee/break: 0.5 hours
    * Classes/lectures: 1.5 hours
    * Yoga: 1 hour
  - Use your best judgment for other event types`,
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      title: {
        type: SchemaType.STRING,
        description: 'A concise title for the event (e.g., "Lunch with friend", "Team meeting", "Study session")',
        nullable: false,
      },
      dates: {
        type: SchemaType.ARRAY,
        description: 'Array of dates in ISO format YYYY-MM-DD. For single event, use array with one date. For recurring events, include all dates.',
        items: {
          type: SchemaType.STRING,
        },
        nullable: false,
      },
      startHour: {
        type: SchemaType.NUMBER,
        description: 'Start time in 24-hour format with decimals (e.g., 13.0 for 1:00 PM, 13.5 for 1:30 PM, 9.25 for 9:15 AM)',
        nullable: false,
      },
      endHour: {
        type: SchemaType.NUMBER,
        description: 'End time in 24-hour format with decimals (e.g., 14.0 for 2:00 PM, 14.5 for 2:30 PM)',
        nullable: false,
      },
    },
    required: ['title', 'dates', 'startHour', 'endHour'],
  },
} as const;

// Delete event function
const deleteEventFunction = {
  name: 'deleteCalendarEvent',
  description: `Deletes one or more events from the user's calendar. Use this when the user asks to delete, remove, or cancel events.
  
  Guidelines:
  - For single event: provide a single eventId as string
  - For multiple events: provide an array of eventIds
  - When user says "delete all" or "remove all", delete ALL events from the calendar
  - Match events by title, time, or date from the calendar context
  - Confirm deletion after successful removal`,
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      eventId: {
        type: SchemaType.STRING,
        description: 'The ID of a single event to delete, OR a comma-separated list of event IDs to delete multiple events (e.g., "1,2,3"). Use "all" to delete all events.',
        nullable: false,
      },
    },
    required: ['eventId'],
  },
} as const;

// Update event function
const updateEventFunction = {
  name: 'updateCalendarEvent',
  description: `Updates one or more existing events in the user's calendar. Use this when the user asks to change, modify, reschedule, or update events.
  
  IMPORTANT: For updating multiple similar events:
  - Use comma-separated eventIds (e.g., "123,456,789") to update multiple events at once
  - Common use case: "Change all my yoga sessions to 8:30" → find all yoga events and update them
  - Use "title:EventName" to update all events with that title (e.g., "title:Joga")
  
  Guidelines:
  - Match events by title, time, or date from the calendar context
  - Only update the fields that are mentioned
  - Check for conflicts with the new time if time is being changed
  - For bulk updates, apply same changes to all specified events`,
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      eventId: {
        type: SchemaType.STRING,
        description: 'The ID(s) of event(s) to update. Single ID, comma-separated IDs (e.g., "1,2,3"), or "title:EventName" to match all events with that title.',
        nullable: false,
      },
      title: {
        type: SchemaType.STRING,
        description: 'New title for the event (optional)',
        nullable: true,
      },
      date: {
        type: SchemaType.STRING,
        description: 'New date in ISO format YYYY-MM-DD (optional)',
        nullable: true,
      },
      startHour: {
        type: SchemaType.NUMBER,
        description: 'New start time in 24-hour format (optional)',
        nullable: true,
      },
      endHour: {
        type: SchemaType.NUMBER,
        description: 'New end time in 24-hour format (optional)',
        nullable: true,
      },
    },
    required: ['eventId'],
  },
} as const;

export class GeminiService {
  private model;
  private chat: any = null;
  private history: ChatMessage[] = [];
  private calendarContext: string = '';

  constructor() {
    this.model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      systemInstruction: this.getSystemInstruction(),
      tools: [
        {
          functionDeclarations: [createEventFunction as any, deleteEventFunction as any, updateEventFunction as any],
        },
      ],
    });
  }

  private getSystemInstruction(): string {
    const today = new Date();
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
    const fullDate = today.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
    
    return `You are PlanPal, a friendly AI assistant helping students with career growth and time management.

CURRENT DATE AND TIME:
Today is ${dayName}, ${fullDate}

Your role:
- Help students organize their time effectively
- Provide career guidance and study tips
- Answer questions about their schedule (events, assignments, meetings)
- Be encouraging and supportive
- Provide time management suggestions based on their actual calendar
- When they ask about "today", "tomorrow", "next week", etc., use the current date above to calculate the correct dates

IMPORTANT: Response Formatting:
- Use plain text only - NO markdown formatting
- Instead of **bold**, use ALL CAPS for emphasis
- Instead of bullet lists with -, use numbered lists (1., 2., 3.)
- Keep responses clean and easy to read on mobile
- Be conversational and friendly

IMPORTANT: Creating recurring events:
- When user says "every day this week", "Monday to Friday", "all weekend", calculate ALL dates
- Example: "this week" from Monday to Sunday = 7 dates
- Example: "weekdays" = Monday to Friday = 5 dates
- Example: "weekend" = Saturday and Sunday = 2 dates
- Send ALL dates in the dates array to createCalendarEvent
- The system will create all events in one go

IMPORTANT: When deleting events:
- To delete ALL events: use eventId = "all"
- To delete multiple specific events: use comma-separated IDs (e.g., "1,2,3")
- To delete a single event: use the single event ID

IMPORTANT: When updating events:
- To update ALL events with specific title: use eventId = "title:EventName" (e.g., "title:Joga" updates all yoga events)
- To update multiple specific events: use comma-separated IDs (e.g., "1,2,3")
- To update a single event: use the single event ID
- Common scenario: User creates recurring events, then wants to change time → use "title:EventName" format

IMPORTANT: When showing events to the user:
- DO NOT show the event IDs [ID: xxx] to the user
- Only use IDs internally for delete/update operations
- Present events in a clean, friendly format without technical details
- Format event lists like this:
  Monday, November 25:
  1. Team Meeting: 9:00 AM - 10:00 AM
  2. Study Math: 2:00 PM - 4:00 PM
  
  Tuesday, November 26:
  1. Project Work: 10:00 AM - 1:00 PM

${this.calendarContext || 'No calendar events available yet. The user can add events to their calendar.'}

When asked about their schedule, refer to the calendar events above. Provide helpful, specific answers about their commitments. If asked about dates or times not in the calendar, politely say you don't see that information in their calendar yet.

Remember: Always reference the CURRENT DATE above when interpreting relative time references like "today", "tomorrow", "this week", "next week", etc.`;
  }

  // Set calendar context
  setCalendarContext(calendarContext: string) {
    this.calendarContext = calendarContext;
    // Recreate model with updated system instruction
    this.model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      systemInstruction: this.getSystemInstruction(),
      tools: [
        {
          functionDeclarations: [createEventFunction as any, deleteEventFunction as any, updateEventFunction as any],
        },
      ],
    });
    // DON'T reset chat - it breaks function call flow
    // The new context will be used for the next chat initialization
  }

  // Initialize chat with history
  initChat(history: ChatMessage[] = []) {
    this.history = history;
    this.chat = this.model.startChat({
      history: history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.parts }],
      })),
      generationConfig: {
        maxOutputTokens: 1000,
      },
    });
  }

  // Send a message and get response
  async sendMessage(
    message: string, 
    onFunctionCall?: (functionName: string, params: any) => Promise<any>
  ): Promise<string> {
    try {
      if (!this.chat) {
        console.log('[Gemini] Initializing new chat');
        this.initChat();
      }

      console.log('[Gemini] Sending message:', message);
      let result = await this.chat.sendMessage(message);
      let response = result.response;
      
      // Check if there's a function call
      const functionCalls = response.functionCalls();
      
      if (functionCalls && functionCalls.length > 0) {
        console.log('[Gemini] Function call detected:', functionCalls.length);
        const functionCall = functionCalls[0];
        
        if (onFunctionCall) {
          console.log('[Gemini] Executing', functionCall.name, 'with params:', functionCall.args);
          
          // Execute the function callback
          console.log('[Gemini] Calling function callback...');
          const functionResult = await onFunctionCall(functionCall.name, functionCall.args);
          console.log('[Gemini] Function callback completed:', functionResult);
          
          // Send the function response back immediately
          console.log('[Gemini] Sending function response back to AI...');
          result = await this.chat.sendMessage([
            {
              functionResponse: {
                name: functionCall.name,
                response: functionResult,
              },
            },
          ]);
          
          response = result.response;
          console.log('[Gemini] Received final response from AI');
          return response.text();
        }
      }
      
      // Regular text response
      console.log('[Gemini] Regular text response');
      return response.text();
    } catch (error) {
      console.error('[Gemini] Error sending message:', error);
      throw error;
    }
  }

  // Generate a chat title based on the first message
  async generateChatTitle(firstMessage: string): Promise<string> {
    try {
      const prompt = `Generate a short, concise title (3-5 words max) for a chat that starts with this message: "${firstMessage}". Only return the title, nothing else.`;
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      let title = response.text().trim();
      
      // Remove quotes if present
      title = title.replace(/^["']|["']$/g, '');
      
      // Limit length
      if (title.length > 50) {
        title = title.substring(0, 47) + '...';
      }
      
      return title || 'New Chat';
    } catch (error) {
      console.error('Error generating title:', error);
      return 'New Chat';
    }
  }

  // Reset chat history
  resetChat() {
    this.chat = null;
    this.history = [];
  }

  // Get chat history
  getHistory(): ChatMessage[] {
    return this.history;
  }
}

export const geminiService = new GeminiService();
