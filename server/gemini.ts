import { GoogleGenAI, Type } from '@google/genai';

// Initialize the Google Gen AI client lazily to avoid crashing on start if the key is missing
let aiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("WARNING: GEMINI_API_KEY environment variable is not set. Real AI responses will fail. Please add it via the Secrets Panel.");
    }
    aiClient = new GoogleGenAI({ apiKey: apiKey || "MOCK_KEY" });
  }
  return aiClient;
}

/**
 * Parses user speech or text input into a highly structured JSON Task object.
 */
export async function parseTaskWithAI(userInput: string, currentTimeIso: string): Promise<any> {
  const ai = getGeminiClient();
  const prompt = `
You are an advanced agentic productivity coach for "Deadline Guardian".
Your task is to parse the user's natural language or voice input into a highly structured JSON task outline.

Current Time/Date Reference: ${currentTimeIso}
User Input: "${userInput}"

Strict Guidelines:
1. "task_name": Concise name of the task (max 6 words).
2. "deadline": Calculate the absolute deadline in ISO 8601 format. If no clear deadline is mentioned, default to 3 days from the reference time at exactly 5:00 PM.
3. "priority": Assess the urgency and importance. Return exactly one of: 'low' | 'medium' | 'high' | 'critical'.
4. "estimated_duration_minutes": Reasonable total estimate of minutes needed for this entire project.
5. "subtasks": Generate 3 to 6 distinct, sequential subtasks to complete this project. Each subtask must have:
   - "name": Concise actionable step name (e.g., "Draft Introduction Slide", "Research Competitors").
   - "duration_minutes": Logical duration of this specific step.
   - "order": 1-indexed order.
6. "category": One of 'work' | 'study' | 'personal' | 'health' | 'finance' | 'other'.
7. "location_hint": The optimal location to perform this task (e.g. "Library", "Desk", "Home", "Outdoors").
8. "description": A 1-sentence supportive description of the task objective.

Return ONLY a valid, parseable JSON object matching this TypeScript structure:
{
  "task_name": string,
  "deadline": string,
  "priority": "low" | "medium" | "high" | "critical",
  "estimated_duration_minutes": number,
  "subtasks": [
    { "name": string, "duration_minutes": number, "order": number }
  ],
  "category": string,
  "location_hint": string,
  "description": string
}

Ensure the response contains NO Markdown wrapper lines like \`\`\`json. Just the raw JSON content.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = response.text?.trim() || "{}";
    // Strip markdown wrappers if returned
    const cleanJson = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Gemini parseTaskWithAI error:", error);
    // Fallback Mock data
    return {
      task_name: "Mock Task: " + userInput.substring(0, 30),
      deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      priority: "high",
      estimated_duration_minutes: 120,
      subtasks: [
        { name: "Initial preparation & brainstorming", duration_minutes: 30, order: 1 },
        { name: "Execution and deep focus sprint", duration_minutes: 60, order: 2 },
        { name: "Final review and corrections", duration_minutes: 30, order: 3 }
      ],
      category: "work",
      location_hint: "Home Desk",
      description: "Auto-generated fallback plan for: " + userInput
    };
  }
}

/**
 * Optimizes scheduling of the subtasks by analyzing free slots, peak productivity windows, and task parameters.
 */
export async function generateScheduleWithAI(
  taskName: string,
  subtasks: any[],
  deadlineIso: string,
  existingEvents: any[],
  peakHours: number[]
): Promise<any> {
  const ai = getGeminiClient();
  const prompt = `
You are the "Deadline Guardian" scheduler agent. Your objective is to auto-schedule blocks of time on a calendar for sequential subtasks leading up to a final deadline.

Task Name: "${taskName}"
Deadline: ${deadlineIso}
Subtasks to schedule: ${JSON.stringify(subtasks)}
Busy periods to avoid on the calendar: ${JSON.stringify(existingEvents)}
User's peak high-energy hours of day: ${JSON.stringify(peakHours)} (e.g. [9, 10, 11] means 9 AM to noon is prime slot)

Strict Rules:
1. Schedule every subtask sequentially with no overlapping slots.
2. Ensure ALL subtasks are scheduled and fully completed BEFORE the final deadline (${deadlineIso}).
3. Avoid scheduling during busy periods.
4. Try to place complex, longer subtasks during the user's peak hours when possible.
5. Provide a 15-minute buffer between subtasks.
6. Only schedule within reasonable hours (e.g. 8:00 AM to 9:00 PM) unless highly urgent.
7. Return a JSON array of scheduled blocks mapping directly to each subtask:
   [
     {
       "subtaskIndex": number (matching order or array index),
       "name": string,
       "startTime": "ISO 8601 string",
       "endTime": "ISO 8601 string",
       "reasoning": "Brief human-friendly sentence explaining why this slot is perfect (e.g. 'Scheduled during your peak energy hours for maximum focus.')"
     }
   ]

Return ONLY raw parseable JSON array. No markdown markup.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = response.text?.trim() || "[]";
    const cleanJson = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Gemini generateScheduleWithAI error, using fallback scheduling:", error);
    // Simple chronological fallback scheduler
    const schedule: any[] = [];
    let currentStart = new Date(Date.now() + 2 * 60 * 60 * 1000); // Start in 2 hours
    
    subtasks.forEach((sub, i) => {
      // Avoid midnight hours
      if (currentStart.getHours() > 21 || currentStart.getHours() < 8) {
        currentStart.setHours(9, 0, 0, 0);
        currentStart.setDate(currentStart.getDate() + 1);
      }
      
      const end = new Date(currentStart.getTime() + sub.duration_minutes * 60 * 1000);
      schedule.push({
        subtaskIndex: i,
        name: sub.name,
        startTime: currentStart.toISOString(),
        endTime: end.toISOString(),
        reasoning: "Allocated sequentially to guarantee on-time completion before deadline."
      });
      currentStart = new Date(end.getTime() + 15 * 60 * 1000); // 15 mins buffer
    });
    return schedule;
  }
}

/**
 * Generates an inspiring, context-aware, highly personalized coaching alert notes.
 */
export async function generateCoachNoteWithAI(
  taskName: string,
  subtaskName: string,
  deadlineIso: string,
  locationHint: string,
  timeOfDay: string
): Promise<string> {
  const ai = getGeminiClient();
  const hoursLeft = Math.max(0.5, (new Date(deadlineIso).getTime() - Date.now()) / (1000 * 60 * 60));
  const roundedHours = hoursLeft.toFixed(1);

  const prompt = `
You are the ultimate motivational companion and productivity mentor for "Deadline Guardian".
The user's alarm is ringing NOW for a critical task:
Task: "${taskName}"
Actionable Step: "${subtaskName}"
Final Deadline: ${deadlineIso} (${roundedHours} hours remaining!)
Optimal Location Context: "${locationHint}"
Time of day: "${timeOfDay}"

Write a highly engaging, personalized, punchy 1-to-2 sentence coach alert note.
Requirements:
1. Explain exactly what they should do RIGHT NOW.
2. Sound incredibly supportive, warm, and energizing—like a great coach or parent (not an AI robot!).
3. Infuse context about their location/time if relevant (e.g., "Grab a coffee, head over to your ${locationHint} setup, and let's crush this!").
4. Keep it direct and empowering.
5. End with exactly ONE epic emoji.

Return ONLY the raw message string. No JSON wrapper, no quotes.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text?.trim() || `Time to tackle "${subtaskName}"! Let's get to work and make this project a masterpiece! 🚀`;
  } catch (error) {
    console.error("Gemini generateCoachNoteWithAI error:", error);
    return `Let's dive into "${subtaskName}" right away! You've got this! 🌟`;
  }
}

/**
 * Generates structured study and preparation guides for the project.
 */
export async function generatePrepMaterialsWithAI(taskName: string, description: string): Promise<any> {
  const ai = getGeminiClient();
  const prompt = `
You are an elite study tutor and preparation assistant.
Generate rich, complete preparation materials to help a student/professional master and execute this task:
Task Name: "${taskName}"
Task Description: "${description}"

Generate a structured JSON guide with:
1. "outline": A complete structured outline of key concepts or slides (markdown formatted string).
2. "talkingPoints": 3-4 powerful talking points or key presentation arguments.
3. "resources": 3-4 highly useful online tools, guides, or resources (with high-quality names).
4. "practiceQuestions": 3 helpful reflection or interview practice questions.
5. "emailTemplates": Array of 2 helpful templates:
   - "name": e.g. "Request for Extension", "Submission Cover Email"
   - "subject": Email subject line
   - "body": Professional email body text with [Placeholder] fields.
6. "checklist": 4-5 tactical quality checklist items to audit the final submission.

Return ONLY valid raw parseable JSON. Do NOT wrap in markdown.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = response.text?.trim() || "{}";
    const cleanJson = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Gemini generatePrepMaterialsWithAI error:", error);
    return {
      outline: "### Task Strategy & Outline\n- **Phase 1: Foundation**: Analyze core guidelines and collect materials.\n- **Phase 2: Drafting**: Construct the initial draft and build the logic flow.\n- **Phase 3: Refinement**: Polish presentation and prepare for final reviews.",
      talkingPoints: [
        "Clearly frame the core problem and outline how your solution solves it.",
        "Emphasize the unique metrics, values, or benefits of your proposal.",
        "End with a clear, concise summary of the next steps and long-term milestones."
      ],
      resources: [
        "Google Workspace Collaboration Tools & Templates",
        "Google Developers Codelabs & Code Reference Manuals",
        "Canva / Google Slides Presentation design frameworks"
      ],
      practiceQuestions: [
        "What is the most innovative part of your approach, and why does it matter?",
        "How would you address a potential scalability or execution constraint?",
        "What is your primary measure of success for this task?"
      ],
      emailTemplates: [
        {
          name: "Submission Email template",
          subject: "Project Submission: [Task Name] - [Your Name]",
          body: "Dear Review Team,\n\nI am pleased to submit my final files for [Task Name]. All milestones have been met, and the checklist completed.\n\nThank you for this opportunity!\n\nBest regards,\n[Your Name]"
        },
        {
          name: "Urgent Extension Request template",
          subject: "Extension Request: [Task Name] - [Your Name]",
          body: "Dear [Recipient Name],\n\nI am writing to request a brief extension for [Task Name] due to unexpected adjustments in scheduling. I would appreciate if we could adjust the deadline to [Proposed Date].\n\nThank you for your understanding.\n\nSincerely,\n[Your Name]"
        }
      ],
      checklist: [
        "Review and align spelling, grammar, and typography standard.",
        "Crosscheck deliverables against initial assignment instructions.",
        "Verify all active links and shared assets are accessible to reviewers.",
        "Execute a mock practice run under actual time constraints."
      ]
    };
  }
}

/**
 * Analyzes current task progress and generates actionable, motivational, or reschedule suggestions.
 */
export async function generateGuardianInsightsWithAI(tasksJson: string, currentTimeIso: string): Promise<any> {
  const ai = getGeminiClient();
  const prompt = `
You are the "Deadline Guardian" productivity intelligence agent.
Analyze the user's active task progress, deadlines, and milestones:

Current Reference Time: ${currentTimeIso}
Active Tasks list:
${tasksJson}

Strict Guidelines:
1. Generate exactly 3 personalized, proactive "Guardian Insights" to help the user succeed.
2. Ensure the tone is highly supportive, warm, and empowering (acting like an active coach, never dry or robotic).
3. Types of insights can be:
   - "motivation": encouraging advice for starting or continuing high-priority tasks
   - "schedule_alert": proactive warning if deadlines are tight, or suggestions to shift schedules
   - "praise": celebrating completed milestones or active focus streaks
4. Urgencies can be: "low" | "medium" | "high". High urgency is for overdue or critical subtasks close to deadlines.
5. Provide a specific, concise human-friendly title and a 1-to-2 sentence detailed message.
6. Provide a short action label (max 3 words) like "Start focus mode", "Check details", "View calendar" to prompt immediate action.

Return ONLY a valid, parseable JSON object matching this structure:
{
  "insights": [
    {
      "id": string,
      "type": "motivation" | "schedule_alert" | "praise",
      "urgency": "low" | "medium" | "high",
      "title": string,
      "message": string,
      "actionLabel": string
    }
  ]
}

Ensure the response contains NO Markdown wrapper lines. Just raw JSON.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            insights: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  type: { type: Type.STRING },
                  urgency: { type: Type.STRING },
                  title: { type: Type.STRING },
                  message: { type: Type.STRING },
                  actionLabel: { type: Type.STRING },
                },
                required: ["id", "type", "urgency", "title", "message", "actionLabel"],
              },
            },
          },
          required: ["insights"],
        },
      },
    });

    const text = response.text?.trim() || "{}";
    const cleanJson = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Gemini generateGuardianInsightsWithAI error:", error);
    // Return high quality fallback insights
    return {
      insights: [
        {
          id: "fallback_1",
          type: "motivation",
          urgency: "medium",
          title: "Slight Friction Detected",
          message: "You have a few pending subtasks on your list. Let's start a quick 25-minute distraction-free focus sprint to tackle the first milestone!",
          actionLabel: "Launch Focus Mode"
        },
        {
          id: "fallback_2",
          type: "schedule_alert",
          urgency: "low",
          title: "Energy Hours Optimal",
          message: "The afternoon is approaching! If you feel fatigued, try shifting complex analysis tasks into your morning peak slot tomorrow.",
          actionLabel: "Adjust Calendar"
        },
        {
          id: "fallback_3",
          type: "praise",
          urgency: "low",
          title: "Guardian Shield Strong",
          message: "Your focus streak is active and your accountability partner is kept in the loop! Continue logging subtasks to maintain momentum.",
          actionLabel: "View Milestones"
        }
      ]
    };
  }
}

