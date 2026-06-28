import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { google } from "googleapis";

// Load environment variables
dotenv.config();

// Imports for our AI helpers
import {
  parseTaskWithAI,
  generateScheduleWithAI,
  generateCoachNoteWithAI,
  generatePrepMaterialsWithAI,
  generateGuardianInsightsWithAI,
  generateSmartEmailDraftWithAI,
  breakdownSubtaskWithAI,
  getGuardianCompanionResponse,
} from "./server/gemini";

const app = express();
const PORT = 3000;

app.use(express.json());

// API: Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API: Parse natural language or voice input into structured tasks
app.post("/api/gemini/parse", async (req, res) => {
  try {
    const { text, currentTime } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Missing text query" });
    }
    const parsed = await parseTaskWithAI(text, currentTime || new Date().toISOString());
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error("API Error - gemini parse:", error);
    res.status(500).json({ error: "Failed to parse task input", details: error.message });
  }
});

// API: Generate optimal sequential subtask schedules on the calendar
app.post("/api/gemini/schedule", async (req, res) => {
  try {
    const { taskName, subtasks, deadline, existingEvents, peakHours } = req.body;
    if (!taskName || !subtasks || !deadline) {
      return res.status(400).json({ error: "Missing required schedule parameters" });
    }
    const schedule = await generateScheduleWithAI(
      taskName,
      subtasks,
      deadline,
      existingEvents || [],
      peakHours || [9, 10, 11, 14, 15]
    );
    res.json({ success: true, data: schedule });
  } catch (error: any) {
    console.error("API Error - gemini schedule:", error);
    res.status(500).json({ error: "Failed to generate schedule slots", details: error.message });
  }
});

// API: Generate a highly persuasive real-time coach notes/alarm text
app.post("/api/gemini/alarm-note", async (req, res) => {
  try {
    const { taskName, subtaskName, deadline, locationHint, timeOfDay } = req.body;
    if (!taskName || !subtaskName || !deadline) {
      return res.status(400).json({ error: "Missing alarm parameters" });
    }
    const note = await generateCoachNoteWithAI(
      taskName,
      subtaskName,
      deadline,
      locationHint || "Desk",
      timeOfDay || "day"
    );
    res.json({ success: true, note });
  } catch (error: any) {
    console.error("API Error - gemini alarm-note:", error);
    res.status(500).json({ error: "Failed to generate coach note", details: error.message });
  }
});

// API: Generate complete customized preparation and learning materials
app.post("/api/gemini/prep", async (req, res) => {
  try {
    const { taskName, description } = req.body;
    if (!taskName) {
      return res.status(400).json({ error: "Missing taskName" });
    }
    const prep = await generatePrepMaterialsWithAI(taskName, description || "");
    res.json({ success: true, data: prep });
  } catch (error: any) {
    console.error("API Error - gemini prep:", error);
    res.status(500).json({ error: "Failed to generate prep materials", details: error.message });
  }
});

// API: Generate real-time Guardian Insights about current task progress
app.post("/api/gemini/insights", async (req, res) => {
  try {
    const { tasks, currentTime } = req.body;
    if (!tasks) {
      return res.status(400).json({ error: "Missing active tasks list" });
    }
    const insights = await generateGuardianInsightsWithAI(
      JSON.stringify(tasks),
      currentTime || new Date().toISOString()
    );
    res.json({ success: true, data: insights });
  } catch (error: any) {
    console.error("API Error - gemini insights:", error);
    res.status(500).json({ error: "Failed to generate insights", details: error.message });
  }
});

// API: Break down an overwhelming subtask into smaller bite-sized steps
app.post("/api/gemini/breakdown-subtask", async (req, res) => {
  try {
    const { taskName, subtaskName, durationMinutes } = req.body;
    if (!taskName || !subtaskName || !durationMinutes) {
      return res.status(400).json({ error: "Missing required breakdown parameters" });
    }
    const breakdown = await breakdownSubtaskWithAI(
      taskName,
      subtaskName,
      Number(durationMinutes)
    );
    res.json({ success: true, data: breakdown });
  } catch (error: any) {
    console.error("API Error - gemini breakdown-subtask:", error);
    res.status(500).json({ error: "Failed to break down subtask", details: error.message });
  }
});

// API: Guardian chatbot companion for chat, mic voice input/output, file analysis and agentic controls
app.post("/api/gemini/guardian-companion", async (req, res) => {
  try {
    const { message, history, appState, attachments } = req.body;
    if (!message || !appState) {
      return res.status(400).json({ error: "Missing required companion parameters" });
    }
    const companionResponse = await getGuardianCompanionResponse(
      message,
      history || [],
      appState,
      attachments || []
    );
    res.json({ success: true, data: companionResponse });
  } catch (error: any) {
    console.error("API Error - gemini companion:", error);
    res.status(500).json({ error: "Failed companion interaction", details: error.message });
  }
});

// ==================== SMART EMAIL AGENT ENDPOINTS ====================

// Utility to build a MIME email message
function buildMimeMessage(to: string, subject: string, body: string, cc?: string) {
  const parts = [
    `To: ${to}`,
    cc ? `Cc: ${cc}` : null,
    `Subject: =?utf-8?B?${Buffer.from(subject).toString("base64")}?=`,
    `Content-Type: text/html; charset=utf-8`,
    `MIME-Version: 1.0`,
    "",
    body.replace(/\n/g, "<br/>"),
  ].filter(Boolean);

  const message = parts.join("\r\n");
  const encodedMessage = Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return encodedMessage;
}

// API: Generate structured email drafts with Gemini
app.post("/api/gemini/draft-email", async (req, res) => {
  try {
    const { task, pastEmailsContext, currentTime } = req.body;
    if (!task) {
      return res.status(400).json({ error: "Missing task details" });
    }
    const draft = await generateSmartEmailDraftWithAI(
      task,
      pastEmailsContext || "",
      currentTime || new Date().toISOString()
    );
    res.json({ success: true, data: draft });
  } catch (error: any) {
    console.error("API Error - gemini draft-email:", error);
    res.status(500).json({ error: "Failed to generate email draft", details: error.message });
  }
});

// API: Fetch recent emails for relationship history and contact lookup
app.get("/api/gmail/recent-emails", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.replace("Bearer ", "") : (req.query.token as string);

    if (!token || token === "mock-google-token") {
      // High-quality mock emails for guest / unauthorized users
      return res.json({
        success: true,
        emails: [
          { from: "Professor Miller <prof.miller@university.edu>", subject: "RE: Research Project Milestone", snippet: "I received your draft of the proposal. It looks solid but make sure to add the metrics as discussed.", date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
          { from: "Alice Smith <alice.smith@designstudio.com>", subject: "Design Review Assets", snippet: "Here are the shared style guide templates and logo assets for your review. Let me know when ready.", date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
          { from: "Bob Jones <bob.jones@techventures.com>", subject: "Follow-up on Client Pitch", snippet: "Great work on the slides yesterday. Please send me the updated financial summary once compiled.", date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() }
        ]
      });
    }

    const oauth2Client = getGoogleAuth(token);
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const response = await gmail.users.messages.list({
      userId: "me",
      maxResults: 15,
    });

    const messages = response.data.messages || [];
    const emailsList: any[] = [];

    for (const msg of messages) {
      if (msg.id) {
        try {
          const detailedMsg = await gmail.users.messages.get({
            userId: "me",
            id: msg.id,
          });

          const headers = detailedMsg.data.payload?.headers || [];
          const from = headers.find((h) => h.name?.toLowerCase() === "from")?.value || "";
          const to = headers.find((h) => h.name?.toLowerCase() === "to")?.value || "";
          const subject = headers.find((h) => h.name?.toLowerCase() === "subject")?.value || "";
          const date = headers.find((h) => h.name?.toLowerCase() === "date")?.value || "";
          const snippet = detailedMsg.data.snippet || "";

          emailsList.push({
            id: msg.id,
            from,
            to,
            subject,
            snippet,
            date,
          });
        } catch (e) {
          console.warn(`Could not fetch message details for ${msg.id}:`, e);
        }
      }
    }

    res.json({ success: true, emails: emailsList });
  } catch (error: any) {
    console.error("Google Gmail List Messages Error:", error);
    res.status(500).json({ error: "Failed to fetch recent emails", details: error.message });
  }
});

// API: Send email via Gmail
app.post("/api/gmail/send-email", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.replace("Bearer ", "") : req.body.token;

    if (!token) {
      return res.status(401).json({ error: "Unauthorized: Missing Google OAuth Access Token" });
    }

    const { to, subject, body, cc } = req.body;
    if (!to || !subject || !body) {
      return res.status(400).json({ error: "Missing to, subject, or body" });
    }

    if (token === "mock-google-token") {
      // Guest/Simulated user success
      return res.json({ success: true, message: "Demo email sent successfully (Simulated)" });
    }

    const oauth2Client = getGoogleAuth(token);
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const encodedMessage = buildMimeMessage(to, subject, body, cc);

    const result = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedMessage,
      },
    });

    res.json({ success: true, message: "Email sent successfully", data: result.data });
  } catch (error: any) {
    console.error("Google Gmail Send Error:", error);
    res.status(500).json({ error: "Failed to send email", details: error.message });
  }
});

// ==================== GOOGLE CALENDAR PROXY ENDPOINTS ====================

// Helper to configure OAuth2 Client dynamically with client token
function getGoogleAuth(token: string) {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: token });
  return oauth2Client;
}

// API: Fetch Google Calendar Events
app.get("/api/calendar/events", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.replace("Bearer ", "") : (req.query.token as string);

    if (!token) {
      return res.status(401).json({ error: "Unauthorized: Missing Google OAuth Access Token" });
    }

    const { timeMin, timeMax } = req.query;
    const oauth2Client = getGoogleAuth(token);
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: (timeMin as string) || new Date().toISOString(),
      timeMax: (timeMax as string) || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    res.json({ success: true, events: response.data.items || [] });
  } catch (error: any) {
    console.error("Google Calendar List Events Error:", error);
    res.status(500).json({ error: "Failed to fetch calendar events", details: error.message });
  }
});

// API: Create Google Calendar Event
app.post("/api/calendar/create-event", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.replace("Bearer ", "") : req.body.token;

    if (!token) {
      return res.status(401).json({ error: "Unauthorized: Missing Google OAuth Access Token" });
    }

    const { event } = req.body;
    if (!event) {
      return res.status(400).json({ error: "Missing event body" });
    }

    const oauth2Client = getGoogleAuth(token);
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
    });

    res.json({ success: true, event: response.data });
  } catch (error: any) {
    console.error("Google Calendar Create Event Error:", error);
    res.status(500).json({ error: "Failed to create calendar event", details: error.message });
  }
});

// API: Delete Google Calendar Event
app.post("/api/calendar/delete-event", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.replace("Bearer ", "") : req.body.token;

    if (!token) {
      return res.status(401).json({ error: "Unauthorized: Missing Google OAuth Access Token" });
    }

    const { eventId } = req.body;
    if (!eventId) {
      return res.status(400).json({ error: "Missing eventId" });
    }

    const oauth2Client = getGoogleAuth(token);
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    await calendar.events.delete({
      calendarId: "primary",
      eventId,
    });

    res.json({ success: true, message: "Event deleted successfully" });
  } catch (error: any) {
    console.error("Google Calendar Delete Event Error:", error);
    res.status(500).json({ error: "Failed to delete calendar event", details: error.message });
  }
});

// ==================== MOUNT VITE / STATIC MIDDLEWARES ====================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Deadline Guardian Backend Server] running on http://localhost:${PORT}`);
  });
}

startServer();
