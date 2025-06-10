// @ts-nocheck
import { 
  users, documents, smeContexts, questions, answers, feedback,
  type User, type InsertUser, type Document, type InsertDocument,
  type SMEContext, type InsertSMEContext, type Question, type InsertQuestion,
  type Answer, type InsertAnswer, type Feedback, type InsertFeedback
} from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createDocument(document: InsertDocument): Promise<Document>;
  getDocuments(): Promise<Document[]>;
  deleteDocument(id: number): Promise<void>;
  
  createSMEContext(context: InsertSMEContext): Promise<SMEContext>;
  getCurrentSMEContext(): Promise<SMEContext | undefined>;
  updateSMEContext(id: number, context: Partial<InsertSMEContext>): Promise<SMEContext | undefined>;
  
  createQuestion(question: InsertQuestion): Promise<Question>;
  getQuestions(): Promise<Question[]>;
  
  createAnswer(answer: InsertAnswer): Promise<Answer>;
  getAnswersByQuestionId(questionId: number): Promise<Answer[]>;
  
  createFeedback(feedback: InsertFeedback): Promise<Feedback>;
  getFeedbackByAnswerId(answerId: number): Promise<Feedback[]>;
}

// @ts-nocheck
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private documents: Map<number, Document>;
  private smeContexts: Map<number, SMEContext>;
  private questions: Map<number, Question>;
  private answers: Map<number, Answer>;
  private feedbacks: Map<number, Feedback>;
  private currentId: number;

  constructor() {
    this.users = new Map();
    this.documents = new Map();
    this.smeContexts = new Map();
    this.questions = new Map();
    this.answers = new Map();
    this.feedbacks = new Map();
    this.currentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { 
      id,
      username: insertUser.username,
      password: insertUser.password
    };
    this.users.set(id, user);
    return user;
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = this.currentId++;
    const document: Document = { 
      id,
      fileName: insertDocument.fileName,
      customName: insertDocument.customName,
      documentType: insertDocument.documentType,
      fileSize: insertDocument.fileSize,
      fileContent: insertDocument.fileContent,
      uploadedAt: new Date() 
    };
    this.documents.set(id, document);
    return document;
  }

  async getDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values()).sort((a, b) => 
      b.uploadedAt.getTime() - a.uploadedAt.getTime()
    );
  }

  async deleteDocument(id: number): Promise<void> {
    this.documents.delete(id);
  }

  async createSMEContext(insertContext: InsertSMEContext): Promise<SMEContext> {
    const id = this.currentId++;
    const context: SMEContext = { 
      id,
      industry: insertContext.industry,
      plantName: insertContext.plantName,
      keyProcesses: insertContext.keyProcesses,
      criticalEquipment: insertContext.criticalEquipment,
      allowExternalKnowledge: insertContext.allowExternalKnowledge ?? false,
      createdAt: new Date()
    };
    this.smeContexts.set(id, context);
    return context;
  }

  async getCurrentSMEContext(): Promise<SMEContext | undefined> {
    const contexts = Array.from(this.smeContexts.values()).sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
    return contexts[0];
  }

  async updateSMEContext(id: number, updateData: Partial<InsertSMEContext>): Promise<SMEContext | undefined> {
    const existing = this.smeContexts.get(id);
    if (!existing) return undefined;
    
    const updated: SMEContext = { ...existing, ...updateData };
    this.smeContexts.set(id, updated);
    return updated;
  }

  async createQuestion(insertQuestion: InsertQuestion): Promise<Question> {
    const id = this.currentId++;
    const question: Question = { 
      ...insertQuestion, 
      id, 
      createdAt: new Date(),
      contextId: insertQuestion.contextId ?? null
    };
    this.questions.set(id, question);
    return question;
  }

  async getQuestions(): Promise<Question[]> {
    return Array.from(this.questions.values()).sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async createAnswer(insertAnswer: InsertAnswer): Promise<Answer> {
    const id = this.currentId++;
    // @ts-ignore - Type compatibility issue with sources array
    const answer: Answer = { 
      ...insertAnswer,
      id, 
      createdAt: new Date() 
    };
    this.answers.set(id, answer);
    return answer;
  }

  async getAnswersByQuestionId(questionId: number): Promise<Answer[]> {
    return Array.from(this.answers.values())
      .filter(answer => answer.questionId === questionId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createFeedback(insertFeedback: InsertFeedback): Promise<Feedback> {
    const id = this.currentId++;
    const feedback: Feedback = { 
      id,
      answerId: insertFeedback.answerId,
      rating: insertFeedback.rating,
      comment: insertFeedback.comment ?? null,
      createdAt: new Date() 
    };
    this.feedbacks.set(id, feedback);
    return feedback;
  }

  async getFeedbackByAnswerId(answerId: number): Promise<Feedback[]> {
    return Array.from(this.feedbacks.values())
      .filter(feedback => feedback.answerId === answerId);
  }
}

export const storage = new MemStorage();
