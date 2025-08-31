import { Header } from "@/components/Header";
import Link from "next/link";
import * as React from "react";
import { ClientTabs } from "./ClientTabs";

type Lookup = { id: string; label: string };
type ClientFull = {
  id: string;
  legalSurname: string;
  legalFirst: string;
  preferredName?: string | null;
  clientCode: string;
  uic: string;
  status: string;
  dateOfBirth?: string | null;
  sexAtBirth: string;
  genderIdentity?: { id: string; label: string } | null;
  caseManager?: { id: string; displayName: string } | null;
  populations: { population: Lookup }[];
  labPanels: any[];
  encounters: any[];
  prescriptions: any[];
};

function formatDate(d?: string | null): string {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function calcAge(d?: string | null): string {
  if (!d) return '—';
  const dob = new Date(d);
  if (isNaN(dob.getTime())) return '—';
  const diff = Date.now() - dob.getTime();
  const age = new Date(diff).getUTCFullYear() - 1970;
  return `${age} years`;
}

async function getClient(id: string): Promise<ClientFull | null> {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL;
    const url = base ? `${base}/api/clients/${id}` : `/api/clients/${id}`;
    const res = await fetch(url, { cache: 'no-store', next: { revalidate: 0 } });
    if (!res.ok) return null;
    const data = (await res.json()) as { client: ClientFull };
    return data.client;
  } catch {
    return null;
  }
}

export default async function ClientProfilePage({ params }: { params: { id: string } }) {
  const client = await getClient(params.id);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Client Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-8">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <Link href="/" className="mr-2 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" aria-label="Back to dashboard">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                  </svg>
                </Link>
                <div className="w-16 h-16 bg-lucky-1 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {client ? `${client.legalSurname?.[0] ?? ''}${client.legalFirst?.[0] ?? ''}`.toUpperCase() : "--"}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                    {client ? `${client.legalSurname ?? ''}, ${client.legalFirst ?? ''}` : "Client Profile"}
                    <div className="ribbon-icon ml-3" title="On ARV Treatment"></div>
                  </h1>
                  {client && (
                    <div className="flex items-center space-x-4 mt-1 text-sm">
                      <span className="text-gray-600 dark:text-gray-400">UIC: {client.uic}</span>
                      <span className="text-gray-600 dark:text-gray-400">Client Code: {client.clientCode ?? ''}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="status-active text-white px-3 py-1 rounded-full text-sm font-medium">{client?.status ?? 'ACTIVE'}</span>
              </div>
            </div>

            {/* Quick Facts */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Age</p>
                <p className="font-semibold text-gray-900 dark:text-white">{client ? calcAge(client.dateOfBirth ?? null) : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Date of Birth</p>
                <p className="font-semibold text-gray-900 dark:text-white">{client ? formatDate(client.dateOfBirth ?? null) : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Sex at Birth</p>
                <p className="font-semibold text-gray-900 dark:text-white">{client?.sexAtBirth ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Gender Identity</p>
                <p className="font-semibold text-gray-900 dark:text-white">{client?.genderIdentity?.label ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Population</p>
                <p className="font-semibold text-gray-900 dark:text-white">{(client?.populations?.[0]?.population.label) ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Case Manager</p>
                <p className="font-semibold text-gray-900 dark:text-white">{client?.caseManager?.displayName ?? '—'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Reminders/Next Steps */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-8">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Reminders & Next Steps</h2>
            <div className="space-y-3">
              <div className="urgency-high bg-red-50 dark:bg-red-900/20 p-4 rounded-lg pulse-subtle">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="ribbon-icon"></div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Viral Load Results Review</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Lab drawn on Dec 15, 2024 - Results pending review</p>
                    </div>
                  </div>
                  <span className="text-sm text-red-600 dark:text-red-400 font-medium">3 days overdue</span>
                </div>
              </div>
              <div className="urgency-medium bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <svg className="h-5 w-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">ARV Refill Appointment</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">30-day supply expires Dec 22, 2024</p>
                    </div>
                  </div>
                  <span className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">Due today</span>
                </div>
              </div>
              <div className="urgency-low bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
                    </svg>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">STI Screening Due</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Last screening: Sep 15, 2024</p>
                    </div>
                  </div>
                  <span className="text-sm text-green-600 dark:text-green-400 font-medium">Due in 5 days</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Clinical Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-8">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Clinical Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Baseline CD4</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">187</p>
                <p className="text-xs text-gray-500 dark:text-gray-500">cells/μL (Jan 2024)</p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">First VL Date</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">Feb 15, 2024</p>
                <p className="text-xs text-gray-500 dark:text-gray-500">Initial: 45,000 copies/mL</p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Current VL Status</p>
                <div className="flex items-center justify-center space-x-2">
                  <span className="bg-lucky-2 text-white px-3 py-1 rounded-full text-sm font-medium">Undetectable</span>
                  <div className="ribbon-icon"></div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500">&lt; 20 copies/mL</p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Current Regimen</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">Bictegravir/TAF/FTC</p>
                <p className="text-xs text-gray-500 dark:text-gray-500">Started: Feb 2024</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <ClientTabs client={client} />
      </main>
    </div>
  );
}
