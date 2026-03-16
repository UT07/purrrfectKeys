/**
 * Cloud Function: Generate Coach Feedback
 * Called from client when user completes an exercise
 * Returns AI-generated coaching feedback using Gemini 2.0 Flash
 */
interface CoachFeedbackResponse {
    feedback: string;
    suggestedNextAction: 'retry' | 'continue' | 'practice_specific';
    practiceExerciseId?: string;
    cached: boolean;
}
export declare const generateCoachFeedback: import("firebase-functions/v2/https").CallableFunction<any, Promise<CoachFeedbackResponse>, unknown>;
export declare const cleanupCoachFeedbackCache: import("firebase-functions/v2/scheduler").ScheduleFunction;
export {};
//# sourceMappingURL=generateCoachFeedback.d.ts.map