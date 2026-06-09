/**
 * transmissionStatus.js — Derive status indicator from transmission record.
 * Minimal rules for visualization.
 */

import { AlertTriangle, CheckCircle2, Eye, Mail, Clock } from 'lucide-react';

export function getTransmissionStatus(transmission) {
  if (!transmission) return null;

  if (transmission.bounced_at) {
    return {
      key: 'bounced',
      label: 'Bounced',
      icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-50 border-red-200',
    };
  }

  if (transmission.clicked_at) {
    return {
      key: 'clicked',
      label: 'Clicked',
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border-emerald-200',
    };
  }

  if (transmission.opened_at) {
    return {
      key: 'opened',
      label: 'Opened',
      icon: Eye,
      color: 'text-blue-600',
      bg: 'bg-blue-50 border-blue-200',
    };
  }

  if (transmission.delivered_at) {
    return {
      key: 'delivered',
      label: 'Delivered',
      icon: Mail,
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-200',
    };
  }

  if (transmission.sent_at) {
    return {
      key: 'sent',
      label: 'Sent',
      icon: Clock,
      color: 'text-slate-600',
      bg: 'bg-slate-50 border-slate-200',
    };
  }

  if (transmission.failed_at) {
    return {
      key: 'failed',
      label: 'Failed',
      icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-50 border-red-200',
    };
  }

  return null;
}

export function formatTransmissionTime(isoStr) {
  if (!isoStr) return null;
  const date = new Date(isoStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}