import React from 'react';
import NexArtAgentPanel from '@/components/nexart-agent/NexArtAgentPanel';

export default function NexArtAgent() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">NexArt Agent</h1>
      <NexArtAgentPanel />
    </div>
  );
}
