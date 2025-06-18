// @ts-nocheck
import { pgTable, text, serial, integer, boolean, timestamp, jsonb, real, json } from "drizzle-orm/pg-core";
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
// Time-series data point schema
export const timeSeriesData = pgTable("time_series_data", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").notNull(),
  tagId: text("tag_id").notNull(),
  tagLabel: text("tag_label").notNull(),
  tagValue: real("tag_value").notNull(),
  unit: text("unit").notNull(),
  minRange: real("min_range").notNull(),
  maxRange: real("max_range").notNull(),
  normalizedValue: real("normalized_value").notNull(),
});

// Annotations schema
export const annotations = pgTable("annotations", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").notNull(),
  tagId: text("tag_id").notNull(),
  annotationType: text("annotation_type").notNull(), // 'point' or 'region'
  category: text("category").notNull(), // 'Normal', 'Warning', 'Critical', 'Anomaly'
  severity: text("severity").notNull(), // 'Low', 'Medium', 'High'
  value: real("value").notNull(),
  normalizedValue: real("normalized_value").notNull(),
  description: text("description"),
  regionStart: timestamp("region_start"),
  regionEnd: timestamp("region_end"),
});

// Rules schema
export const rules = pgTable("rules", {
  id: serial("id").primaryKey(),
  tagId: text("tag_id").notNull(),
  condition: text("condition").notNull(), // 'greater_than', 'less_than', 'equal_to', 'between'
  threshold: real("threshold").notNull(),
  thresholdMax: real("threshold_max"), // for 'between' condition
  severity: text("severity").notNull(),
  isActive: boolean("is_active").default(true),
});

// Saved graphs schema
export const savedGraphs = pgTable("saved_graphs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  selectedTags: json("selected_tags").notNull(), // Array of tag IDs
  timeWindow: text("time_window").notNull(),
  includeAnnotations: boolean("include_annotations").default(false),
  chartConfig: json("chart_config").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// CSV upload validation schema
export const csvRowSchema = z.object({
  timestamp: z.string().min(1),
  tagId: z.string().min(1),
  tagLabel: z.string().min(1),
  tagValue: z.number(),
  unit: z.string().min(1),
  minRange: z.number(),
  maxRange: z.number(),
});

// Insert schemas
export const insertTimeSeriesDataSchema = createInsertSchema(timeSeriesData).omit({
  id: true,
});

export const insertAnnotationSchema = createInsertSchema(annotations).omit({
  id: true,
});

export const insertRuleSchema = createInsertSchema(rules).omit({
  id: true,
});

export const insertSavedGraphSchema = createInsertSchema(savedGraphs).omit({
  id: true,
  createdAt: true,
});

// Types
export type TimeSeriesData = typeof timeSeriesData.$inferSelect;
export type InsertTimeSeriesData = z.infer<typeof insertTimeSeriesDataSchema>;

export type Annotation = typeof annotations.$inferSelect;
export type InsertAnnotation = z.infer<typeof insertAnnotationSchema>;

export type Rule = typeof rules.$inferSelect;
export type InsertRule = z.infer<typeof insertRuleSchema>;

export type SavedGraph = typeof savedGraphs.$inferSelect;
export type InsertSavedGraph = z.infer<typeof insertSavedGraphSchema>;

export type CsvRow = z.infer<typeof csvRowSchema>;

// Utility types
export interface TagInfo {
  tagId: string;
  tagLabel: string;
  unit: string;
  minRange: number;
  maxRange: number;
  color: string;
}

export interface ChartDataPoint {
  timestamp: Date;
  tagId: string;
  value: number;
  normalizedValue: number;
  actualValue: number;
  unit: string;
}

export interface AnnotationMarker {
  id: number;
  timestamp: Date;
  tagId: string;
  type: 'point' | 'region';
  category: string;
  severity: string;
  value: number;
  normalizedValue: number;
  description?: string;
  regionStart?: Date;
  regionEnd?: Date;
}

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
