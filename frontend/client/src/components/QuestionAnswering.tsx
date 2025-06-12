import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Send,
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  File,
  ArrowRight,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import axios from "axios";
import { TailSpin } from 'react-loader-spinner';

const FullScreenLoader = () => (
    <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-50 z-[9999]">
        <TailSpin
            height="60"
            width="60"
            color="#ffffff"
            ariaLabel="loading"
        />
    </div>
);
interface SMEContext {
  plantName: string;
  keyProcesses: string;
  criticalEquipment: string;
  knownChallenges: string;
  regulations: string;
  unitProcess: string;
  notes: string;
}

interface QuestionAnsweringProps {
  industry: string;
  user_id: number;
  use_external: boolean;
  sme_context: SMEContext;
}
interface QuestionWithAnswers {
  id: number;
  questionText: string;
  contextId: number | null;
  createdAt: Date;
  answers: Array<{
    id: number;
    questionId: number;
    answerText: string;
    sources: Array<{
      type: "document" | "external";
      name: string;
      // section?: string;
      //confidence?: number;
    }>;
    transparency: {
      documentPercentage: number;
      externalPercentage: number;
    };
    followUpSuggestions: string[];
    createdAt: Date;
  }>;
}

export function QuestionAnswering({
  industry,
  user_id,
  use_external,
  sme_context,
}: QuestionAnsweringProps) {
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [expandedComments, setExpandedComments] = useState<Set<number>>(
    new Set()
  );
  const [feedbackComments, setFeedbackComments] = useState<
    Record<number, string>
  >({});
  const { toast } = useToast();
  const [_questions, _setQuestions] = useState<QuestionWithAnswers[]>([]);
  const queryClient = useQueryClient();
  const [isShowing, setIsShowing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { data: questions = [], isLoading } = useQuery<QuestionWithAnswers[]>({
    queryKey: ["/api/questions"],
  });

  const questionMutation = useMutation({
    mutationFn: async (questionText: string) => {
      return await apiRequest("POST", "/api/questions", {
        questionText,
        contextId: null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
      setCurrentQuestion("");
      toast({
        title: "Success",
        description: "Question submitted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit question",
        variant: "destructive",
      });
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: async ({
      answerId,
      rating,
      comment,
    }: {
      answerId: number;
      rating: string;
      comment?: string;
    }) => {
      // return await apiRequest("POST", "/api/feedback", {
      //   answerId,
      //   rating,
      //   comment,
      // });
      return {'success': true}; // Mock response for testing
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Feedback submitted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit feedback",
        variant: "destructive",
      });
    },
  });

  const handleSubmitQuestion = async () => {
    if (!currentQuestion.trim()) {
      toast({
        title: "Warning",
        description: "Please enter a question first",
        variant: "destructive",
      });
      return;
    }
    if (!industry) {
      toast({
        title: "Warning",
        description: "Please select industry first",
        variant: "destructive",
      });
      return;
    }
    // if (
    //   !sme_context.plantName ||
    //   !sme_context.keyProcesses ||
    //   !sme_context.criticalEquipment ||
    //   !sme_context.unitProcess ||
    //   !sme_context.regulations ||
    //   !sme_context.notes ||
    //   !sme_context.knownChallenges
    // ) {
    //   toast({
    //     title: "Warning",
    //     description: "Please provide SME context information first",
    //     variant: "destructive",
    //   });
    //   return;
    // }

    if (!user_id) {
      toast({
        title: "Warning",
        description: "Please login first",
        variant: "destructive",
      });
      return;
    }
    setIsUploading(true);
    try {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      const newQuestion: QuestionWithAnswers = {
        id,
        questionText: currentQuestion,
        contextId: null,
        createdAt: new Date(),
        answers: [],
      };
      const res = await axios.post(
        "http://localhost:8000/query",
        {
          query: currentQuestion,
          industry: industry,
          user_id: user_id.toString(),
          use_external: use_external,
          sme_context: {
            plant_name: sme_context.plantName,
            key_processes: [sme_context.keyProcesses],
            equipment: [sme_context.criticalEquipment],
            known_issues: [sme_context.knownChallenges],
            regulations: [sme_context.regulations],
            unit_process: sme_context.unitProcess,
            notes: sme_context.notes,
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      console.log("Response from backend:", res.data);

      const answer = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        questionId: id,
        answerText: res.data.answer,
        sources: res.data.sources.map((source: any, index: number) =>
          index === 0
            ? {
                type: "document",
                name: source,
              }
            : {
                type: "external",
                name: source,
              }
        ),
        transparency: {
          documentPercentage: parseFloat(res.data.transparency[0]),
          externalPercentage: res.data.transparency[1] == "true" ? (100-parseFloat(res.data.transparency[0])) : 0,
        },
        followUpSuggestions: res.data.follow_up_questions || [],
        createdAt: new Date(),
      };
      newQuestion.answers.push(answer);
      _setQuestions((prev) => [...prev, newQuestion]);
      // setIsShowing(true);
      setCurrentQuestion("");
    } catch (error) {
      console.log("Error submitting question:", error);
      toast({
        title: "Error",
        description: "You exceeded the maximum token limit per minute. Please try again in a miniute.",
        variant: "destructive",
      });
    }
    finally {
      setIsUploading(false);
      
    }
    //questionMutation.mutate(currentQuestion);
  };

  const handleFollowUpClick = (question: string) => {
    setCurrentQuestion(question);
  };

  const handleFeedback = (
    answerId: number,
    rating: "positive" | "negative"
  ) => {
    const comment = feedbackComments[answerId];
    console.log("Submitting feedback:", comment, rating);
    feedbackMutation.mutate({
      answerId,
      rating,
      comment: comment || undefined,
    });

    // Clear comment and collapse
    setFeedbackComments((prev) => ({ ...prev, [answerId]: "" }));
    setExpandedComments((prev) => {
      const newSet = new Set(prev);
      newSet.delete(answerId);
      return newSet;
    });
  };

  const toggleCommentBox = (answerId: number) => {
    setExpandedComments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(answerId)) {
        newSet.delete(answerId);
      } else {
        newSet.add(answerId);
      }
      return newSet;
    });
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - new Date(date).getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24)
      return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
  };

  return (
    <div className="step-container">
      <div className="step-header">
        <div className="step-number">
          <span className="step-number-text">5</span>
        </div>
        <div className="ml-4">
          <h2 className="step-title">Ask Questions</h2>
          <p className="step-description">
            Get AI-powered answers from your documents
          </p>
        </div>
      </div>
      {isUploading && <FullScreenLoader />}

      {/* Q&A Results */}
      {(_questions.length > 0 || isShowing) && (
        <div className="space-y-6">
          <div className="border-t border-border pt-6">
            <h4 className="text-sm font-medium mb-4">
              Recent Questions & Answers
            </h4>

            {isShowing ? (
              <div className="space-y-8">
                {[1, 2].map((i) => (
                  <Card key={i} className="p-4 animate-pulse">
                    <div className="space-y-4">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-20 bg-muted rounded" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-8">
                {_questions.map((question) => (
                  <div
                    key={question.id}
                    className="p-4 bg-muted/20 rounded-lg border border-border"
                  >
                    {/* Question */}
                    <div className="mb-4">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                          <MessageCircle className="text-white h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{question.questionText}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Asked {formatTimeAgo(question.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Answer */}
                    {question.answers.map((answer) => (
                      <div key={answer.id} className="ml-11 mb-4">
                        <Card className="p-4">
                          <p className="mb-4">{answer.answerText}</p>

                          {/* Sources */}
                          <div className="border-t border-border pt-3 mt-3">
                            <p className="text-xs font-medium mb-2">Sources:</p>
                            <div className="space-y-1">
                              {answer.sources.map((source, index) => (
                                <p
                                  key={index}
                                  className="text-xs text-muted-foreground"
                                >
                                  {source.type === "document" ? (
                                    <File className="inline h-3 w-3 text-red-500 mr-1" />
                                  ) : (
                                    <ExternalLink className="inline h-3 w-3 text-blue-500 mr-1" />
                                  )}
                                  <span className="font-medium">
                                    {source.name}
                                  </span>
                                  {/* {source.section &&
                                    ` – Section: ${source.section}`} */}
                                </p>
                              ))}
                            </div>
                          </div>

                          {/* Transparency Tag */}
                          <div className="mt-3 pt-3 border-t border-border">
                            <Badge
                              variant="secondary"
                              className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                            >
                              Based on: {answer.transparency.documentPercentage}
                              % document | External:{" "}
                              {answer.transparency.externalPercentage}%
                            </Badge>
                          </div>
                        </Card>

                        {/* Follow-up Suggestions */}
                        <div className="mt-4">
                          <p className="text-sm font-medium mb-2">
                            Suggested follow-up questions:
                          </p>
                          <div className="space-y-2">
                            {answer.followUpSuggestions.map(
                              (suggestion, index) => (
                                <Button
                                  key={index}
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleFollowUpClick(suggestion)
                                  }
                                  className="block w-full text-left justify-start"
                                >
                                  <ArrowRight className="mr-2 h-4 w-4 text-muted-foreground" />
                                  {suggestion}
                                </Button>
                              )
                            )}
                          </div>
                        </div>

                        {/* Feedback Section */}
                        <div className="mt-4 pt-4 border-t border-border">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <span className="text-sm text-muted-foreground">
                                Was this helpful?
                              </span>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    handleFeedback(answer.id, "positive")
                                  }
                                  disabled={feedbackMutation.isPending}
                                  className="h-8 w-8 text-muted-foreground hover:text-green-500"
                                >
                                  <ThumbsUp className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    handleFeedback(answer.id, "negative")
                                  }
                                  disabled={feedbackMutation.isPending}
                                  className="h-8 w-8 text-muted-foreground hover:text-red-500"
                                >
                                  <ThumbsDown className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleCommentBox(answer.id)}
                              className="text-primary hover:text-primary/80"
                            >
                              Add comment
                            </Button>
                          </div>

                          {/* Comment Box */}
                          {expandedComments.has(answer.id) && (
                            <div className="mt-3">
                              <Textarea
                                placeholder="Optional: Share specific feedback to help us improve..."
                                value={feedbackComments[answer.id] || ""}
                                onChange={(e) =>
                                  setFeedbackComments((prev) => ({
                                    ...prev,
                                    [answer.id]: e.target.value,
                                  }))
                                }
                                className="resize-none"
                                rows={2}
                              />
                              <div className="flex justify-end mt-2 space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    toggleCommentBox(answer.id);
                                    setFeedbackComments((prev) => ({
                                      ...prev,
                                      [answer.id]: "",
                                    }));
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleFeedback(answer.id, "positive")
                                  }
                                  disabled={feedbackMutation.isPending}
                                >
                                  Submit
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Question Input */}
      <div className="mb-6 mt-6">
        <div className="flex space-x-6">
          <div className="flex-1">
            <Textarea
              placeholder="Enter your question about the processes, equipment, or procedures..."
              rows={3}
              value={currentQuestion}
              onChange={(e) => setCurrentQuestion(e.target.value)}
              className="resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmitQuestion();
                }
              }}
            />
          </div>
          <div className="flex flex-col justify-end">
            <Button
              onClick={handleSubmitQuestion}
              disabled={questionMutation.isPending || !currentQuestion.trim()}
              className="px-6 py-3 font-medium"
            >
              <Send className="mr-2 h-4 w-4" />
              {questionMutation.isPending ? "Asking..." : "Ask"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
