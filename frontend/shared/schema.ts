// @ts-nocheck
import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  customName: text("custom_name").notNull(),
  documentType: text("document_type").notNull(),
  fileSize: integer("file_size").notNull(),
  fileContent: text("file_content").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export const smeContexts = pgTable("sme_contexts", {
  id: serial("id").primaryKey(),
  industry: text("industry").notNull(),
  plantName: text("plant_name").notNull(),
  keyProcesses: text("key_processes").notNull(),
  criticalEquipment: text("critical_equipment").notNull(),
  allowExternalKnowledge: boolean("allow_external_knowledge").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  questionText: text("question_text").notNull(),
  contextId: integer("context_id").references(() => smeContexts.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const answers = pgTable("answers", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id").references(() => questions.id).notNull(),
  answerText: text("answer_text").notNull(),
  sources: jsonb("sources").$type<Array<{
    type: 'document' | 'external';
    name: string;
    section?: string;
    confidence?: number;
  }>>().notNull(),
  transparency: jsonb("transparency").$type<{
    documentPercentage: number;
    externalPercentage: number;
  }>().notNull(),
  followUpSuggestions: text("follow_up_suggestions").array().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  answerId: integer("answer_id").references(() => answers.id).notNull(),
  rating: text("rating").notNull(), // 'positive' | 'negative'
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDocumentSchema = createInsertSchema(documents).pick({
  fileName: true,
  customName: true,
  documentType: true,
  fileSize: true,
  fileContent: true,
});

export const insertSMEContextSchema = createInsertSchema(smeContexts).pick({
  industry: true,
  plantName: true,
  keyProcesses: true,
  criticalEquipment: true,
  allowExternalKnowledge: true,
});

export const insertQuestionSchema = createInsertSchema(questions).pick({
  questionText: true,
  contextId: true,
});

export const insertAnswerSchema = createInsertSchema(answers).pick({
  questionId: true,
  answerText: true,
  sources: true,
  transparency: true,
  followUpSuggestions: true,
});

export const insertFeedbackSchema = createInsertSchema(feedback).pick({
  answerId: true,
  rating: true,
  comment: true,
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertSMEContext = z.infer<typeof insertSMEContextSchema>;
export type SMEContext = typeof smeContexts.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questions.$inferSelect;
export type InsertAnswer = z.infer<typeof insertAnswerSchema>;
export type Answer = typeof answers.$inferSelect;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type Feedback = typeof feedback.$inferSelect;
