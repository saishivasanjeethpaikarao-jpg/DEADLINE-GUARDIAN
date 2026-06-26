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
