import { ApiResponse } from '../../apiTypes';

/** A dish guests often order with this one (backend services/pairings.service.ts). `line` is the
 * server's copy; `addable` says whether the guest may add it to this order from the tracker. */
export interface Pairing {
  productId: string;
  name: string;
  pricePaise: number;
  line: string;
  addable: boolean;
}

export interface DailyQuestionOption {
  id: string;
  label: string;
  emoji?: string;
}

export interface DailyQuestion {
  id: string;
  text: string;
  options: DailyQuestionOption[];
}

export interface WhileYouWaitData {
  pairings: Pairing[];
  question: DailyQuestion | null;
}

/** The mascot's line for the answer, and a gesture name (one of the mascot's gestures). */
export interface AnswerReply {
  reply: string;
  gesture: string;
}

export type GetWhileYouWaitResponse = ApiResponse<WhileYouWaitData>;
export type AnswerResponse = ApiResponse<AnswerReply>;
