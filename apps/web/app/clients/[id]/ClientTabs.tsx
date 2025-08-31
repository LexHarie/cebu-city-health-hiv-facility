"use client";

import * as React from "react";

type ClientFull = {
  labPanels?: unknown[];
  prescriptions?: unknown[];
  encounters?: unknown[];
  preferredName?: string | null;
};

export function ClientTabs({ client }: { client: ClientFull | null }) {
  const [tab, setTab] = React.useState<'labs'|'medications'|'encounters'|'sti'|'transfers'|'notes'>('labs');
  const TabBtn = ({ id, label }: { id: typeof tab; label: string }) => (
    <button onClick={() => setTab(id)} className={`tab-button border-b-2 py-4 px-1 text-sm font-medium ${tab===id ? 'border-lucky-1 text-lucky-1' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>{label}</button>
  );
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8 px-6" aria-label="Tabs">
          <TabBtn id="labs" label="Labs" />
          <TabBtn id="medications" label="Medications" />
          <TabBtn id="encounters" label="Encounters" />
          <TabBtn id="sti" label="STI History" />
          <TabBtn id="transfers" label="Transfers" />
          <TabBtn id="notes" label="Notes" />
        </nav>
      </div>
      <div className="p-6 text-sm text-gray-700 dark:text-gray-300">
        {tab === 'labs' && (
          <div>{client?.labPanels?.length ? `${client.labPanels.length} lab panels` : 'No lab records'}</div>
        )}
        {tab === 'medications' && (
          <div>{client?.prescriptions?.length ? `${client.prescriptions.length} prescriptions` : 'No prescriptions'}</div>
        )}
        {tab === 'encounters' && (
          <div>{client?.encounters?.length ? `${client.encounters.length} encounters` : 'No encounters'}</div>
        )}
        {tab === 'sti' && (
          <div>STI screening/history integration pending.</div>
        )}
        {tab === 'transfers' && (
          <div>Transfer records pending.</div>
        )}
        {tab === 'notes' && (
          <div>{client?.preferredName ? `Preferred name: ${client.preferredName}` : 'No notes'}</div>
        )}
      </div>
    </div>
  );
}

