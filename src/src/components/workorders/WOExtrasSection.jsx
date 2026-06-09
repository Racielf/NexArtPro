import React, { useState } from 'react';

function calcHours(arrival, departure) {
  if (!arrival || !departure) return null;
  const [ah, am] = arrival.split(':').map(Number);
  const [dh, dm] = departure.split(':').map(Number);
  const total = (dh * 60 + dm) - (ah * 60 + am);
  if (total <= 0) return null;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

const SectionBox = ({ title, children }) => (
  <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: '24px', marginBottom: 20, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
    <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #e2e8f0' }}>
      {title}
    </div>
    {children}
  </div>
);

const PhotoRow = ({ label, items }) => {
  if (!items.length) return null;
  const isImg = (url) => /\.(jpg|jpeg|png|gif|webp)/i.test(url || '');
  return (
    <div style={{ marginBottom: 12 }}>
      <p style={{ fontSize: 10, color: '#64748b', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase' }}>
        {label}
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {items.map(p =>
          isImg(p.photo_url) ? (
            <img key={p.id} src={p.photo_url} alt="" style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 8, border: '1px solid #e2e8f0' }} />
          ) : null
        )}
      </div>
    </div>
  );
};

export default function WOExtrasSection({ workOrder, expenses = [], photos = [], taskStatuses = {}, linkedEstimate = null, linkedInvoice = null }) {
  // Local state for expense management
  const [localExpenses, setLocalExpenses] = useState([]);
  const [newExpense, setNewExpense] = useState({ category: 'materials', description: '', amount: '', quantity: 1 });

  // Local state for time tracking
  const [timeTracking, setTimeTracking] = useState({
    work_start_time: workOrder?.arrival_time || '',
    work_end_time: workOrder?.departure_time || '',
    break_duration_minutes: 0,
    adjusted_hours: null,
    adjustment_reason: '',
  });

  // Local state for execution cost
  const [executionCost, setExecutionCost] = useState({
    executor_type: 'employee',
    pay_method: 'tracked_time',
    hourly_rate: 50,
    flat_amount: 0,
    unit_label: 'unit',
    unit_quantity: 1,
    unit_rate: 0,
    manual_amount: 0,
  });

  // Local state for pay policy
  const [payPolicy, setPayPolicy] = useState({
    policy_type: 'employee_unpaid_break',
    break_paid: false,
  });

  const allItems = (workOrder?.groups || []).flatMap(g => g.items || []);
  const totalHours = calcHours(workOrder?.arrival_time, workOrder?.departure_time);

  // Combine passed expenses + local expenses
  const allExpenses = [...expenses, ...localExpenses];
  const expTotal = allExpenses.reduce((s, e) => s + (e.amount || 0), 0);

  // Expense categories
  const EXPENSE_CATEGORIES = {
    labor: { label: 'Labor', color: '#3b82f6' },
    materials: { label: 'Materials', color: '#10b981' },
    transport: { label: 'Transport', color: '#f59e0b' },
    food: { label: 'Food', color: '#ec4899' },
    misc: { label: 'Misc', color: '#8b5cf6' },
  };

  // Calculate totals by category
  const expensesByCategory = Object.keys(EXPENSE_CATEGORIES).reduce((acc, cat) => {
    acc[cat] = allExpenses.filter(e => (e.category || 'materials') === cat);
    return acc;
  }, {});

  const categoryTotals = Object.keys(EXPENSE_CATEGORIES).reduce((acc, cat) => {
    acc[cat] = expensesByCategory[cat].reduce((sum, e) => sum + (e.amount || 0), 0);
    return acc;
  }, {});

  // Add new expense handler
  const handleAddExpense = () => {
    if (!newExpense.description || !newExpense.amount) return;
    const expense = {
      id: `local-${Date.now()}`,
      category: newExpense.category,
      description: newExpense.description,
      amount: parseFloat(newExpense.amount),
      quantity: newExpense.quantity || 1,
    };
    setLocalExpenses([...localExpenses, expense]);
    setNewExpense({ category: 'materials', description: '', amount: '', quantity: 1 });
  };

  // Remove expense handler
  const handleRemoveExpense = (id) => {
    setLocalExpenses(localExpenses.filter(e => e.id !== id));
  };

  // Time tracking calculations
  const calculateRawHours = () => {
    if (!timeTracking.work_start_time || !timeTracking.work_end_time) return 0;
    const [sh, sm] = timeTracking.work_start_time.split(':').map(Number);
    const [eh, em] = timeTracking.work_end_time.split(':').map(Number);
    const totalMinutes = (eh * 60 + em) - (sh * 60 + sm);
    const breakMinutes = timeTracking.break_duration_minutes || 0;
    const workMinutes = Math.max(0, totalMinutes - breakMinutes);
    return workMinutes / 60;
  };

  const rawHours = calculateRawHours();
  const adjustedHours = timeTracking.adjusted_hours !== null ? timeTracking.adjusted_hours : rawHours;
  
  // Calculate payable hours based on pay policy
  const calculatePayableHours = () => {
    const { policy_type, break_paid } = payPolicy;
    const breakHours = (timeTracking.break_duration_minutes || 0) / 60;
    
    switch (policy_type) {
      case 'employee_unpaid_break':
        return Math.max(0, adjustedHours - (break_paid ? 0 : breakHours));
      case 'employee_paid_break':
        return adjustedHours;
      case 'subcontractor':
      case 'flat_rate':
        return 0; // No hours used
      case 'custom':
        return adjustedHours; // Allow override
      default:
        return adjustedHours;
    }
  };

  const payableHours = calculatePayableHours();

  // Execution cost calculation
  const calculateExecutionCost = () => {
    const { executor_type, pay_method } = executionCost;
    
    switch (pay_method) {
      case 'tracked_time':
        return payableHours * (executionCost.hourly_rate || 0);
      case 'flat_rate':
        return parseFloat(executionCost.flat_amount) || 0;
      case 'manual_amount':
        return parseFloat(executionCost.manual_amount) || 0;
      case 'by_unit':
        return (executionCost.unit_quantity || 0) * (executionCost.unit_rate || 0);
      case 'no_charge':
        return 0;
      default:
        return 0;
    }
  };

  const executionCostTotal = calculateExecutionCost();

  // Updated expense totals (exclude labor to avoid double-counting with execution cost)
  const categoryTotalsUpdated = Object.keys(EXPENSE_CATEGORIES).reduce((acc, cat) => {
    if (cat === 'labor') {
      acc[cat] = 0; // Exclude from manual expenses, use execution cost instead
    } else {
      acc[cat] = expensesByCategory[cat].reduce((sum, e) => sum + (e.amount || 0), 0);
    }
    return acc;
  }, {});

  const otherExpensesTotal = Object.values(categoryTotalsUpdated).reduce((s, v) => s + v, 0);
  const totalWorkOrderCost = executionCostTotal + otherExpensesTotal;

  const beforePhotos = photos.filter(p => p.phase === 'before');
  const duringPhotos = photos.filter(p => p.phase === 'during');
  const afterPhotos = photos.filter(p => p.phase === 'after');

  // JOB FINANCIAL ENGINE - FASE 10
  // Revenue source: invoice > estimate > fallback 0
  const jobRevenue = linkedInvoice?.total ?? linkedEstimate?.total ?? 0;
  const jobCost = totalWorkOrderCost;
  const grossProfit = jobRevenue - jobCost;
  const profitMargin = jobRevenue > 0 ? ((grossProfit / jobRevenue) * 100) : 0;

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', fontFamily: "'Inter', 'Segoe UI', sans-serif", fontSize: 13, color: '#1e293b', lineHeight: 1.5 }}>
      {/* Task Checklist */}
      {allItems.length > 0 && (
        <SectionBox title="Task Checklist">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>Task</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 11, color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {allItems.map((item, i) => {
                const key = item.id || item.service_name || String(i);
                const isDone = taskStatuses?.[key]?.status === 'done';
                return (
                  <tr key={key} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px', fontSize: 12 }}>
                      <span style={{ marginRight: 6 }}>{isDone ? '✅' : '☐'}</span>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>{item.service_name}</span>
                      {item.description && (
                        <div style={{ color: '#64748b', fontSize: 11, marginTop: 3 }}>{item.description}</div>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <span style={{
                        background: isDone ? '#dcfce7' : '#f1f5f9',
                        color: isDone ? '#166534' : '#64748b',
                        padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                      }}>
                        {isDone ? 'Done' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </SectionBox>
      )}

      {/* Time on Site */}
      {(workOrder?.arrival_time || workOrder?.departure_time) && (
        <SectionBox title="Time on Site">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {workOrder?.arrival_time && (
              <div>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' }}>Arrival</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{workOrder.arrival_time}</div>
              </div>
            )}
            {workOrder?.departure_time && (
              <div>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' }}>Departure</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{workOrder.departure_time}</div>
              </div>
            )}
            {totalHours && (
              <div>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' }}>Total Hours</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#2563eb' }}>{totalHours}</div>
              </div>
            )}
          </div>
        </SectionBox>
      )}

      {/* Work Summary */}
      {workOrder?.work_summary && (
        <SectionBox title="Work Summary">
          <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#374151', lineHeight: 1.6, fontSize: 13 }}>
            {workOrder.work_summary}
          </p>
        </SectionBox>
      )}

      {/* Issues Found */}
      {workOrder?.issues_found && (
        <SectionBox title="Issues Found">
          <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#b45309', lineHeight: 1.6, fontSize: 13 }}>
            {workOrder.issues_found}
          </p>
        </SectionBox>
      )}

      {/* Time Tracking - Only shown if not flat_rate or subcontractor */}
      {payPolicy.policy_type !== 'flat_rate' && payPolicy.policy_type !== 'subcontractor' && (
      <SectionBox title="Time Tracking">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 10, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Work Start</label>
            <input
              type="time"
              value={timeTracking.work_start_time}
              onChange={(e) => setTimeTracking({ ...timeTracking, work_start_time: e.target.value })}
              style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12 }}
            />
          </div>
          <div>
            <label style={{ fontSize: 10, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Work End</label>
            <input
              type="time"
              value={timeTracking.work_end_time}
              onChange={(e) => setTimeTracking({ ...timeTracking, work_end_time: e.target.value })}
              style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12 }}
            />
          </div>
          <div>
            <label style={{ fontSize: 10, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Break (minutes)</label>
            <input
              type="number"
              min="0"
              value={timeTracking.break_duration_minutes}
              onChange={(e) => setTimeTracking({ ...timeTracking, break_duration_minutes: parseInt(e.target.value) || 0 })}
              style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12 }}
            />
          </div>
          <div>
            <label style={{ fontSize: 10, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Raw Hours</label>
            <div style={{ padding: '8px', background: '#f8fafc', borderRadius: 4, fontSize: 12, fontWeight: 600, color: '#0f172a' }}>
              {rawHours.toFixed(2)} hrs
            </div>
          </div>
          <div>
            <label style={{ fontSize: 10, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Adjusted Hours (if needed)</label>
            <input
              type="number"
              step="0.25"
              min="0"
              value={timeTracking.adjusted_hours !== null ? timeTracking.adjusted_hours : ''}
              placeholder={rawHours.toFixed(2)}
              onChange={(e) => setTimeTracking({ ...timeTracking, adjusted_hours: e.target.value ? parseFloat(e.target.value) : null })}
              style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12 }}
            />
          </div>
          <div>
            <label style={{ fontSize: 10, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Payable Hours</label>
            <div style={{ padding: '8px', background: '#e0f2fe', borderRadius: 4, fontSize: 12, fontWeight: 700, color: '#0369a1' }}>
              {payableHours.toFixed(2)} hrs
            </div>
            {payPolicy.policy_type === 'employee_unpaid_break' && !payPolicy.break_paid && (
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 4, fontStyle: 'italic' }}>
                {adjustedHours.toFixed(2)} hrs - {(timeTracking.break_duration_minutes / 60).toFixed(2)} hrs break = {payableHours.toFixed(2)} hrs
              </div>
            )}
          </div>
        </div>
        {timeTracking.adjusted_hours !== null && (
          <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 4, padding: 12 }}>
            <label style={{ fontSize: 10, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Adjustment Reason</label>
            <textarea
              value={timeTracking.adjustment_reason}
              onChange={(e) => setTimeTracking({ ...timeTracking, adjustment_reason: e.target.value })}
              placeholder="Explain why hours were adjusted..."
              style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12, resize: 'none', height: 60 }}
            />
          </div>
        )}
        </SectionBox>
        )}

        {/* Execution Cost */}
      <SectionBox title="Execution Cost">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 10, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Executor Type</label>
            <select
              value={executionCost.executor_type}
              onChange={(e) => setExecutionCost({ ...executionCost, executor_type: e.target.value })}
              style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12 }}
            >
              <option value="employee">Employee</option>
              <option value="subcontractor">Subcontractor</option>
              <option value="helper">Helper</option>
              <option value="owner">Owner</option>
              <option value="crew">Crew</option>
              <option value="vendor">Vendor</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 10, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Pay Method</label>
            <select
              value={executionCost.pay_method}
              onChange={(e) => setExecutionCost({ ...executionCost, pay_method: e.target.value })}
              style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12 }}
            >
              <option value="tracked_time">Tracked Time</option>
              <option value="flat_rate">Flat Rate</option>
              <option value="manual_amount">Manual Amount</option>
              <option value="by_unit">By Unit</option>
              <option value="no_charge">No Charge</option>
            </select>
          </div>
          </div>

          {/* Pay Policy Section */}
          <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 4, padding: 12, marginBottom: 16 }}>
          <label style={{ fontSize: 10, color: '#92400e', fontWeight: 600, display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>Pay Policy</label>

          <select
            value={payPolicy.policy_type}
            onChange={(e) => setPayPolicy({ ...payPolicy, policy_type: e.target.value })}
            style={{ width: '100%', padding: '8px', border: '1px solid #fbbf24', borderRadius: 4, fontSize: 12, marginBottom: 12 }}
          >
            <option value="employee_unpaid_break">Employee (Unpaid Break)</option>
            <option value="employee_paid_break">Employee (Paid Break)</option>
            <option value="subcontractor">Subcontractor</option>
            <option value="flat_rate">Flat Rate</option>
            <option value="custom">Custom Override</option>
          </select>

          {/* Break/Lunch toggle - only for employee policies */}
          {(payPolicy.policy_type === 'employee_unpaid_break' || payPolicy.policy_type === 'employee_paid_break') && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: '#92400e' }}>
              <input
                type="checkbox"
                checked={payPolicy.break_paid}
                onChange={(e) => setPayPolicy({ ...payPolicy, break_paid: e.target.checked })}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              <span>Pay lunch/break time ({timeTracking.break_duration_minutes} min)</span>
            </label>
          )}

          {/* Policy explanation */}
          <div style={{ marginTop: 12, padding: 8, background: 'rgba(255,255,255,0.5)', borderRadius: 4, fontSize: 11, color: '#92400e', lineHeight: 1.5 }}>
            {payPolicy.policy_type === 'employee_unpaid_break' && (
              <span>Break time is <strong>not paid</strong>. Payable hours = adjusted hours - break minutes.</span>
            )}
            {payPolicy.policy_type === 'employee_paid_break' && (
              <span>Break time is <strong>paid</strong>. Payable hours = adjusted hours (includes break).</span>
            )}
            {payPolicy.policy_type === 'subcontractor' && (
              <span>Subcontractor. Hours are ignored, use flat rate or manual amount.</span>
            )}
            {payPolicy.policy_type === 'flat_rate' && (
              <span>Flat rate applied. Hours tracking is not used.</span>
            )}
            {payPolicy.policy_type === 'custom' && (
              <span>Custom override. Payable hours can be manually adjusted.</span>
            )}
          </div>
          </div>

          {/* Dynamic fields based on pay_method */}
        {executionCost.pay_method === 'tracked_time' && (
          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 4, padding: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 10, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Hourly Rate</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={executionCost.hourly_rate}
                  onChange={(e) => setExecutionCost({ ...executionCost, hourly_rate: parseFloat(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 10, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Execution Total</label>
                <div style={{ padding: '8px', background: 'white', borderRadius: 4, fontSize: 12, fontWeight: 700, color: '#0369a1' }}>
                  ${executionCostTotal.toFixed(2)}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>
              {payableHours.toFixed(2)} hrs × ${executionCost.hourly_rate.toFixed(2)}/hr
            </div>
          </div>
        )}

        {executionCost.pay_method === 'flat_rate' && (
          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 4, padding: 12 }}>
            <label style={{ fontSize: 10, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Flat Amount</label>
            <input
              type="number"
              min="0"
              step="1"
              value={executionCost.flat_amount}
              onChange={(e) => setExecutionCost({ ...executionCost, flat_amount: parseFloat(e.target.value) || 0 })}
              style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12 }}
            />
            <div style={{ marginTop: 12, padding: '8px', background: 'white', borderRadius: 4, fontSize: 12, fontWeight: 700, color: '#0369a1' }}>
              Execution Total: ${executionCostTotal.toFixed(2)}
            </div>
          </div>
        )}

        {executionCost.pay_method === 'manual_amount' && (
          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 4, padding: 12 }}>
            <label style={{ fontSize: 10, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Manual Amount</label>
            <input
              type="number"
              min="0"
              step="1"
              value={executionCost.manual_amount}
              onChange={(e) => setExecutionCost({ ...executionCost, manual_amount: parseFloat(e.target.value) || 0 })}
              style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12 }}
            />
            <div style={{ marginTop: 12, padding: '8px', background: 'white', borderRadius: 4, fontSize: 12, fontWeight: 700, color: '#0369a1' }}>
              Execution Total: ${executionCostTotal.toFixed(2)}
            </div>
          </div>
        )}

        {executionCost.pay_method === 'by_unit' && (
          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 4, padding: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 10, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Unit Label</label>
                <input
                  type="text"
                  value={executionCost.unit_label}
                  onChange={(e) => setExecutionCost({ ...executionCost, unit_label: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 10, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Quantity</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={executionCost.unit_quantity}
                  onChange={(e) => setExecutionCost({ ...executionCost, unit_quantity: parseFloat(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 10, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Rate Per Unit</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={executionCost.unit_rate}
                  onChange={(e) => setExecutionCost({ ...executionCost, unit_rate: parseFloat(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12 }}
                />
              </div>
            </div>
            <div style={{ padding: '8px', background: 'white', borderRadius: 4, fontSize: 12, fontWeight: 700, color: '#0369a1' }}>
              Execution Total: {executionCost.unit_quantity} {executionCost.unit_label} × ${executionCost.unit_rate.toFixed(2)} = ${executionCostTotal.toFixed(2)}
            </div>
          </div>
        )}

        {executionCost.pay_method === 'no_charge' && (
          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 4, padding: 12, textAlign: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#0369a1' }}>Execution Total: $0.00</span>
          </div>
        )}
      </SectionBox>

      {/* Job Financial Summary - INTERNAL ONLY */}
      {(jobRevenue > 0 || jobCost > 0) && (
      <SectionBox title="Job Financial Summary (Internal)">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 10, color: '#166534', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' }}>Job Revenue</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#16a34a' }}>
              ${jobRevenue.toFixed(2)}
            </div>
            {linkedInvoice && <div style={{ fontSize: 10, color: '#4b5563', marginTop: 4 }}>From Invoice #{linkedInvoice.invoice_number}</div>}
            {!linkedInvoice && linkedEstimate && <div style={{ fontSize: 10, color: '#4b5563', marginTop: 4 }}>From Estimate (not invoiced yet)</div>}
            {!linkedInvoice && !linkedEstimate && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4, fontStyle: 'italic' }}>No linked invoice/estimate</div>}
          </div>

          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 10, color: '#b45309', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' }}>Work Order Cost</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#dc2626' }}>
              ${jobCost.toFixed(2)}
            </div>
            <div style={{ fontSize: 10, color: '#4b5563', marginTop: 4 }}>
              Execution: ${executionCostTotal.toFixed(2)} + Other: ${otherExpensesTotal.toFixed(2)}
            </div>
          </div>

          <div style={{ background: grossProfit >= 0 ? '#f0fdf4' : '#fee2e2', border: `1px solid ${grossProfit >= 0 ? '#86efac' : '#fecaca'}`, borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 10, color: grossProfit >= 0 ? '#166534' : '#991b1b', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' }}>
              Gross Profit
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: grossProfit >= 0 ? '#16a34a' : '#dc2626' }}>
              ${grossProfit.toFixed(2)}
            </div>
            <div style={{ fontSize: 10, color: '#4b5563', marginTop: 4 }}>
              {jobRevenue > 0 ? `${profitMargin.toFixed(1)}% margin` : 'No revenue yet'}
            </div>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 10, color: '#475569', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' }}>Profit Margin</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: profitMargin >= 20 ? '#16a34a' : profitMargin >= 0 ? '#ea580c' : '#dc2626' }}>
              {profitMargin.toFixed(1)}%
            </div>
            <div style={{ fontSize: 10, color: '#4b5563', marginTop: 4 }}>
              {profitMargin >= 30 && '📈 Excellent'}
              {profitMargin >= 20 && profitMargin < 30 && '👍 Good'}
              {profitMargin >= 0 && profitMargin < 20 && '⚠️ Tight'}
              {profitMargin < 0 && '❌ Loss'}
            </div>
          </div>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Summary
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '6px 0', color: '#64748b' }}>Job Revenue</td>
                <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>${jobRevenue.toFixed(2)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '6px 0', color: '#64748b' }}>Work Order Cost</td>
                <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 600, color: '#dc2626' }}>−${jobCost.toFixed(2)}</td>
              </tr>
              <tr style={{ borderTop: '2px solid #cbd5e1', background: grossProfit >= 0 ? '#f0fdf4' : '#fee2e2' }}>
                <td style={{ padding: '8px 0', fontWeight: 700, color: grossProfit >= 0 ? '#166534' : '#991b1b' }}>Gross Profit</td>
                <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 800, color: grossProfit >= 0 ? '#16a34a' : '#dc2626', fontSize: 13 }}>${grossProfit.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </SectionBox>
      )}

      {/* Expenses */}
      <SectionBox title="Work Order Expenses">
        {/* Add Expense Form */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr auto', gap: 8, alignItems: 'flex-end' }}>
            <div>
              <label style={{ fontSize: 10, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Category</label>
              <select
                value={newExpense.category}
                onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12 }}
              >
                {Object.entries(EXPENSE_CATEGORIES).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Description</label>
              <input
                type="text"
                placeholder="e.g., Gas, Paint, Lunch"
                value={newExpense.description}
                onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 10, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Amount</label>
              <input
                type="number"
                placeholder="0.00"
                value={newExpense.amount}
                onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 10, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Qty</label>
              <input
                type="number"
                value={newExpense.quantity}
                onChange={(e) => setNewExpense({ ...newExpense, quantity: parseInt(e.target.value) || 1 })}
                style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12 }}
              />
            </div>
            <button
              onClick={handleAddExpense}
              style={{
                padding: '6px 12px',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Add
            </button>
          </div>
        </div>

        {/* Expenses by Category */}
        {allExpenses.length > 0 ? (
          <>
            {Object.entries(EXPENSE_CATEGORIES).map(([catKey, catConfig]) => {
              const catExpenses = expensesByCategory[catKey];
              if (catExpenses.length === 0) return null;

              return (
                <div key={catKey} style={{ marginBottom: 16 }}>
                  <div style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: catConfig.color,
                    textTransform: 'uppercase',
                    marginBottom: 8,
                    paddingBottom: 4,
                    borderBottom: `2px solid ${catConfig.color}`,
                  }}>
                    {catConfig.label}
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
                    <tbody>
                      {catExpenses.map(exp => (
                        <tr key={exp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 0', fontSize: 12, flex: 1 }}>{exp.description}</td>
                          {exp.quantity > 1 && (
                            <td style={{ padding: '8px 12px', fontSize: 11, color: '#64748b', textAlign: 'right', minWidth: 50 }}>
                              x{exp.quantity}
                            </td>
                          )}
                          <td style={{ padding: '8px 0', fontSize: 12, textAlign: 'right', fontWeight: 600, minWidth: 80 }}>
                            ${(exp.amount || 0).toFixed(2)}
                          </td>
                          {localExpenses.find(e => e.id === exp.id) && (
                            <td style={{ padding: '8px 0', textAlign: 'right' }}>
                              <button
                                onClick={() => handleRemoveExpense(exp.id)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  fontSize: 12,
                                  fontWeight: 600,
                                }}
                              >
                                Remove
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    paddingBottom: 12,
                    borderBottom: '1px solid #e2e8f0',
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: catConfig.color }}>
                      Subtotal: ${categoryTotals[catKey].toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Cost Summary */}
            <div style={{
              background: '#f0f9ff',
              border: `2px solid #0ea5e9`,
              borderRadius: 8,
              padding: 16,
              marginTop: 16,
            }}>
              <div style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#0f172a',
                textTransform: 'uppercase',
                marginBottom: 12,
                letterSpacing: 0.5,
              }}>
                Work Order Cost Summary
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: '#64748b' }}>Execution Cost:</span>
                  <span style={{ fontWeight: 600, color: '#3b82f6' }}>
                    ${executionCostTotal.toFixed(2)}
                  </span>
                </div>
                {Object.entries(EXPENSE_CATEGORIES).map(([key, config]) => {
                  if (key === 'labor' || categoryTotalsUpdated[key] === 0) return null;
                  return (
                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: '#64748b' }}>{config.label}:</span>
                      <span style={{ fontWeight: 600, color: config.color }}>
                        ${categoryTotalsUpdated[key].toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div style={{
                borderTop: '2px solid #0ea5e9',
                paddingTop: 12,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Total Work Order Cost:</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: '#0ea5e9' }}>
                  ${totalWorkOrderCost.toFixed(2)}
                </span>
              </div>
            </div>
          </>
        ) : (
          <p style={{ color: '#94a3b8', fontSize: 12, fontStyle: 'italic' }}>No expenses recorded yet.</p>
        )}
      </SectionBox>

      {/* Project Photos */}
      {photos.length > 0 && (
        <SectionBox title="Project Photos">
          <PhotoRow label="Before" items={beforePhotos} />
          <PhotoRow label="During" items={duringPhotos} />
          <PhotoRow label="After" items={afterPhotos} />
        </SectionBox>
      )}
    </div>
  );
}