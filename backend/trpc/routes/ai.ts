import OpenAI from "openai";
import * as z from "zod";

import { createTRPCRouter, publicProcedure } from "../create-context";

const taskItemSchema = z.object({
  text: z.string(),
  estimatedMinutes: z.number(),
  goal: z.string(),
  rule: z.string(),
  doThis: z.string(),
  priority: z.number(),
});

const taskResponseSchema = z.object({
  tasks: z.array(taskItemSchema),
});

const MAX_TOP_TASKS = 3;
const MAX_TOTAL_MINUTES = 150;
const MAX_TASKS_TO_RETURN = 10;

function buildSystemPrompt(isInitialLoad: boolean, taskCount: number): string {
  const taskLimit = isInitialLoad
    ? `, prioritized so the top ${MAX_TOP_TASKS} fit within ${MAX_TOTAL_MINUTES} minutes total`
    : "";
  return `You are generating tasks for a "Today's Plan" app. Analyze the user's tasks and return up to ${MAX_TASKS_TO_RETURN} tasks${taskLimit}.

Respond with a single JSON object of the form: { "tasks": [ { "text", "estimatedMinutes", "goal", "rule", "doThis", "priority" }, ... ] }

For each task:
1. Parse the task text and clean it up to be concise.
2. Estimate duration intelligently (e.g., "run 30 min" → 30, "wash dishes" → 12, "quick email" → 5).
3. Generate:
   - goal: One very short word or phrase that captures the mental container of the task. Keep it minimal and calming (e.g., "Stop visual bleed", "Containment", "Clear the queue").
   - rule: One short, practical sentence that limits decision-making and keeps the user focused (e.g., "No extra organizing allowed", "One pass only").
   - doThis: One exact, immediate action the user can start right now. Keep it micro, self-contained, and bounded.

${isInitialLoad ? `4. Prioritize by: Containment / minimizing clutter, Simplicity / low effort first, Urgency / deadlines.` : "4. Assign priority based on task order (first task = priority 1)."}

Always assume the user wants to minimize chaos and mental load. Return ALL tasks (up to ${MAX_TASKS_TO_RETURN}) ordered by priority (1 = highest). Do not add extra commentary—only valid JSON.`;
}

function buildUserMessage(taskTexts: string[]): string {
  return `Tasks to analyze:\n${taskTexts.map((t, i) => `${i + 1}. ${t}`).join("\n")}`;
}

export const aiRouter = createTRPCRouter({
  generateTasks: publicProcedure
    .input(
      z.object({
        taskTexts: z.array(z.string()).min(1),
        isInitialLoad: z.boolean(),
      }),
    )
    .mutation(async ({ input }) => {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error(
          "OPENAI_API_KEY is not set. Add it to your backend environment.",
        );
      }

      const client = new OpenAI({ apiKey });
      const systemPrompt = buildSystemPrompt(
        input.isInitialLoad,
        input.taskTexts.length,
      );
      const userMessage = buildUserMessage(input.taskTexts);

      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        response_format: { type: "json_object" },
      });

      const raw = completion.choices[0]?.message?.content;
      if (!raw) {
        throw new Error("OpenAI returned no content");
      }

      const parsed = JSON.parse(raw) as unknown;
      return taskResponseSchema.parse(parsed);
    }),
});
