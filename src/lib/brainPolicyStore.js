const STORAGE_KEY = 'central_brain_policy_v1';

export const DEFAULT_BRAIN_POLICY = {
  enabled: true,
  operationMode: 'advisory', // advisory | guarded | strict | experimental
  aiReadiness: false,
  openaiConnected: false,
  businessPriority: 'revenue_and_operations',
  ownerInstructions: '',
  modules: {
    estimate: true,
    proposal: true,
    invoice: true,
    customer: true,
    job: true,
    payroll: true,
    settings: true,
    timeTracking: true,
    recovery: true,
    lead: false,
    appointment: false,
    worker: false,
    assignment: false,
    payment: false,
    incomeExpense: false,
    dashboard: false,
  },
  actionGuards: {
    sendEstimate: true,
    sendInvoice: true,
    convertToJob: true,
    convertToInvoice: true,
    runPayroll: true,
    archiveRecord: false,
    restoreRecord: false,
  },
  updatedAt: null,
};

export function getBrainPolicy() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_BRAIN_POLICY };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_BRAIN_POLICY,
      ...parsed,
      modules: { ...DEFAULT_BRAIN_POLICY.modules, ...(parsed.modules || {}) },
      actionGuards: { ...DEFAULT_BRAIN_POLICY.actionGuards, ...(parsed.actionGuards || {}) },
    };
  } catch {
    return { ...DEFAULT_BRAIN_POLICY };
  }
}

export function saveBrainPolicy(policy) {
  const next = { ...policy, updatedAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function resetBrainPolicy() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_BRAIN_POLICY));
  return { ...DEFAULT_BRAIN_POLICY };
}
