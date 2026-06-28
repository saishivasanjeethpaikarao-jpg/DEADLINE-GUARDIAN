import { db } from './firebase';
import { SmartEmail, Task } from '../types';
import {
  collection, doc, setDoc, getDocs, deleteDoc,
  query, where, orderBy
} from 'firebase/firestore';

const EMAILS_COLL = 'emails';

/**
 * Gets persistent Firestore emails or cached guest emails
 */
export async function getEmailsForUser(userId: string): Promise<SmartEmail[]> {
  try {
    if (userId === 'demo-user') {
      const local = localStorage.getItem('dg_local_emails_demo');
      if (local) return JSON.parse(local);
      return [];
    }

    const q = query(
      collection(db, EMAILS_COLL), 
      where('userId', '==', userId), 
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    const firestoreEmails = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SmartEmail));

    try {
      localStorage.setItem(`dg_emails_${userId}`, JSON.stringify(firestoreEmails));
    } catch (lc) {}
    return firestoreEmails;
  } catch (e) {
    console.error("Error fetching emails from Firestore, returning local cache:", e);
    const cached = localStorage.getItem(`dg_emails_${userId}`);
    if (cached) return JSON.parse(cached);
    return [];
  }
}

/**
 * Save or update an email in Firestore / local fallback
 */
export async function saveEmailToDb(email: SmartEmail): Promise<void> {
  try {
    if (email.userId === 'demo-user') {
      const current = localStorage.getItem('dg_local_emails_demo');
      let list = current ? JSON.parse(current) : [];
      const index = list.findIndex((e: SmartEmail) => e.id === email.id);
      if (index > -1) {
        list[index] = email;
      } else {
        list.unshift(email);
      }
      localStorage.setItem('dg_local_emails_demo', JSON.stringify(list));
      return;
    }

    const docRef = doc(db, EMAILS_COLL, email.id);
    await setDoc(docRef, email, { merge: true });

    // Keep local cache up to date
    try {
      const current = localStorage.getItem(`dg_emails_${email.userId}`);
      let list = current ? JSON.parse(current) : [];
      const index = list.findIndex((e: SmartEmail) => e.id === email.id);
      if (index > -1) list[index] = email;
      else list.unshift(email);
      localStorage.setItem(`dg_emails_${email.userId}`, JSON.stringify(list));
    } catch (lc) {}
  } catch (e) {
    console.error("Error saving email to Firestore:", e);
    // Write fallback to local cache
    const current = localStorage.getItem(`dg_emails_${email.userId}`);
    let list = current ? JSON.parse(current) : [];
    const index = list.findIndex((e: SmartEmail) => e.id === email.id);
    if (index > -1) list[index] = email;
    else list.unshift(email);
    localStorage.setItem(`dg_emails_${email.userId}`, JSON.stringify(list));
  }
}

/**
 * Delete an email draft
 */
export async function deleteEmailFromDb(emailId: string, userId: string): Promise<void> {
  try {
    if (userId === 'demo-user') {
      const current = localStorage.getItem('dg_local_emails_demo');
      if (current) {
        let list = JSON.parse(current);
        list = list.filter((e: SmartEmail) => e.id !== emailId);
        localStorage.setItem('dg_local_emails_demo', JSON.stringify(list));
      }
      return;
    }

    const docRef = doc(db, EMAILS_COLL, emailId);
    await deleteDoc(docRef);

    // Keep local cache up to date
    try {
      const current = localStorage.getItem(`dg_emails_${userId}`);
      if (current) {
        let list = JSON.parse(current);
        list = list.filter((e: SmartEmail) => e.id !== emailId);
        localStorage.setItem(`dg_emails_${userId}`, JSON.stringify(list));
      }
    } catch (lc) {}
  } catch (e) {
    console.error("Error deleting email:", e);
  }
}

/**
 * Call backend to generate an email draft using Gemini
 */
export async function draftEmailWithGemini(task: Task, pastEmailsContext: string): Promise<any> {
  const response = await fetch('/api/gemini/draft-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      task,
      pastEmailsContext,
      currentTime: new Date().toISOString()
    })
  });
  const res = await response.json();
  if (!res.success) throw new Error(res.error || 'Failed to generate draft with Gemini');
  return res.data;
}

/**
 * Call backend to list inbox/sent emails to establish relationship histories
 */
export async function getRecentEmailsFromGmail(token: string): Promise<any[]> {
  const response = await fetch(`/api/gmail/recent-emails?token=${encodeURIComponent(token)}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const res = await response.json();
  if (!res.success) throw new Error(res.error || 'Failed to fetch messages');
  return res.emails || [];
}

/**
 * Call backend to send the approved email through Gmail API
 */
export async function sendEmailViaGmail(
  to: string,
  subject: string,
  body: string,
  cc: string,
  token: string
): Promise<any> {
  const response = await fetch('/api/gmail/send-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ to, subject, body, cc })
  });
  const res = await response.json();
  if (!res.success) throw new Error(res.error || 'Failed to send email via Gmail');
  return res;
}
