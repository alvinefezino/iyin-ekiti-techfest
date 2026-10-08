export type ExamQuestion = { id: number; question: string; options: string[]; answer: number };
export const EXAM_QUESTIONS: ExamQuestion[] = Array.from({ length: 50 }, (_, i) => ({
  id: i + 1,
  question: `Sample question ${i + 1}: What is the correct answer for topic ${i + 1}? (Replace with real questions later)`,
  options: ["Option A", "Option B", "Option C", "Option D"],
  answer: i % 4,
}));
