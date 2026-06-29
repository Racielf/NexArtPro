import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { nexartClient } from '@/api/nexartClient';
import {
  ChevronLeft, ChevronRight, Plus, X,
  Eye, Receipt, CheckCircle2, AlertCircle, Truck,
  HardHat, Flag, MapPin, Phone,
} from 'lucide-react';

// ─── DATE HELPERS ─────────────────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const WD = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const WD_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const TODAY = new Date();

function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function sameYMD(a, b) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}
function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    return { date: d, isOut: d.getMonth() !== month };
  });
}
function fmt0(v) {
  return '$' + (v || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function timeLabel(t) {
  if (!t) return '';
  try {
    const [h, m] = t.split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2,'0')}${h >= 12 ? 'p' : 'a'}`;
  } catch { return t || ''; }
}

// ─── TYPE SYSTEM — exact V3 palette ───────────────────────────────
const TYPE_META = {
  invoice:   { color: '#b07f1d', bg: '#f6ecce', Icon: Receipt,      label: 'Invoice'     },
  paid:      { color: '#15803d', bg: '#f0fdf4', Icon: CheckCircle2, label: 'Payment'     },
  overdue:   { color: '#b91c1c', bg: '#fef2f2', Icon: AlertCircle,  label: 'Overdue'     },
  visit:     { color: '#1f3a6b', bg: '#e6ecf7', Icon: MapPin,       label: 'Site visit'  },
  material:  { color: '#4b358f', bg: '#ece7f6', Icon: Truck,        label: 'Materials'   },
  crew:      { color: '#92400e', bg: '#efe1b1', Icon: HardHat,      label: 'Crew'        },
  milestone: { color: '#f5d989', bg: '#0a1226', Icon: Flag,         label: 'Milestone'   },
  call:      { color: '#4b5563', bg: '#ffffff', Icon: Phone,        label: 'Call'        },
};

const FILTERS = [
  { id: 'invoice',   label: 'Invoices issued',     color: '#b07f1d' },
  { id: 'paid',      label: 'Payments received',   color: '#15803d' },
  { id: 'overdue',   label: 'Overdue',             color: '#b91c1c' },
  { id: 'visit',     label: 'Site visits',         color: '#3a5d99' },
  { id: 'material',  label: 'Material deliveries', color: '#6c52b7' },
  { id: 'crew',      label: 'Crew schedule',       color: '#92400e' },
  { id: 'milestone', label: 'Milestones',          color: '#0a1226' },
  { id: 'call',      label: 'Calls',               color: '#6b7280' },
];

// ─── DATA NORMALIZATION ───────────────────────────────────────────
const APPT_TYPE_MAP = {
  scheduled: 'visit', confirmed: 'visit',
  on_the_way: 'crew', arrived: 'crew', in_progress: 'crew',
  visit_completed: 'milestone', completed: 'milestone',
  cancelled: 'call',
};

function apptToEvent(a) {
  return {
    id: `appt-${a.id}`, _id: a.id, _type: 'appointment',
    date: a.appointment_date || '',
    time: timeLabel(a.start_time),
    type: APPT_TYPE_MAP[a.status] || 'visit',
    title: a.title || a.service_type || 'Appointment',
    meta:  a.customer_display_name || a.description || '',
    clientName: a.customer_display_name || '',
  };
}

function invToEvents(inv) {
  const type = inv.status === 'paid' ? 'paid' : inv.status === 'overdue' ? 'overdue' : 'invoice';
  const date = (type === 'paid' && inv.paid_at)
    ? inv.paid_at.split('T')[0]
    : (inv.due_date || '');
  if (!date) return [];
  return [{
    id: `inv-${inv.id}`, _id: inv.id, _type: 'invoice',
    date, time: '', type,
    title: `Invoice ${inv.invoice_number || '#'}`,
    meta:  inv.client_name || '',
    amount: inv.total || 0,
    clientName: inv.client_name || '',
  }];
}

// ─── MINI CALENDAR ────────────────────────────────────────────────
function MiniCalendar({ cursor, selected, onPick, eventsByDate }) {
  const [y, m] = [cursor.getFullYear(), cursor.getMonth()];
  const days = buildMonthGrid(y, m);
  return (
    <div className="mini">
      <div className="mini-head">
        <div className="mini-month">{MONTHS[m]} {y}</div>
        <div className="mini-nav">
          <button onClick={() => onPick({ type: 'shift', delta: -1 })}><ChevronLeft size={13} /></button>
          <button onClick={() => onPick({ type: 'shift', delta: +1 })}><ChevronRight size={13} /></button>
        </div>
      </div>
      <div className="mini-grid">
        {WD_SHORT.map(w => <div key={w} className="mini-wd">{w[0]}</div>)}
        {days.map(({ date, isOut }, i) => {
          const isToday = sameYMD(date, TODAY);
          const isSel   = selected && sameYMD(date, selected);
          const has     = !!eventsByDate[ymd(date)];
          const cls = ['mini-day'];
          if (isOut) cls.push('is-out');
          if (isToday) cls.push('is-today');
          else if (isSel) cls.push('is-selected');
          if (has) cls.push('has-events');
          return (
            <div key={i} className={cls.join(' ')} onClick={() => onPick({ type: 'date', date })}>
              {date.getDate()}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── EVENT POPOVER ────────────────────────────────────────────────
function EventPopover({ ev, anchor, onClose, navigate }) {
  const { color, bg, Icon: IconComp, label } = TYPE_META[ev.type] || TYPE_META.visit;
  const ref = useRef(null);

  useEffect(() => {
    function out(e) { if (ref.current && !ref.current.contains(e.target)) onClose(); }
    const id = setTimeout(() => document.addEventListener('mousedown', out), 0);
    return () => { clearTimeout(id); document.removeEventListener('mousedown', out); };
  }, [onClose]);

  const pos = anchor ? {
    top:  Math.min(anchor.top,           window.innerHeight - 340),
    left: Math.min(anchor.left + 8,      window.innerWidth  - 368),
    position: 'fixed',
  } : { top: 80, left: 80, position: 'fixed' };

  return (
    <div ref={ref} className="evt-popover" style={pos} onClick={e => e.stopPropagation()}>
      <div className="evt-pop-head">
        <div className="evt-pop-icon" style={{ background: bg, color }}>
          <IconComp size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="evt-pop-title">{ev.title}</div>
          <div className="evt-pop-when">{ev.time ? ev.time + ' · ' : ''}{ev.date}</div>
        </div>
        <button
          onClick={onClose}
          style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: 'var(--accent-soft)', cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0 }}
        >
          <X size={13} />
        </button>
      </div>

      <div className="evt-pop-body">
        <div className="evt-pop-row">
          <div className="lbl">Type</div>
          <div>{label}</div>
        </div>
        {ev.clientName && (
          <div className="evt-pop-row">
            <div className="lbl">Client</div>
            <div style={{ fontWeight: 600 }}>{ev.clientName}</div>
          </div>
        )}
        {ev.meta && ev.meta !== ev.clientName && (
          <div className="evt-pop-row">
            <div className="lbl">Detail</div>
            <div>{ev.meta}</div>
          </div>
        )}
        {ev.amount > 0 && (
          <div className="evt-pop-row">
            <div className="lbl">Amount</div>
            <div className="evt-amt" style={{ fontSize: 16 }}>{fmt0(ev.amount)}</div>
          </div>
        )}
      </div>

      <div className="evt-pop-foot">
        {ev._type === 'invoice' && (
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => { navigate('/invoices'); onClose(); }}
          >
            <Eye size={13} /> View Invoice
          </button>
        )}
        {ev._type === 'appointment' && (
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => { navigate('/appointments'); onClose(); }}
          >
            <Eye size={13} /> View Appointment
          </button>
        )}
        <div style={{ flex: 1 }} />
      </div>
    </div>
  );
}

// ─── CALENDAR PAGE ────────────────────────────────────────────────
export default function Calendar() {
  const navigate = useNavigate();
  const [cursor,   setCursor]   = useState(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1));
  const [selected, setSelected] = useState(new Date(TODAY));
  const [view,     setView]     = useState('month');
  const [hidden,   setHidden]   = useState(new Set());
  const [popover,  setPopover]  = useState(null);

  // ── Data ──
  const { data: appts    = [] } = useQuery({
    queryKey: ['cal-appointments'],
    queryFn: () => nexartClient.entities.Appointment.list('-appointment_date', 500),
    staleTime: 1000 * 60 * 2,
  });
  const { data: invoices = [] } = useQuery({
    queryKey: ['cal-invoices'],
    queryFn: () => nexartClient.entities.Invoice.list('-created_at', 300),
    staleTime: 1000 * 60 * 5,
  });

  // ── Normalize all events ──
  const allEvents = useMemo(() => {
    const evts = [];
    appts.forEach(a => { if (a.appointment_date) evts.push(apptToEvent(a)); });
    invoices.forEach(inv => invToEvents(inv).forEach(e => evts.push(e)));
    return evts;
  }, [appts, invoices]);

  // ── Index by date, respecting hidden filters ──
  const eventsByDate = useMemo(() => {
    const map = {};
    for (const e of allEvents) {
      if (hidden.has(e.type) || !e.date) continue;
      (map[e.date] = map[e.date] || []).push(e);
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => {
        if (!a.time && b.time) return -1;
        if (a.time && !b.time) return 1;
        return (a.time || '').localeCompare(b.time || '');
      });
    }
    return map;
  }, [allEvents, hidden]);

  const days = useMemo(() => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor]);

  function shiftMonth(delta) {
    setCursor(c => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  }
  function goToday() {
    setCursor(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1));
    setSelected(new Date(TODAY));
  }
  function toggleFilter(id) {
    setHidden(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  // ── Month stats ──
  const monthStats = useMemo(() => {
    const inMonth = allEvents.filter(e => {
      if (!e.date) return false;
      const [y, m] = e.date.split('-').map(Number);
      return y === cursor.getFullYear() && (m - 1) === cursor.getMonth();
    });
    return {
      invoiced:   inMonth.filter(e => e.type === 'invoice').reduce((a, b) => a + (b.amount || 0), 0),
      paid:       inMonth.filter(e => e.type === 'paid').reduce((a, b) => a + (b.amount || 0), 0),
      visits:     inMonth.filter(e => ['visit','call'].includes(e.type)).length,
      milestones: inMonth.filter(e => e.type === 'milestone').length,
    };
  }, [allEvents, cursor]);

  // ── Upcoming events (next 6 from today) ──
  const upcoming = useMemo(() => {
    const todayKey = ymd(TODAY);
    return allEvents
      .filter(e => e.date >= todayKey && !hidden.has(e.type))
      .sort((a, b) => a.date.localeCompare(b.date) || (a.time||'').localeCompare(b.time||''))
      .slice(0, 6);
  }, [allEvents, hidden]);

  // ── Type counts for filter chips ──
  const typeCounts = useMemo(() => {
    const c = {};
    allEvents.forEach(e => { c[e.type] = (c[e.type] || 0) + 1; });
    return c;
  }, [allEvents]);

  function clickEvt(e, ev) {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setPopover({ ev, anchor: { top: rect.top, left: rect.right } });
  }

  return (
    <div className="cal" onClick={() => setPopover(null)}>

      {/* ── RAIL ── */}
      <aside className="cal-rail" onClick={e => e.stopPropagation()}>
        {/* CTA */}
        <div>
          <button className="btn btn--cta btn--full" onClick={() => navigate('/appointments')}>
            <Plus size={15} /> New Appointment
          </button>
        </div>

        {/* Mini calendar */}
        <MiniCalendar
          cursor={cursor}
          selected={selected}
          eventsByDate={eventsByDate}
          onPick={p => {
            if (p.type === 'shift') shiftMonth(p.delta);
            else { setSelected(p.date); setCursor(new Date(p.date.getFullYear(), p.date.getMonth(), 1)); }
          }}
        />

        {/* Filters */}
        <div>
          <h3>Show on calendar</h3>
          <div className="filter-row">
            {FILTERS.map(f => (
              <div
                key={f.id}
                className={`filter-chip ${hidden.has(f.id) ? 'is-off' : ''}`}
                onClick={() => toggleFilter(f.id)}
              >
                <span className="dot-color" style={{ background: f.color }} />
                <span>{f.label}</span>
                <span className="count">{typeCounts[f.id] || 0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Up next */}
        <div>
          <h3>Up next</h3>
          {upcoming.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 8 }}>No upcoming events</p>
          )}
          {upcoming.map(ev => {
            const parts = (ev.date || '').split('-').map(Number);
            const mo = parts[1] || 1;
            const d  = parts[2] || 1;
            return (
              <div key={ev.id} className="up-item" onClick={e => clickEvt(e, ev)}>
                <div className="up-date">
                  <div className="up-date-mo">{MONTHS_SHORT[mo - 1]}</div>
                  <div className="up-date-dy">{d}</div>
                </div>
                <div>
                  <div className="up-title">{ev.title}</div>
                  <div className="up-meta">{ev.time ? ev.time + ' · ' : ''}{ev.meta}</div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="cal-main">
        {/* Command bar */}
        <div className="cal-cmd">
          <button className="cal-today-btn" onClick={goToday}>Today</button>
          <div className="cal-nav">
            <button onClick={() => shiftMonth(-1)}><ChevronLeft size={14} /></button>
            <button onClick={() => shiftMonth(+1)}><ChevronRight size={14} /></button>
          </div>
          <div className="cal-title">
            {MONTHS[cursor.getMonth()]}
            <span className="year">{cursor.getFullYear()}</span>
          </div>
          <div style={{ flex: 1 }} />
          <div className="cal-view">
            {['month', 'agenda'].map(v => (
              <button
                key={v}
                className={view === v ? 'is-active' : ''}
                onClick={() => setView(v)}
              >
                {v === 'month' ? 'Month' : 'Agenda'}
              </button>
            ))}
          </div>
          <button className="btn btn--cta" onClick={() => navigate('/appointments')}>
            <Plus size={14} /> New
          </button>
        </div>

        {/* Stat strip */}
        <div className="cal-stats">
          <div className="cal-stat">
            <div className="cal-stat-ic invoice"><Receipt size={17} /></div>
            <div>
              <div className="cal-stat-num">{fmt0(monthStats.invoiced)}</div>
              <div className="cal-stat-lbl">Invoiced this month</div>
            </div>
          </div>
          <div className="cal-stat">
            <div className="cal-stat-ic" style={{ background: '#f0fdf4', color: '#15803d' }}>
              <CheckCircle2 size={17} />
            </div>
            <div>
              <div className="cal-stat-num">{fmt0(monthStats.paid)}</div>
              <div className="cal-stat-lbl">Received this month</div>
            </div>
          </div>
          <div className="cal-stat">
            <div className="cal-stat-ic visit"><MapPin size={17} /></div>
            <div>
              <div className="cal-stat-num">{monthStats.visits}</div>
              <div className="cal-stat-lbl">Site visits & calls</div>
            </div>
          </div>
          <div className="cal-stat">
            <div className="cal-stat-ic milestone"><Flag size={17} /></div>
            <div>
              <div className="cal-stat-num">{monthStats.milestones}</div>
              <div className="cal-stat-lbl">Milestones</div>
            </div>
          </div>
        </div>

        {/* Month grid */}
        <div className="cal-grid-wrap" onClick={() => setPopover(null)}>
          <div className="cal-grid">
            {WD.map((w, i) => (
              <div key={w} className={`cal-wd-head ${i===0||i===6 ? 'is-weekend' : ''}`}>
                <span>{w}</span>
              </div>
            ))}
            {days.map(({ date, isOut }, i) => {
              const key       = ymd(date);
              const evs       = eventsByDate[key] || [];
              const isToday   = sameYMD(date, TODAY);
              const isSel     = sameYMD(date, selected);
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
              const cls = ['cal-cell'];
              if (isOut)    cls.push('is-out');
              if (isWeekend) cls.push('is-weekend');
              if (isToday)  cls.push('is-today');
              else if (isSel) cls.push('is-selected');

              const dayMoney = evs.filter(e => e.amount).reduce((a, b) => a + (b.amount || 0), 0);
              const visible  = evs.slice(0, 3);
              const extra    = evs.length - 3;

              return (
                <div
                  key={i}
                  className={cls.join(' ')}
                  onClick={e => { e.stopPropagation(); setSelected(date); }}
                >
                  <div className="cal-cell-head">
                    <div className="cal-day-num">{date.getDate()}</div>
                    {dayMoney > 0 && <div className="cal-day-money">{fmt0(dayMoney)}</div>}
                  </div>
                  <button
                    className="cal-add"
                    onClick={e => { e.stopPropagation(); navigate('/appointments'); }}
                  >
                    <Plus size={13} />
                  </button>
                  {visible.map(ev => (
                    <div
                      key={ev.id}
                      className={`evt evt--${ev.type}`}
                      onClick={e => clickEvt(e, ev)}
                    >
                      <div className="evt-bar" />
                      <div>
                        <div className="evt-title">{ev.title}</div>
                        <div className="evt-meta">{ev.meta}</div>
                      </div>
                      {ev.amount > 0
                        ? <div className="evt-amt">{fmt0(ev.amount)}</div>
                        : ev.time ? <div className="evt-time">{ev.time}</div> : null
                      }
                    </div>
                  ))}
                  {extra > 0 && <div className="evt-more">+{extra} more</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Popover */}
      {popover && (
        <EventPopover
          ev={popover.ev}
          anchor={popover.anchor}
          onClose={() => setPopover(null)}
          navigate={navigate}
        />
      )}
    </div>
  );
}
