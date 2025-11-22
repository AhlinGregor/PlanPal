import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = 'AIzaSyA8VSAWVBSQz4-URtURRTACLQXP68GOptI';
const genAI = new GoogleGenerativeAI(API_KEY);

export interface ChatMessage {
  role: 'user' | 'model';
  parts: string;
}

export class GeminiService {
  private model;
  private chat: any = null;
  private history: ChatMessage[] = [];

  constructor() {
    this.model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      systemInstruction: `You are PlanPal, a friendly AI assistant helping students with career growth and time management.

Your role:
- Help students organize their time effectively
- Provide career guidance and study tips
- Answer questions about their schedule (exams, assignments, meetings)
- Be encouraging and supportive

Mock Schedule Data (for testing):
EXAMS:
- Mathematics Exam: Monday, January 29, 2025 at 10:00 AM (Room 305)
- Physics Exam: Thursday, February 1, 2025 at 2:00 PM (Room 201)

ASSIGNMENTS:
- Programming Project: Due Friday, January 26, 2025 at 11:59 PM
- History Essay: Due Tuesday, January 30, 2025 at 11:59 PM
- Chemistry Lab Report: Due Monday, February 5, 2025 at 11:59 PM

MEETINGS:
- Study Group (Math): Wednesday, January 24, 2025 at 4:00 PM (Library)
- Career Counseling: Friday, January 26, 2025 at 3:00 PM (Career Center)

When asked about schedule, check the mock data above and provide helpful, specific answers. If asked about dates not in the schedule, politely say you don't have that information yet.`,
    });
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
  async sendMessage(message: string): Promise<string> {
    try {
      if (!this.chat) {
        this.initChat();
      }

      const result = await this.chat.sendMessage(message);
      const response = await result.response;
      const text = response.text();
      
      return text;
    } catch (error) {
      console.error('Error sending message to Gemini:', error);
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
