// Mock data fixtures for the Halyard Learning Platform prototype.
// All state is in-memory + localStorage. No backend.

import cleanRoomImg from "@/assets/clean-room.jpg";
import sterilizationHeroImg from "@/assets/sterilization-hero.jpg";

export const IMAGES = {
  cleanRoom: cleanRoomImg,
  sterilization: sterilizationHeroImg,
};

export interface Lesson {
  id: string;
  title: string;
  duration: string;
  type: "video" | "interactive" | "reading" | "knowledge_check" | "scenario";
  completed?: boolean;
  interaction?: InteractionKind;
  videoSrc?: string; // URL to the real video file served by Django
  block_tree?: any;
  reading_content?: string | null;
}

export type InteractionKind =
  | "cell_explorer"
  | "comparison"
  | "metastasis_animation"
  | "branching_scenario"
  | "drag_drop_match"
  | "reveal_cards"
  | "knowledge_check";

export interface Module {
  id: string;
  title: string;
  summary: string;
  lessons: Lesson[];
  locked?: boolean;
}

export interface Course {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  hero: string;
  durationHrs: number;
  modules: Module[];
  enrolled: boolean;
  progress: number; // 0..1
  passingScore: number;
  level: "Foundational" | "Intermediate" | "Advanced";
  accent: string;
  is_scorm?: boolean;
  scorm_package?: any;
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  courseIds: string[];
  certificationName: string;
}

export const LEARNING_PATHS: LearningPath[] = [];

export interface Certificate {
  id: string;
  courseId: string;
  courseTitle: string;
  learnerName: string;
  score: number;
  issuedAt: string;
  expiresAt: string;
  verificationCode: string;
}

export const CERTIFICATES: Certificate[] = [];

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji fallback
  earned: boolean;
}

export const BADGES: Badge[] = [];

export interface LeaderboardEntry {
  rank: number;
  name: string;
  region: string;
  points: number;
  initials: string;
  isYou?: boolean;
}

export const LEADERBOARD: LeaderboardEntry[] = [];

export type QuestionKind = "single" | "multi" | "true_false" | "drag_match";

export interface BaseQuestion {
  id: string;
  prompt: string;
  explanation: string;
  kind: QuestionKind;
}

export interface SingleChoiceQ extends BaseQuestion {
  kind: "single";
  options: string[];
  correct: number;
}
export interface MultiChoiceQ extends BaseQuestion {
  kind: "multi";
  options: string[];
  correct: number[];
}
export interface TrueFalseQ extends BaseQuestion {
  kind: "true_false";
  correct: boolean;
}
export interface DragMatchQ extends BaseQuestion {
  kind: "drag_match";
  left: string[]; // terms
  right: string[]; // definitions, same order as correct match for `left`
}

export type Question = SingleChoiceQ | MultiChoiceQ | TrueFalseQ | DragMatchQ;
