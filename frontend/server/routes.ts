// @ts-nocheck
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { 
  insertDocumentSchema, insertSMEContextSchema, 
  insertQuestionSchema, insertAnswerSchema, insertFeedbackSchema 
} from "@shared/schema";
import { z } from "zod";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/csv',
      'text/plain'
    ];
    cb(null, allowedTypes.includes(file.mimetype));
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Document endpoints
  app.post("/api/documents", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { customName, documentType } = req.body;
      
      const documentData = insertDocumentSchema.parse({
        fileName: req.file.originalname,
        customName: customName || req.file.originalname,
        documentType: documentType || 'other',
        fileSize: req.file.size,
        fileContent: req.file.buffer.toString('base64'),
      });

      const document = await storage.createDocument(documentData);
      res.json(document);
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  app.get("/api/documents", async (req, res) => {
    try {
      const documents = await storage.getDocuments();
      // Don't return file content in list view
      const documentsWithoutContent = documents.map(({ fileContent, ...doc }) => doc);
      res.json(documentsWithoutContent);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.delete("/api/documents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteDocument(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // SME Context endpoints
  app.post("/api/sme-context", async (req, res) => {
    try {
      const contextData = insertSMEContextSchema.parse(req.body);
      const context = await storage.createSMEContext(contextData);
      res.json(context);
    } catch (error) {
      console.error("Error creating SME context:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create SME context" });
    }
  });

  app.get("/api/sme-context", async (req, res) => {
    try {
      const context = await storage.getCurrentSMEContext();
      res.json(context);
    } catch (error) {
      console.error("Error fetching SME context:", error);
      res.status(500).json({ message: "Failed to fetch SME context" });
    }
  });

  app.put("/api/sme-context/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = insertSMEContextSchema.partial().parse(req.body);
      const context = await storage.updateSMEContext(id, updateData);
      
      if (!context) {
        return res.status(404).json({ message: "SME context not found" });
      }
      
      res.json(context);
    } catch (error) {
      console.error("Error updating SME context:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update SME context" });
    }
  });

  // Question and Answer endpoints
  app.post("/api/questions", async (req, res) => {
    try {
      const questionData = insertQuestionSchema.parse(req.body);
      const question = await storage.createQuestion(questionData);
      
      // Generate AI response (mock implementation for now)
      const mockAnswer = {
        questionId: question.id,
        answerText: "Based on your documents and SME context, here is a comprehensive answer to your question. The system has analyzed the uploaded documents and found relevant information.",
        sources: [
          {
            type: 'document' as const,
            name: 'Process Manual',
            section: 'Operating Procedures',
            confidence: 0.95
          }
        ],
        transparency: {
          documentPercentage: 85,
          externalPercentage: 15
        },
        followUpSuggestions: [
          "What are the safety considerations for this process?",
          "How does this procedure vary in different operating conditions?"
        ]
      };
      
      const answer = await storage.createAnswer(mockAnswer);
      
      res.json({ question, answer });
    } catch (error) {
      console.error("Error creating question:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to process question" });
    }
  });

  app.get("/api/questions", async (req, res) => {
    try {
      const questions = await storage.getQuestions();
      
      // Get answers for each question
      const questionsWithAnswers = await Promise.all(
        questions.map(async (question) => {
          const answers = await storage.getAnswersByQuestionId(question.id);
          return { ...question, answers };
        })
      );
      
      res.json(questionsWithAnswers);
    } catch (error) {
      console.error("Error fetching questions:", error);
      res.status(500).json({ message: "Failed to fetch questions" });
    }
  });

  // Feedback endpoints
  app.post("/api/feedback", async (req, res) => {
    try {
      const feedbackData = insertFeedbackSchema.parse(req.body);
      const feedback = await storage.createFeedback(feedbackData);
      res.json(feedback);
    } catch (error) {
      console.error("Error creating feedback:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to submit feedback" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
