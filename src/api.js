import { API_URL } from './config.js';

async function get(action, params = {}) {
  const url = new URL(API_URL);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  return res.json();
}

async function post(action, body = {}) {
  // Content-Type text/plain avoids a CORS preflight, which Apps Script web apps don't support.
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, ...body }),
  });
  return res.json();
}

export const api = {
  // FIX: was sending { studentId }, but the backend's doGet reads
  // e.parameter.AmsaStudentId (exact case) — the old key was always
  // arriving as undefined, which is why login always failed with
  // "Student ID is required." no matter what was typed.
  login: (amsaStudentId) => get('login', { AmsaStudentId: amsaStudentId }),

  getEvents: () => get('events'),
  getAdminOverview: () => get('adminOverview'),
  getRankings: () => get('rankings'),

  addEvent: (payload) => post('addEvent', payload),
  updateEvent: (eventId, payload) => post('updateEvent', { eventId, ...payload }),
  deleteEvent: (eventId) => post('deleteEvent', { eventId }),

  // FIX: same mismatch as login — the backend's registerEvent destructures
  // body.AmsaStudentId, not body.studentId.
  registerEvent: (amsaStudentId, eventId) => post('registerEvent', { AmsaStudentId: amsaStudentId, eventId }),
};