export const defaultBrainConfig = {
  writeMode: false,
  decisionMode: false,
  observationMode: false,
  learningMode: false,
  confirmationRequired: true,
  companyContext: null,
  priceBookUpdateSchedule: {
    enabled: false,
    frequency: 'weekly',
    windowStart: '02:00',
    windowEnd: '03:00',
    maxDurationMinutes: 60,
    reviewBeforeApply: true,
  },
};
