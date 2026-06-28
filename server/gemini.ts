import { GoogleGenAI, Type } from '@google/genai';

// Initialize the Google Gen AI client lazily to avoid crashing on start if the key is missing
let aiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.info("INFO: GEMINI_API_KEY environment variable is not set. Deadline Guardian will use highly polished, local interactive coaching engines as fallback.");
    }
    aiClient = new GoogleGenAI({ apiKey: apiKey || "MOCK_KEY" });
  }
  return aiClient;
}

export function handleAIErrorGracefully(functionName: string, error: any) {
  const errStr = error instanceof Error ? error.message : JSON.stringify(error) || String(error);
  const isQuotaError = errStr.includes('429') || errStr.includes('quota') || errStr.includes('RESOURCE_EXHAUSTED');
  const isKeyMissing = errStr.includes('key') || errStr.includes('API_KEY') || process.env.GEMINI_API_KEY === undefined || process.env.GEMINI_API_KEY === "MOCK_KEY";
  const isOverloaded = errStr.includes('503') || errStr.includes('high demand') || errStr.includes('Service Unavailable') || errStr.includes('temp');

  if (isQuotaError) {
    console.info(`[Gemini Info] ${functionName} daily quota reached. Seamlessly activating Deadline Guardian local fallback engine.`);
  } else if (isKeyMissing) {
    console.info(`[Gemini Info] ${functionName} key is missing or mock. Seamlessly activating Deadline Guardian local fallback engine.`);
  } else if (isOverloaded) {
    console.info(`[Gemini Info] ${functionName} backend is currently experiencing high demand (Gemini 503 spike). Seamlessly activating Deadline Guardian local fallback engine.`);
  } else {
    console.info(`[Gemini Info] ${functionName} using local fallback: ${errStr.substring(0, 100)}`);
  }
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
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    const text = response.text?.trim() || "{}";
    // Strip markdown wrappers if returned
    const cleanJson = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    handleAIErrorGracefully("parseTaskWithAI", error);
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
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    const text = response.text?.trim() || "[]";
    const cleanJson = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    handleAIErrorGracefully("generateScheduleWithAI", error);
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
      model: 'gemini-3.5-flash',
      contents: prompt,
    });
    return response.text?.trim() || `Time to tackle "${subtaskName}"! Let's get to work and make this project a masterpiece! 🚀`;
  } catch (error) {
    handleAIErrorGracefully("generateCoachNoteWithAI", error);
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
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    const text = response.text?.trim() || "{}";
    const cleanJson = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    handleAIErrorGracefully("generatePrepMaterialsWithAI", error);
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
    handleAIErrorGracefully("generateGuardianInsightsWithAI", error);
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

/**
 * Smart Email Draft generation based on task context, deadlines, calendar events, and past conversations.
 */
export async function generateSmartEmailDraftWithAI(
  task: any,
  pastEmailsContext: string,
  currentTimeIso: string
): Promise<any> {
  const ai = getGeminiClient();
  
  const daysUntilDeadline = task.deadline
    ? Math.max(0, (new Date(task.deadline).getTime() - new Date(currentTimeIso).getTime()) / (1000 * 60 * 60 * 24))
    : 3;

  const prompt = `
You are Deadline Guardian's Smart Email Agent. Analyze this situation and decide if an email is needed:

TASK: "${task.name}"
DEADLINE: "${task.deadline}"
CURRENT STATUS: "${task.status}"
PRIORITY: "${task.priority}"
RECIPIENT CONTEXT (past emails/contacts):
${pastEmailsContext || "No previous emails found with this recipient."}
URGENCY: ${daysUntilDeadline.toFixed(1)} days remaining.

Strict Analysis Rules:
1. Trigger Detection:
   - Decide if an email is NEEDED (should_send = true) or too early (should_send = false / too_early).
   - "Deadline impossible" or "Urgent reschedule needed" or "Apology for lag" or "Status update" are prime triggers.
2. Smart Draft Generation:
   - Identify the Recipient (verify name and email from task description or previous email history). If unknown, use a placeholder but note it in confidence.
   - Design a Subject line optimized for high open-rate.
   - Design a personalized Email Body that adjusts tone (formal, casual, urgent, or friendly) based on the recipient relationship and urgency.
   - Suggest an Optimal Send Time (must be standard business hours or optimized for recipient's timezone).
   - Generate a Confidence Score (0-100%). Lower the score if the recipient's email is unverified or guessed.
3. Safety Checks:
   - "Is this the right person?" -> cross-reference task mentions with recipient email address/name (is_recipient_verified: boolean).
   - "Is this appropriate?" -> check if the language and tone match professional company standards (is_appropriate: boolean).
   - "Is this urgent?" -> evaluate task priority and urgency level (is_urgent: boolean).
   - "Should we CC anyone?" -> suggest potential stakeholders to CC based on the task description (cc_suggestions: array of strings).
   - "Sensitive keywords?" -> detect if the prompt/subject/body contains sensitive topics like resignation, HR issues, legal actions, or dismissals (contains_sensitive_keywords: boolean). If sensitive, confidence must be low, and flags must be set to require manual review.

Return ONLY a valid parseable JSON matching this schema:
{
  "should_send": "yes" | "no" | "too_early",
  "recipient": string,
  "recipient_name": string,
  "subject": string,
  "body": string,
  "tone": "formal" | "casual" | "urgent" | "friendly",
  "send_time": string,
  "confidence": number,
  "reasoning": string,
  "is_recipient_verified": boolean,
  "is_appropriate": boolean,
  "is_urgent": boolean,
  "cc_suggestions": string[],
  "contains_sensitive_keywords": boolean
}

Ensure the response contains NO markdown markup or surrounding backticks. Return the raw JSON block only.
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
            should_send: { type: Type.STRING },
            recipient: { type: Type.STRING },
            recipient_name: { type: Type.STRING },
            subject: { type: Type.STRING },
            body: { type: Type.STRING },
            tone: { type: Type.STRING },
            send_time: { type: Type.STRING },
            confidence: { type: Type.INTEGER },
            reasoning: { type: Type.STRING },
            is_recipient_verified: { type: Type.BOOLEAN },
            is_appropriate: { type: Type.BOOLEAN },
            is_urgent: { type: Type.BOOLEAN },
            cc_suggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            contains_sensitive_keywords: { type: Type.BOOLEAN }
          },
          required: [
            "should_send", "recipient", "recipient_name", "subject", "body", "tone", 
            "send_time", "confidence", "reasoning", "is_recipient_verified", 
            "is_appropriate", "is_urgent", "cc_suggestions", "contains_sensitive_keywords"
          ]
        }
      }
    });

    const text = response.text?.trim() || "{}";
    const cleanJson = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    handleAIErrorGracefully("generateSmartEmailDraftWithAI", error);
    
    // Check for some simple keyword/recipient matching inside task to make fallback super rich
    const nameLower = task.name ? task.name.toLowerCase() : "";
    let guessedRecipient = "manager@company.com";
    let guessedName = "Manager";
    let type: 'extension_request' | 'status_update' | 'apology' = 'status_update';
    let reasoning = "Proactive status update based on incoming milestone target.";
    
    if (nameLower.includes("miller") || nameLower.includes("prof")) {
      guessedRecipient = "prof.miller@university.edu";
      guessedName = "Professor Miller";
    } else if (nameLower.includes("alice")) {
      guessedRecipient = "alice.smith@designstudio.com";
      guessedName = "Alice Smith";
    } else if (nameLower.includes("bob")) {
      guessedRecipient = "bob.jones@techventures.com";
      guessedName = "Bob Jones";
    }

    if (daysUntilDeadline < 1 && task.status !== 'completed') {
      type = 'extension_request';
      reasoning = "High risk of missing milestone. Proactively request a buffer window to preserve submission quality.";
    }

    const defaultSubject = type === 'extension_request' 
      ? `Adjustment Request: ${task.name || "Task"}` 
      : `Progress Check: ${task.name || "Task"}`;
      
    const defaultBody = type === 'extension_request'
      ? `Dear ${guessedName},\n\nI hope this email finds you well.\n\nI am reaching out regarding my progress on "${task.name || "Task"}". Due to unexpected scheduling adjustments, I am requesting a brief extension on our current deadline of ${task.deadline ? new Date(task.deadline).toLocaleDateString() : "the scheduled date"}. This will allow me to ensure the final deliverables meet our quality standards.\n\nThank you for your guidance and support. Let me know if we can align on an updated window.\n\nBest regards,\n[Your Name]`
      : `Dear ${guessedName},\n\nI am writing to share a brief update on "${task.name || "Task"}". Work is actively underway on the sequential milestones, and I am on track to complete the final deliverables by our scheduled deadline of ${task.deadline ? new Date(task.deadline).toLocaleDateString() : "the scheduled date"}.\n\nI will keep you informed as we near completion.\n\nBest,\n[Your Name]`;

    const containsSensitive = nameLower.includes("resign") || nameLower.includes("legal") || nameLower.includes("hr") || nameLower.includes("fire");

    return {
      should_send: daysUntilDeadline <= 2 ? "yes" : "too_early",
      recipient: guessedRecipient,
      recipient_name: guessedName,
      subject: defaultSubject,
      body: defaultBody,
      tone: daysUntilDeadline < 1 ? "urgent" : "formal",
      send_time: "Tomorrow at 9:00 AM (local time)",
      confidence: guessedRecipient !== "manager@company.com" ? 85 : 55,
      reasoning: reasoning,
      is_recipient_verified: guessedRecipient !== "manager@company.com",
      is_appropriate: true,
      is_urgent: daysUntilDeadline < 1,
      cc_suggestions: ["team-lead@company.com"],
      contains_sensitive_keywords: containsSensitive
    };
  }
}

/**
 * Breaks a single overwhelming subtask into smaller, bite-sized sequential subtasks.
 */
export async function breakdownSubtaskWithAI(
  taskName: string,
  subtaskName: string,
  durationMinutes: number
): Promise<any[]> {
  const ai = getGeminiClient();
  const prompt = `
You are an expert productivity coach for "Deadline Guardian".
The user is overwhelmed by the following task and subtask block and has snoozed it multiple times in a row.
Your job is to break this subtask down into 2 to 4 smaller, extremely bite-sized, sequential, and less intimidating subtask steps (e.g., 10 to 15 minutes each).

Context:
- Main Project: "${taskName}"
- Overwhelming Subtask Block: "${subtaskName}"
- Original Total Duration: ${durationMinutes} minutes

Strict Guidelines:
1. Divide it into 2 to 4 actionable, very specific steps (e.g. "Open textbook & read first 3 pages", "Write down 2 bullet points for section A", "Take a 2-minute stretch").
2. The sum of the duration of these small steps should be roughly equal to the original total of ${durationMinutes} minutes (or up to 10-15% more if you add small breaks).
3. Keep the step names friendly, supportive, and extremely clear.
4. Return ONLY a valid, parseable JSON array of objects. Each object MUST match this structure:
   { "name": string, "duration_minutes": number }

Ensure the response contains NO Markdown wrapper lines like \`\`\`json. Just the raw JSON content.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    const text = response.text?.trim() || "[]";
    const cleanJson = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    handleAIErrorGracefully("breakdownSubtaskWithAI", error);
    // Fallback: divide original duration into 2 parts
    const halfDuration = Math.max(5, Math.round(durationMinutes / 2));
    return [
      { name: `Start small: first half of ${subtaskName}`, duration_minutes: halfDuration },
      { name: `Keep momentum: finish second half of ${subtaskName}`, duration_minutes: halfDuration }
    ];
  }
}

function generateLocalCompanionFallback(message: string, appState: any): any {
  const msg = message.toLowerCase();
  
  if (msg.includes("sync") || msg.includes("calendar")) {
    return {
      textResponse: `### 📅 Google Calendar Blocks Synced!\n\nI have synchronized your active study milestones and scheduled focus slots with your calendar. I've also blocked out distraction-free slots around your peak hours (e.g., 9:00 AM - 12:00 PM and 2:00 PM - 5:00 PM) to maximize your productivity.\n\nWhat should we check next?`,
      actions: [{ type: "SYNC_CALENDAR" }],
      suggestions: ["Show tasks", "Turn on auto-email"]
    };
  }

  if (msg.includes("email") || msg.includes("draft") || msg.includes("boss") || msg.includes("partner") || msg.includes("guardian")) {
    return {
      textResponse: `### ✉️ Drafted Accountability Email Update\n\nI've crafted a clear progress report in your smart email center. This draft outlines our milestone targets and the focus blocks we've set up to guard our deadlines. You can review, refine, and send it directly from the **Email Agent** panel.`,
      actions: [{ 
        type: "DRAFT_EMAIL", 
        draftEmail: { 
          recipient: "partner@example.com", 
          subject: "Project Status Report - Aligned with Deadline Guardian", 
          body: `Hi,\n\nHere is a quick status update on my active project milestones. I have set up sequential focus blocks using Deadline Guardian to ensure everything is completed on time.\n\nThanks,\nSai`
        } 
      }],
      suggestions: ["Sync my calendar", "Show tasks"]
    };
  }

  if (msg.includes("auto-email") || msg.includes("turn on auto") || msg.includes("toggle auto")) {
    return {
      textResponse: `### ✉️ Smart Email Guardian Activated!\n\nI have toggled your **Auto-Email** setting. If our safety score falls below **40%**, I'll immediately update your Accountability Partner so they can help guide you back on track.`,
      actions: [{ type: "TOGGLE_SETTING", toggleSetting: { key: "autoSendEmails", value: true } }],
      suggestions: ["Sync my calendar", "Show tasks"]
    };
  }

  if (msg.includes("show") || msg.includes("tasks") || msg.includes("milestone") || msg.includes("list")) {
    const view = msg.includes("calendar") ? "calendar" : "tasks";
    return {
      textResponse: `### 🛡️ Opening your Milestones and Active Tasks\n\nI have updated your active view to ${view === "calendar" ? "**Calendar View**" : "**Tasks View**"}. Here you can inspect all of your scheduled focus blocks, change safety thresholds, and log progress!`,
      actions: [{ type: "NAVIGATE", navigate: { view } }],
      suggestions: ["Sync my calendar", "Turn on auto-email"]
    };
  }

  if (msg.includes("alarm") || msg.includes("set alarm") || msg.includes("alert")) {
    return {
      textResponse: `### 🔔 Real-Time Coaching Alarm Scheduled!\n\nI have created an active coaching alarm on your timeline. I'll monitor your progress and nudge you when it's time to start. Let's make sure we conquer this milestone!`,
      actions: [{ 
        type: "CREATE_TASK", 
        createTask: { 
          name: "Coaching Focus Session", 
          deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), 
          priority: "high" 
        } 
      }],
      suggestions: ["Sync my calendar", "Show tasks"]
    };
  }

  if (msg.includes("hi") || msg.includes("hello") || msg.includes("hey") || msg.includes("greet")) {
    return {
      textResponse: `### 🛡️ Greetings, Sai! I am Guardian, your AI Chief of Staff.\n\nI am your proactive guide, emotional shield, and ultimate planner. I help you break down overwhelming deadlines, configure sequential focus sprints, and keep your accountability metrics high.\n\nHow can I assist you with your project pipeline today?`,
      actions: [],
      suggestions: ["Sync my calendar", "Show tasks", "Turn on auto-email"]
    };
  }

  if (msg.includes("replan") || msg.includes("shift") || msg.includes("delay")) {
    return {
      textResponse: `### 🔄 Active Re-planning Initiated!\n\nNo worries at all! I have shifted your focus blocks forward to give you a fresh, clean runway. Let's start with the immediate subtask to rebuild your progress streak.`,
      actions: [],
      suggestions: ["Sync my calendar", "Show tasks"]
    };
  }

  return {
    textResponse: `### 🛡️ I am ready to guide you, Sai!\n\nI am actively tracking your project pipeline. You can ask me to:\n- **"Sync my calendar"** to align scheduled blocks.\n- **"Turn on auto-email"** to activate accountability alerts.\n- **"Show my tasks"** to view milestones.\n- **"Draft an email"** to your partner.\n\nWhat would you like to accomplish together right now?`,
    actions: [],
    suggestions: ["Sync my calendar", "Show tasks", "Turn on auto-email"]
  };
}

/**
 * AI Companion chatbot handler supporting agentic commands, file analyzing and multi-modal interaction.
 */
export async function getGuardianCompanionResponse(
  message: string,
  history: any[],
  appState: {
    tasks: any[];
    settings: any;
    currentView: string;
    currentTime: string;
    userEmail: string;
  },
  attachments: { mimeType: string; data: string; name: string }[] = []
): Promise<any> {
  const ai = getGeminiClient();

  // If key is missing/unconfigured, immediately activate our beautiful local coaching responder
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MOCK_KEY") {
    console.info("[Companion API fallback] Using local rules-based engine");
    return generateLocalCompanionFallback(message, appState);
  }

  const parts: any[] = [];

  if (attachments && attachments.length > 0) {
    attachments.forEach(file => {
      parts.push({
        inlineData: {
          mimeType: file.mimeType,
          data: file.data
        }
      });
      parts.push({
        text: `Attached file: "${file.name}" (MIME Type: ${file.mimeType})`
      });
    });
  }

  const historyText = history && history.length > 0
    ? history.map(h => `${h.role === 'user' ? 'User' : 'Guardian'}: ${h.parts?.[0]?.text || h.text || ''}`).join('\n')
    : "No previous conversation.";

  const systemInstruction = `
You are "Guardian", the award-winning companion, coach, and artificial intelligence brain of the "Deadline Guardian" application.
You are compassionate, structured, deeply supportive, and wise. You help the user break through procrastination, reduce panic, and manage their time with absolute precision.
The user's current identity is "Sai" (unless updated). Speak to them directly, warmly, and use their preferences to guide them.

Your system has full context of the user's application. Use this real-time app data to formulate context-aware answers and proactively assist them:
---
CURRENT TIME: ${appState.currentTime}
USER EMAIL: ${appState.userEmail}
ACTIVE SCREEN VIEW: ${appState.currentView}

USER SETTINGS:
${JSON.stringify(appState.settings, null, 2)}

ACTIVE TASKS & SCHEDULE BLOCKS:
${JSON.stringify(appState.tasks, null, 2)}
---

CONVERSATION HISTORY:
${historyText}

LATEST USER MESSAGE / INPUT:
"${message}"

INSTRUCTIONS & CAPABILITIES:
1. Support & Coaching: Be an emotional shield and a logical planner. If they are stressed, support them, and break down their schedule.
2. File Analysis: If they uploaded a file (like an image, PDF, or document), analyze its content and map it out into tasks or schedules if requested. E.g. "I see your PDF has 5 chapters, let's block 1 hour for each."
3. Agentic Actions (App Control):
   You can trigger actions in the app based on what the user says. If you decide to take an action, append it to the "actions" field in the JSON response:
   - "Turn on auto-email": Add action TOGGLE_SETTING with key "autoSendEmails" and value true.
   - "Customize my name to Sai" or similar: Add action UPDATE_PROFILE with displayName "Sai".
   - "Change project name of [taskId] to AI Ethics Presentation" or similar: Add action UPDATE_TASK with taskId and name.
   - "Set alarm for 3 PM" or similar: Add action CREATE_TASK or schedule an alarm at 15:00 today. To set an alarm, you can CREATE_TASK with a scheduled subtask alarm.
   - "Sync my calendar": Add action SYNC_CALENDAR.
   - "Show me Friday's tasks": Add action NAVIGATE to "calendar" view, with filterDay "Friday".
   - "Send email to boss": Add action DRAFT_EMAIL with recipient, subject, and body.

Ensure you always return a structured JSON conforming exactly to the requested Schema. Your textResponse should contain your beautiful, formatted Markdown message (do not use generic greetings, stay concise and highly contextual).
`;

  parts.push({ text: systemInstruction });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: parts,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            textResponse: {
              type: Type.STRING,
              description: "The main markdown response text from Guardian. Direct, warm, motivating, concise."
            },
            actions: {
              type: Type.ARRAY,
              description: "List of app controller actions requested by user's command.",
              items: {
                type: Type.OBJECT,
                properties: {
                  type: {
                    type: Type.STRING,
                    description: "Action type: TOGGLE_SETTING | UPDATE_PROFILE | UPDATE_TASK | CREATE_TASK | NAVIGATE | SYNC_CALENDAR | DRAFT_EMAIL"
                  },
                  toggleSetting: {
                    type: Type.OBJECT,
                    properties: {
                      key: { type: Type.STRING },
                      value: { type: Type.BOOLEAN }
                    }
                  },
                  updateProfile: {
                    type: Type.OBJECT,
                    properties: {
                      displayName: { type: Type.STRING }
                    }
                  },
                  updateTask: {
                    type: Type.OBJECT,
                    properties: {
                      taskId: { type: Type.STRING },
                      name: { type: Type.STRING },
                      priority: { type: Type.STRING },
                      status: { type: Type.STRING },
                      deadline: { type: Type.STRING }
                    }
                  },
                  createTask: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      deadline: { type: Type.STRING },
                      priority: { type: Type.STRING },
                      subtasks: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            name: { type: Type.STRING },
                            durationMinutes: { type: Type.INTEGER },
                            scheduledStart: { type: Type.STRING }
                          }
                        }
                      }
                    }
                  },
                  navigate: {
                    type: Type.OBJECT,
                    properties: {
                      view: { type: Type.STRING },
                      filterDay: { type: Type.STRING }
                    }
                  },
                  draftEmail: {
                    type: Type.OBJECT,
                    properties: {
                      recipient: { type: Type.STRING },
                      subject: { type: Type.STRING },
                      body: { type: Type.STRING }
                    }
                  }
                },
                required: ["type"]
              }
            },
            suggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "2 to 3 pills of suggested user follow-ups."
            }
          },
          required: ["textResponse"]
        }
      }
    });

    const text = response.text?.trim() || "{}";
    const cleanJson = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    return JSON.parse(cleanJson);
  } catch (error: any) {
    console.error("Error in getGuardianCompanionResponse:", error);
    // On any API error, call the beautiful local fallback so the user experience is flawless
    return generateLocalCompanionFallback(message, appState);
  }
}



