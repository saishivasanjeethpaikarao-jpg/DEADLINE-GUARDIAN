# System Architecture & Technical Specifications

This document outlines the detailed system architecture, API schemas, and data structures of **Deadline Guardian (AURA)**.

---

## 🛠️ High-Level Technical Stack

AURA is a full-stack JavaScript application built with React, Vite, Express, and Google Gemini.

```text
       ┌─────────────────────────────────────────────────────┐
       │                 React Client (Vite)                 │
       │  (State Managers, Focus Timers, Immersive Panels)   │
       └───────────┬─────────────────────────────▲───────────┘
                   │                             │
        HTTPS Requests (JSON)            Real-time Sync
                   │                             │
                   ▼                             │
       ┌─────────────────────────────────────────┴───────────┐
       │                   Express Backend                   │
       │    (Session Validation, Proxy Routing, Prompts)     │
       └───────────┬─────────────────────────────┬───────────┘
                   │                             │
                   ▼                             ▼
       ┌───────────────────────┐     ┌───────────────────────┐
       │     Gemini SDK API    │     │   Cloud Firestore DB  │
       │  (AI-driven planning) │     │ (Storage & Checklists)│
       └───────────────────────┘     └───────────────────────┘
```

---

## 💾 Core Data Structures

### 1. Mission Document Schema (`/users/{userId}/tasks/{taskId}`)
Every deadline mission parsed by AURA is kept as a document inside Cloud Firestore:

```typescript
interface Task {
  id: string;                 // Unique identifier
  name: string;               // High-level mission name (e.g. "Biology Final Project")
  deadline: string;           // ISO DateTime String
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;           // 'work', 'study', 'health', 'personal', etc.
  description: string;        // AI-enhanced context or initial notes
  locationHint?: string;      // Geographic context (e.g., "Main Library, Room 4B")
  status: 'active' | 'completed' | 'failed' | 'danger';
  riskScore: number;          // Calculated percentage (0 to 100)
  subtasks: Subtask[];        // Ordered sequential execution plan
  createdAt: string;          // ISO Timestamp
}
```

### 2. Subtask Blueprint (`Subtask`)
A subtask represents an atomic block of execution containing its own local state:

```typescript
interface Subtask {
  id: string;
  name: string;               // Subtask specific name
  durationMinutes: number;    // Standard estimated duration block
  completed: boolean;         // Checkpoint status
  startedAt?: string;         // Focus track timestamp
  completedAt?: string;       // Focus end timestamp
}
```

---

## 🤖 AI Reasoning & Prompt Engineering

AURA leverages the `@google/genai` modern SDK client to execute zero-shot planning tasks. Below is a conceptual representation of the structural instruction matrix used in the backend:

```text
System Prompt Role: Executive Chief of Staff
Parameters:
  - Input: Conversational objective text, time remaining, available resources.
  - JSON Schema constraints to prevent hallucination.
  - Required JSON keys:
    * "estimatedHours" (number)
    * "subtasks" (Array of {name, durationMinutes})
    * "riskAssessment" (string)
    * "recommendedLocation" (string)
```

---

## 🔒 Security Posture

1.  **Server-Side Proxies**: The Google AI Studio Gemini SDK is called strictly inside Express middleware routes. No client-side code can access or leak the API key.
2.  **Strict Security Rules**: Access to Firestore collections is guarded by User authentication tokens matching request namespaces.
