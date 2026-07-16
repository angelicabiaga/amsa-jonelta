import React, { useEffect, useState, useMemo } from 'react';
import { api } from './api.js';
import logo from "./assets/logo.jpg"; // adjust the path

/* ------------------------------------------------------------------ *
 *  Root
 * ------------------------------------------------------------------ */
export default function App() {
  const [session, setSession] = useState(null); // { role, profile, breakdown, total }

  if (!session) return <Login onLogin={setSession} />;
  if (session.role === 'admin') return <AdminDashboard profile={session.profile} onLogout={() => setSession(null)} />;
  return <MemberDashboard session={session} onLogout={() => setSession(null)} />;
}

/* ------------------------------------------------------------------ *
 *  Login — Student ID only, no password. Role is resolved by the backend.
 * ------------------------------------------------------------------ */
function Login({ onLogin }) {
  const [amsaStudentId, setAmsaStudentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!amsaStudentId.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.login(amsaStudentId.trim());
      if (res.success) {
        onLogin(res);
      } else {
        setError(res.error || 'Something went wrong.');
      }
    } catch (err) {
      setError('Could not reach the AMSA server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
       <div className="auth-badge">
  <img src={logo} alt="AMSA Logo" className="auth-logo" />
</div>
        <h1 className="auth-title">Point Tracker</h1>
        <p className="auth-subtitle">Enter your Student ID to see your standing.</p>
        <form onSubmit={submit} className="auth-form">
          <label htmlFor="amsaStudentId">Student ID</label>
          <input
            id="amsaStudentId"
            autoFocus
            placeholder="e.g. 25-0****"
            value={amsaStudentId}
            onChange={(e) => setAmsaStudentId(e.target.value)}
          />
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" disabled={loading}>
            {loading ? 'Checking…' : 'Continue'}
          </button>
        </form>
        <p className="auth-footnote">Admins and members both sign in with their Student ID.</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Shared shell
 * ------------------------------------------------------------------ */
function Shell({ eyebrow, title, name, onLogout, children }) {
  return (
    <div className="shell">
      <header className="shell-header">
        <div>
          <div className="shell-eyebrow">{eyebrow}</div>
          <h1 className="shell-title">{title}</h1>
        </div>
        <div className="shell-user">
          <span>{name}</span>
          <button className="btn-ghost" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </header>
      <main className="shell-main">{children}</main>
    </div>
  );
}

function CommitteeTag({ committee }) {
  if (!committee) return <span className="tag tag-empty">—</span>;
  return <span className="tag">{committee}</span>;
}

function StatusPill({ status }) {
  const cls = String(status).toLowerCase() === 'international' ? 'pill pill-intl' : 'pill pill-local';
  return <span className={cls}>{status}</span>;
}

function RankBadge({ rank }) {
  if (rank > 3) return <span className="rank-plain">{rank}</span>;
  return <span className={`rank-medal rank-medal-${rank}`}>{rank}</span>;
}

/* ==================================================================== *
 *  MEMBER VIEW
 * ==================================================================== */
function MemberDashboard({ session, onLogout }) {
  const { profile } = session;
  const [breakdown, setBreakdown] = useState(session.breakdown);
  const [total, setTotal] = useState(session.total);
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [registeringId, setRegisteringId] = useState(null);
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState('points');

  const registeredNames = useMemo(() => new Set(breakdown.map((b) => b.label)), [breakdown]);

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    setLoadingEvents(true);
    const res = await api.getEvents();
    if (res.success) setEvents(res.events);
    setLoadingEvents(false);
  }

  async function register(eventId) {
    setRegisteringId(eventId);
    setMessage('');
    try {
      const res = await api.registerEvent(profile.AmsaStudentId, eventId);
      if (res.success) {
        setBreakdown(res.breakdown);
        setTotal(res.total);
        setMessage(`Registered! +${res.pointsAwarded} points added automatically.`);
      } else {
        setMessage(res.error);
      }
    } finally {
      setRegisteringId(null);
    }
  }

  return (
    <Shell eyebrow="Member view" title="Your points" name={profile.name} onLogout={onLogout}>
      <section className="profile-card">
        <div>
          <div className="profile-name">{profile.name}</div>
          <div className="profile-meta">
            <span>{profile.yearLevel}</span>
            <span className="dot">•</span>
            <span>{profile.AmsaStudentId}</span>
            <span className="dot">•</span>
            <StatusPill status={profile.status} />
            <span className="dot">•</span>
            <CommitteeTag committee={profile.committee} />
          </div>
        </div>
        <div className="profile-total">
          <div className="profile-total-number">{total}</div>
          <div className="profile-total-label">total points</div>
        </div>
      </section>

      <nav className="tabbar">
        <button className={tab === 'points' ? 'tab active' : 'tab'} onClick={() => setTab('points')}>
          Point breakdown
        </button>
        <button className={tab === 'events' ? 'tab active' : 'tab'} onClick={() => setTab('events')}>
          Events
        </button>
      </nav>

      {tab === 'points' && (
        <section className="panel">
          <h2 className="panel-title">Where your points come from</h2>
          <ul className="breakdown-list">
            {breakdown.map((b, i) => (
              <li key={i} className="breakdown-row">
                <div>
                  <div className="breakdown-label">{b.label}</div>
                  <div className="breakdown-category">{b.category}</div>
                </div>
                <div className="breakdown-points">+{b.points}</div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === 'events' && (
        <section className="panel">
          <div className="panel-header-row">
            <h2 className="panel-title">Open events</h2>
            {message && <div className="inline-message">{message}</div>}
          </div>
          {loadingEvents ? (
            <p className="muted">Loading events…</p>
          ) : (
            <div className="event-grid">
              {events.map((ev) => {
                const already = registeredNames.has(ev.eventName);
                return (
                  <div key={ev.eventId} className={`event-card ${!ev.isOpen ? 'event-card-closed' : ''}`}>
                    <div className="event-card-top">
                      <span className="tag tag-category">{ev.category}</span>
                      <span className="event-points">+{ev.points} pts</span>
                    </div>
                    <h3 className="event-name">{ev.eventName}</h3>
                    <p className="event-dates">
                      {formatDate(ev.startDate)} – {formatDate(ev.endDate)}
                    </p>
                    {already ? (
                      <button className="btn-secondary" disabled>
                        Registered
                      </button>
                    ) : !ev.isOpen ? (
                      <button className="btn-secondary" disabled>
                        Registration closed
                      </button>
                    ) : (
                      <button
                        className="btn-primary"
                        disabled={registeringId === ev.eventId}
                        onClick={() => register(ev.eventId)}
                      >
                        {registeringId === ev.eventId ? 'Registering…' : 'Register'}
                      </button>
                    )}
                  </div>
                );
              })}
              {events.length === 0 && <p className="muted">No events have been posted yet.</p>}
            </div>
          )}
        </section>
      )}
    </Shell>
  );
}

/* ==================================================================== *
 *  ADMIN VIEW
 * ==================================================================== */
function AdminDashboard({ profile, onLogout }) {
  const [tab, setTab] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [rankings, setRankings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    const [ov, rk] = await Promise.all([api.getAdminOverview(), api.getRankings()]);
    if (ov.success) setOverview(ov);
    if (rk.success) setRankings(rk);
    setLoading(false);
  }

  const filteredRows = useMemo(() => {
    if (!overview) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return overview.rows;
    return overview.rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        String(r.AmsaStudentId).toLowerCase().includes(q) ||
        String(r.committee).toLowerCase().includes(q)
    );
  }, [overview, filter]);

  return (
    <Shell eyebrow="AMSA-Jonelta Admin view" title="Members Point Tracker Overview" name={profile.name} onLogout={onLogout}>
      <nav className="tabbar">
        <button className={tab === 'overview' ? 'tab active' : 'tab'} onClick={() => setTab('overview')}>
          Members &amp; points
        </button>
        <button className={tab === 'events' ? 'tab active' : 'tab'} onClick={() => setTab('events')}>
          Manage events
        </button>
        <button className={tab === 'rankings' ? 'tab active' : 'tab'} onClick={() => setTab('rankings')}>
          Rankings
        </button>
      </nav>

      {loading && <p className="muted">Loading…</p>}

      {!loading && tab === 'overview' && overview && (
        <section className="panel">
          <div className="panel-header-row">
            <h2 className="panel-title">All members</h2>
            <div className="panel-actions">
              <input
                className="search-input"
                placeholder="Search name, ID, or committee"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
              <button className="btn-primary" onClick={() => setShowAddEvent(true)}>
                + Add event
              </button>
            </div>
          </div>

          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Year level</th>
                  <th>Student ID</th>
                  <th>Status</th>
                  <th>Committee</th>
                  {overview.eventColumns.map((ev) => (
                    <th key={ev.eventId} title={ev.category}>
                      {ev.eventName}
                    </th>
                  ))}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r) => (
                  <tr key={r.AmsaStudentId}>
                    <td className="cell-strong">{r.name}</td>
                    <td>{r.yearLevel}</td>
                    <td className="cell-mono">{r.AmsaStudentId}</td>
                    <td>
                      <StatusPill status={r.status} />
                    </td>
                    <td>
                      <CommitteeTag committee={r.committee} />
                    </td>
                    {overview.eventColumns.map((ev) => (
                      <td key={ev.eventId} className="cell-mono cell-center">
                        {r.points[ev.eventId] != null ? `+${r.points[ev.eventId]}` : '—'}
                      </td>
                    ))}
                    <td className="cell-total">{r.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!loading && tab === 'events' && <EventsManager onChanged={refresh} />}

      {!loading && tab === 'rankings' && rankings && (
        <section className="ranking-grid">
          <RankingTable title="Local ranking" rows={rankings.local} />
          <RankingTable title="International ranking" rows={rankings.international} />
        </section>
      )}

      {showAddEvent && (
        <EventModal
          mode="add"
          onClose={() => setShowAddEvent(false)}
          onSaved={() => {
            setShowAddEvent(false);
            refresh();
          }}
        />
      )}
    </Shell>
  );
}

/* ------------------------------------------------------------------ *
 *  Admin — Manage events (new)
 * ------------------------------------------------------------------ */
function EventsManager({ onChanged }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState(null); // event object being edited, or null
  const [pendingDelete, setPendingDelete] = useState(null); // event object awaiting delete confirmation
  const [deletingId, setDeletingId] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const res = await api.getEvents();
    if (res.success) setEvents(res.events);
    setLoading(false);
  }

  async function confirmDelete() {
    const ev = pendingDelete;
    if (!ev) return;
    setDeletingId(ev.eventId);
    setMessage('');
    try {
      const res = await api.deleteEvent(ev.eventId);
      if (res.success) {
        setMessage(`"${ev.eventName}" was deleted.`);
        setPendingDelete(null);
        await load();
        onChanged && onChanged();
      } else {
        setMessage(res.error || 'Could not delete this event.');
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="panel">
      <div className="panel-header-row">
        <h2 className="panel-title">Manage events</h2>
        {message && <div className="inline-message">{message}</div>}
      </div>

      {loading ? (
        <p className="muted">Loading events…</p>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Event name</th>
                <th>Category</th>
                <th>Points</th>
                <th>Opens</th>
                <th>Closes</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.eventId}>
                  <td className="cell-strong">{ev.eventName}</td>
                  <td>
                    <span className="tag tag-category">{ev.category}</span>
                  </td>
                  <td className="cell-mono cell-center">+{ev.points}</td>
                  <td>{formatDate(ev.startDate)}</td>
                  <td>{formatDate(ev.endDate)}</td>
                  <td>{ev.isOpen ? 'Open' : 'Closed'}</td>
                  <td>
                    <div className="panel-actions">
                      <button className="btn-outline" onClick={() => setEditingEvent(ev)}>
                        Edit
                      </button>
                      <button
                        className="btn-outline btn-outline-danger"
                        disabled={deletingId === ev.eventId}
                        onClick={() => setPendingDelete(ev)}
                      >
                        {deletingId === ev.eventId ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <td colSpan={7} className="muted">
                    No events have been created yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editingEvent && (
        <EventModal
          mode="edit"
          initialEvent={editingEvent}
          onClose={() => setEditingEvent(null)}
          onSaved={async () => {
            setEditingEvent(null);
            await load();
            onChanged && onChanged();
          }}
        />
      )}

      {pendingDelete && (
        <ConfirmDeleteModal
          eventName={pendingDelete.eventName}
          deleting={deletingId === pendingDelete.eventId}
          onCancel={() => setPendingDelete(null)}
          onConfirm={confirmDelete}
        />
      )}
    </section>
  );
}

/**
 * Styled stand-in for window.confirm — used before permanently deleting
 * an event.
 */
function ConfirmDeleteModal({ eventName, deleting, onCancel, onConfirm }) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="panel-title">Delete event?</h2>
        <p className="muted">
          This will permanently delete <strong>{eventName}</strong> and cannot be undone. Members who already
          registered will lose the points from this event.
        </p>
        <div className="modal-actions">
          <button type="button" className="btn-ghost-light" onClick={onCancel} disabled={deleting}>
            Cancel
          </button>
          <button type="button" className="btn-danger" onClick={onConfirm} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete event'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RankingTable({ title, rows }) {
  return (
    <div className="panel">
      <h2 className="panel-title">{title}</h2>
      <table className="data-table ranking-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Name</th>
            <th>Year level</th>
            <th>Committee</th>
            <th>Points</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.AmsaStudentId}>
              <td>
                <RankBadge rank={r.rank} />
              </td>
              <td className="cell-strong">{r.name}</td>
              <td>{r.yearLevel}</td>
              <td>
                <CommitteeTag committee={r.committee} />
              </td>
              <td className="cell-total">{r.total}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="muted">
                No members in this category yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Handles both creating a new event ("add") and editing an existing one
 * ("edit"). In edit mode, initialEvent pre-fills the form and the submit
 * calls api.updateEvent instead of api.addEvent.
 */
function EventModal({ mode, initialEvent, onClose, onSaved }) {
  const isEdit = mode === 'edit';
  const [eventName, setEventName] = useState(initialEvent?.eventName || '');
  const [points, setPoints] = useState(initialEvent?.points ?? 1);
  const [category, setCategory] = useState(initialEvent?.category || 'Attendance');
  const [startDate, setStartDate] = useState(toDateInputValue(initialEvent?.startDate));
  const [endDate, setEndDate] = useState(toDateInputValue(initialEvent?.endDate));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!eventName.trim()) {
      setError('Event name is required.');
      return;
    }
    setSaving(true);
    setError('');
    const payload = { eventName: eventName.trim(), points: Number(points), category, startDate, endDate };
    const res = isEdit ? await api.updateEvent(initialEvent.eventId, payload) : await api.addEvent(payload);
    setSaving(false);
    if (res.success) onSaved();
    else setError(res.error || 'Could not save this event.');
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="panel-title">{isEdit ? 'Edit event' : 'Add event'}</h2>
        <form onSubmit={submit} className="modal-form">
          <label>
            Event name
            <input value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="e.g. General Assembly" />
          </label>
          <div className="modal-row">
            <label>
              Points on registration
              <input type="number" min="0" value={points} onChange={(e) => setPoints(e.target.value)} />
            </label>
            <label>
              Category
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="Attendance">Attendance</option>
                <option value="Extras">Extras</option>
              </select>
            </label>
          </div>
          <div className="modal-row">
            <label>
              Registration opens
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </label>
            <label>
              Registration closes
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </label>
          </div>
          {error && <div className="auth-error">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn-ghost-light" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Utils
 * ------------------------------------------------------------------ */
function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// Converts an ISO datetime string (what the backend returns) into the
// yyyy-mm-dd shape an <input type="date"> needs to pre-fill correctly.
function toDateInputValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}