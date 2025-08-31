"use client";

import * as React from "react";

export type LabResult = { testType: { label: string }; valueNum?: number | null; valueText?: string | null; unit?: string | null };
export type LabPanel = {
  id: string;
  panelType: { label: string };
  orderedAt?: string | null;
  collectedAt?: string | null;
  reportedAt?: string | null;
  status: string;
  results: LabResult[];
};
export type Prescription = {
  id: string;
  category: 'ARV'|'PREP'|'TB_PROPHYLAXIS'|'STI'|'OTHER';
  startDate: string;
  endDate?: string | null;
  regimen?: { name: string } | null;
  medication?: { name: string } | null;
  isActive: boolean;
};
export type Encounter = { id: string; date: string; type: string };
export type STIScreening = { id: string; screeningDate: string; result: string; disease: { label: string } };
export type STIHistory = { id: string; hadHistory: boolean; disease: { label: string }; recordedAt: string };
export type ClientTabsData = {
  labPanels?: LabPanel[];
  prescriptions?: Prescription[];
  encounters?: Encounter[];
  stiScreenings?: STIScreening[];
  stiHistory?: STIHistory[];
  preferredName?: string | null;
};

export function ClientTabs({ client }: { client: ClientTabsData | null }) {
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
          <div className="overflow-x-auto">
            {!client?.labPanels?.length ? (
              <div>No lab records</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium">Panel</th>
                    <th className="px-4 py-2 text-left text-xs font-medium">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium">Results</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {client.labPanels.map((p) => {
                    const when = p.reportedAt || p.collectedAt || p.orderedAt || '';
                    const date = when ? new Date(when).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
                    const results = p.results.map(r => {
                      const val = r.valueText ?? (r.valueNum != null ? String(r.valueNum) : '')
                      const unit = r.unit ? ` ${r.unit}` : ''
                      return `${r.testType.label}${val ? `: ${val}${unit}` : ''}`
                    }).join('; ');
                    return (
                      <tr key={p.id}>
                        <td className="px-4 py-2 text-sm">{date}</td>
                        <td className="px-4 py-2 text-sm">{p.panelType.label}</td>
                        <td className="px-4 py-2 text-sm">{p.status}</td>
                        <td className="px-4 py-2 text-sm">{results || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
        {tab === 'medications' && (
          <div className="space-y-3">
            {!client?.prescriptions?.length ? (
              <div>No prescriptions</div>
            ) : (
              client.prescriptions
                .filter(p => p.category === 'ARV' || p.category === 'PREP')
                .map((p) => (
                  <div key={p.id} className="border rounded-md p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">{p.category}</div>
                      <div className="text-xs text-gray-500">{new Date(p.startDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}{p.endDate ? ` - ${new Date(p.endDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}` : ''}</div>
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      {p.regimen?.name || p.medication?.name || '—'}
                    </div>
                  </div>
                ))
            )}
          </div>
        )}
        {tab === 'encounters' && (
          <div className="space-y-2">
            {!client?.encounters?.length ? (
              <div>No encounters</div>
            ) : (
              client.encounters.map(e => (
                <div key={e.id} className="border rounded-md p-3 flex items-center justify-between">
                  <div className="font-medium">{e.type}</div>
                  <div className="text-xs text-gray-500">{new Date(e.date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                </div>
              ))
            )}
          </div>
        )}
        {tab === 'sti' && (
          <div className="space-y-4">
            <div>
              <div className="font-semibold mb-2">Screenings</div>
              {!client?.stiScreenings?.length ? (
                <div className="text-sm text-gray-500">No STI screenings</div>
              ) : (
                <ul className="list-disc ml-5 text-sm">
                  {client.stiScreenings.map(s => (
                    <li key={s.id}>{s.disease.label} — {s.result} on {new Date(s.screeningDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}</li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <div className="font-semibold mb-2">History</div>
              {!client?.stiHistory?.length ? (
                <div className="text-sm text-gray-500">No STI history recorded</div>
              ) : (
                <ul className="list-disc ml-5 text-sm">
                  {client.stiHistory.map(h => (
                    <li key={h.id}>{h.disease.label} — {h.hadHistory ? 'Yes' : 'No'} (recorded {new Date(h.recordedAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })})</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
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
