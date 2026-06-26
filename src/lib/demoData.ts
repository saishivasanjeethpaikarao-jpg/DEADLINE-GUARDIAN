import { Task } from '../types';

export const mockTasks: Task[] = [
  {
    id: "demo-task-1",
    userId: "demo-user",
    name: "AI Ethics Presentation",
    description: "Prepare and deliver a 10-minute slides presentation regarding fairness in algorithmic systems for the VIBE2SHIP Hackathon.",
    deadline: new Date(Date.now() + 32 * 60 * 60 * 1000).toISOString(), // ~1.3 days from now
    priority: "high",
    status: "in_progress",
    estimatedDurationMinutes: 180,
    category: "study",
    locationHint: "Campus Library - Zone A",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    calendarEventIds: [],
    subtasks: [
      {
        id: "sub-1-1",
        name: "Research fairness frameworks & metrics",
        durationMinutes: 45,
        order: 1,
        status: "completed",
        scheduledStart: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        scheduledEnd: new Date(Date.now() - 3.25 * 60 * 60 * 1000).toISOString(),
        alarmNote: "Time to research! Set up at the library desk, read 3 core papers, and highlight key bias metrics. Let's do this! 📚"
      },
      {
        id: "sub-1-2",
        name: "Outline slide deck hierarchy & main slides",
        durationMinutes: 30,
        order: 2,
        status: "completed",
        scheduledStart: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        scheduledEnd: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
        alarmNote: "Structuring outline! Open a notepad, map your 5 key slides, and draft strong titles. Keep it clear and impactful! ✍️"
      },
      {
        id: "sub-1-3",
        name: "Design visuals and refine slide content",
        durationMinutes: 60,
        order: 3,
        status: "pending",
        scheduledStart: new Date(Date.now() + 10 * 1000).toISOString(), // Triggers immediately after login for demo!
        scheduledEnd: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        alarmNote: "Design time! Open slides, apply high-contrast layout grids, and make slide 3 incredibly descriptive. Focus up! 🎨"
      },
      {
        id: "sub-1-4",
        name: "Mock delivery rehearsal under timing constraints",
        durationMinutes: 30,
        order: 4,
        status: "pending",
        scheduledStart: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        scheduledEnd: new Date(Date.now() + 4.5 * 60 * 60 * 1000).toISOString(),
        alarmNote: "Rehearsal mode! Find a private booth, set a 10-minute countdown timer, and record yourself. Finish strong! 🗣️"
      },
      {
        id: "sub-1-5",
        name: "Incorporate slide feedback & submission review",
        durationMinutes: 15,
        order: 5,
        status: "pending",
        scheduledStart: new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString(),
        scheduledEnd: new Date(Date.now() + 20.25 * 60 * 60 * 1000).toISOString(),
        alarmNote: "Final sweep! Crosscheck bias definitions, review guidelines, and export as PDF. Let's get that submission in! 🏆"
      }
    ],
    prepMaterials: {
      outline: "### VIBE2SHIP Hackathon Presentation Structure\n\n#### 1. Core Problem Framing (Slides 1-2)\n- Hook the jury with real-world incidents of machine learning biases.\n- Frame algorithmic fairness as a fundamental software requirement.\n\n#### 2. Key Frameworks (Slides 3-5)\n- Demographic Parity: equal output proportions across groups.\n- Equalized Odds: equal true positive and false positive rates.\n- Trade-offs: explain why mathematically we cannot satisfy all fairness metrics simultaneously.\n\n#### 3. Practical Solutions (Slides 6-8)\n- Pre-processing: debiasing training data samples.\n- In-processing: introducing regularizers in the cost function.\n- Post-processing: adjusting classifier decision thresholds.\n\n#### 4. Q&A and Milestones (Slide 9-10)\n- Anticipate metrics limitations and explain next-phase testing strategies.",
      talkingPoints: [
        "Biases aren't just technical; they mirror historic structural discrimination present in dataset collections.",
        "A 2% drop in model accuracy is a highly reasonable trade-off if it eliminates systematic bias in hiring recommendations.",
        "Democratizing access to audit logs is our primary risk mitigation strategy."
      ],
      resources: [
        "AIF360 Fair AI Toolkit (IBM Research)",
        "Google AI Fairness Indicators Guide",
        "VIBE2SHIP Hackathon Submission Rules Guidelines"
      ],
      practiceQuestions: [
        "How do you justify your model's choice of Equalized Odds over Demographic Parity?",
        "What data pre-processing debiasing techniques did you implement?",
        "If a jury member claims your dataset is too small to audit bias, how would you respond?"
      ],
      emailTemplates: [
        {
          name: "VIBE2SHIP Hackathon Extension Request",
          subject: "Extension Request: Team [Your Team Name] - VIBE2SHIP Project Submission",
          body: "Dear Hackathon Committee,\n\nI hope this message finds you well.\n\nWe are currently polishing our algorithmic fairness audits and would love to ask if there's any grace window of up to 2 hours for submissions on Friday. This would ensure our live demo and bias graphs are absolutely pristine.\n\nThank you for organizing such a stellar hackathon!\n\nBest regards,\n[Your Name]\nDeadline Guardian Team ID: [Team ID]"
        },
        {
          name: "Submission Cover Email",
          subject: "Project Submission: Team [Your Team Name] - Deadline Guardian Solution",
          body: "Dear Review Team,\n\nWe are proud to submit our project 'Deadline Guardian' for the VIBE2SHIP Hackathon.\n\nEnclosed are our code repository, video overview, and design checklist documents. We successfully incorporated Google Gemini AI and Google Calendar APIs to deliver automated task block scheduling.\n\nWe look forward to your valuable feedback!\n\nBest regards,\n[Your Name]"
        }
      ],
      checklist: [
        "Double-check that demographic variables are completely removed from model inputs.",
        "Perform a full 10-minute verbal run-through to verify slide timings.",
        "Generate slide PDF export and verify link sharing permissions.",
        "Verify your Firebase database rules prevent unauthorized reads."
      ]
    }
  }
];
