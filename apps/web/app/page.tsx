"use client";

import * as React from "react";
import { Header } from "@/components/Header";
import { EnrollmentChart } from "@/components/EnrollmentChart";

type StatusCount = { status: 'ACTIVE' | 'TRANSFERRED_OUT' | 'EXPIRED' | 'LOST_TO_FOLLOW_UP' | 'INACTIVE'; count: number };
type PopulationCount = { population: string; count: number };
type EnrollMonth = { month: string | Date; count: number };
type DashboardData = {
  overview: { totalClients: number; recentEnrollments: number; recentEncounters: number; pendingLabsCount: number };
  clients: { byStatus: StatusCount[]; byPopulation: PopulationCount[] };
  tasks: { overdue: number; dueToday: number; upcoming: unknown[] };
  trends: { enrollmentsByMonth: EnrollMonth[]; viralLoadStatus: unknown[] };
};

type Task = {
  id: string;
  title: string;
  type: 'FOLLOW_UP' | 'REFILL_PREP' | 'REFILL_ARV' | 'LABS_PENDING' | 'VL_MONITOR' | 'STI_SCREENING' | 'LTFU_REVIEW' | 'ADMIN';
  status: 'OPEN' | 'DONE' | 'DISMISSED';
  dueDate?: string;
  client?: { id: string; clientCode: string; legalSurname: string; legalFirst: string; preferredName?: string | null };
};

type TasksResponse = { tasks: Task[]; summary: { overdue: number; dueToday: number; total: number } };

function monthLabel(d: string | Date): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleString('en-US', { month: 'short' });
}

function format(n: number): string { return new Intl.NumberFormat('en-US').format(n); }

export default function HomePage() {
  const [dashboard, setDashboard] = React.useState<DashboardData | null>(null);
  const [tasks, setTasks] = React.useState<TasksResponse | null>(null);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [dRes, tRes] = await Promise.all([
          fetch('/api/dashboard', { credentials: 'include' }),
          fetch('/api/tasks?status=OPEN&limit=3', { credentials: 'include' })
        ]);
        if (mounted) {
          if (dRes.ok) {
            const d = await dRes.json() as { dashboard: DashboardData };
            setDashboard(d.dashboard);
          }
          if (tRes.ok) {
            const t = await tRes.json() as TasksResponse;
            setTasks(t);
          }
        }
      } catch {
        /* ignore */
      }
    })();
    return () => { mounted = false; };
  }, []);

  const total = dashboard?.overview.totalClients ?? 0;
  const statusMap = new Map((dashboard?.clients.byStatus ?? []).map(s => [s.status, s.count] as const));
  const active = statusMap.get('ACTIVE') ?? 0;
  const expired = statusMap.get('EXPIRED') ?? 0;
  const ltfu = statusMap.get('LOST_TO_FOLLOW_UP') ?? 0;
  const underMonitoring = dashboard?.overview.pendingLabsCount ?? 0;

  const enrollSeries = dashboard?.trends.enrollmentsByMonth ?? [];
  const labels = enrollSeries.map(e => monthLabel(e.month));
  const enrollments = enrollSeries.map(e => e.count);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border-l-4 border-lucky-2 card-hover animate-fade-in relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 gradient-secondary opacity-10 rounded-full -mr-10 -mt-10"></div>
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Enrolled</p>
                <p className="text-4xl font-bold text-gray-900 dark:text-white number-display">{format(total)}</p>
              </div>
              <div className="p-4 gradient-secondary rounded-2xl shadow-lg">
                <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className="text-sm font-semibold text-lucky-2 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">↗ +12 this month</span>
            </div>
          </div>

          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border-l-4 border-lucky-2 card-hover animate-fade-in relative overflow-hidden" style={{ animationDelay: "0.1s" }}>
            <div className="absolute top-0 right-0 w-20 h-20 gradient-secondary opacity-10 rounded-full -mr-10 -mt-10"></div>
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Active</p>
                <p className="text-4xl font-bold text-gray-900 dark:text-white number-display">{format(active)}</p>
              </div>
              <div className="p-4 gradient-secondary rounded-2xl shadow-lg">
                <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                {total > 0 ? `${((active / total) * 100).toFixed(1)}% retention` : '0% retention'}
              </span>
            </div>
          </div>

          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border-l-4 border-gray-400 card-hover animate-fade-in relative overflow-hidden" style={{ animationDelay: "0.2s" }}>
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-gray-400 to-gray-500 opacity-10 rounded-full -mr-10 -mt-10"></div>
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Expired</p>
                <p className="text-4xl font-bold text-gray-900 dark:text-white number-display">{format(expired)}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-gray-400 to-gray-500 rounded-2xl shadow-lg">
                <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">Needs follow-up</span>
            </div>
          </div>

          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border-l-4 border-lucky-3 card-hover animate-fade-in relative overflow-hidden" style={{ animationDelay: "0.3s" }}>
            <div className="absolute top-0 right-0 w-20 h-20 gradient-tertiary opacity-10 rounded-full -mr-10 -mt-10"></div>
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Under Monitoring</p>
                <p className="text-4xl font-bold text-gray-900 dark:text-white number-display">{format(underMonitoring)}</p>
              </div>
              <div className="p-4 gradient-tertiary rounded-2xl shadow-lg">
                <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full">Close monitoring</span>
            </div>
          </div>

          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border-l-4 border-yellow-500 card-hover animate-fade-in relative overflow-hidden" style={{ animationDelay: "0.4s" }}>
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-500 opacity-10 rounded-full -mr-10 -mt-10"></div>
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">LTFU</p>
                <p className="text-4xl font-bold text-gray-900 dark:text-white number-display">{format(ltfu)}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-2xl shadow-lg">
                <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-sm font-semibold text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded-full">Requires outreach</span>
            </div>
          </div>
        </div>

        {/* Charts and Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 card-hover animate-fade-in relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 gradient-secondary opacity-5 rounded-full -mr-16 -mt-16"></div>
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Enrollment Trends</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Monthly new client enrollments</p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 gradient-secondary rounded-full"></div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">2024</span>
              </div>
            </div>
            <EnrollmentChart labels={labels} enrollments={enrollments} />
          </div>

          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 card-hover animate-fade-in relative overflow-hidden" style={{ animationDelay: "0.2s" }}>
            <div className="absolute top-0 right-0 w-24 h-24 gradient-danger opacity-5 rounded-full -mr-12 -mt-12"></div>
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Priority Tasks</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Urgent actions required</p>
              </div>
              <div className="gradient-danger text-white text-xs px-3 py-1.5 rounded-full font-semibold shadow-lg glow-effect">
                {tasks?.summary.overdue ?? 0} overdue
              </div>
            </div>

            <div className="space-y-4">
              {(tasks?.tasks ?? []).map((t) => {
                const isOverdue = t.dueDate ? new Date(t.dueDate) < new Date() : false;
                const urgencyClass = isOverdue ? 'urgency-high bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border border-red-200 dark:border-red-800/30' : 'urgency-low bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-800/30';
                const dueText = t.dueDate ? (isOverdue ? 'Overdue' : 'Upcoming') : 'Scheduled';
                const name = t.client ? `${t.client.legalSurname}, ${t.client.legalFirst}` : '';
                return (
                  <div key={t.id} className={`${urgencyClass} p-4 rounded-xl`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="ribbon-icon mt-1"></div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{t.title}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Client: {name}</p>
                          {t.client?.clientCode && (
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{t.client.clientCode}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white/60 dark:bg-black/30 px-2 py-1 rounded-full">{dueText}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button className="w-full mt-6 gradient-tertiary text-white font-semibold py-3 px-4 rounded-xl hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02]">
              View All Tasks ({tasks?.summary.total ?? 0}) →
            </button>
          </div>
        </div>

        {/* Population Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Population Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {(dashboard?.clients.byPopulation ?? []).slice(0, 4).map((p, idx) => {
              const bg = ["bg-lucky-1", "bg-lucky-2", "bg-lucky-3", "bg-accent-red"][idx] ?? "bg-lucky-1";
              return (
                <div key={p.population} className="text-center">
                  <div className={`w-16 h-16 ${bg} rounded-full mx-auto mb-2 flex items-center justify-center`}>
                    <span className="text-white font-bold text-lg">{p.count}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{p.population}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">clients</p>
                </div>
              );
            })}
            {(!dashboard || (dashboard.clients.byPopulation ?? []).length === 0) && (
              <div className="col-span-4 text-sm text-gray-500 dark:text-gray-400">No population data yet.</div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="bg-lucky-2 text-white p-6 rounded-lg hover:bg-opacity-90 transition-colors tap-target">
            <div className="flex items-center justify-center mb-2">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
            </div>
            <p className="font-medium">New Client</p>
            <p className="text-sm opacity-90">Enroll new client</p>
          </button>
          <button className="bg-lucky-3 text-white p-6 rounded-lg hover:bg-opacity-90 transition-colors tap-target">
            <div className="flex items-center justify-center mb-2">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
            </div>
            <p className="font-medium">Lab Results</p>
            <p className="text-sm opacity-90">Enter lab data</p>
          </button>
          <button className="bg-accent-red text-white p-6 rounded-lg hover:bg-opacity-90 transition-colors tap-target">
            <div className="flex items-center justify-center mb-2">
              <div className="ribbon-icon"></div>
            </div>
            <p className="font-medium">Prescriptions</p>
            <p className="text-sm opacity-90">ARV/PrEP management</p>
          </button>
          <button className="bg-lucky-1 text-white p-6 rounded-lg hover:bg-opacity-90 transition-colors tap-target">
            <div className="flex items-center justify-center mb-2">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
              </svg>
            </div>
            <p className="font-medium">STI Screening</p>
            <p className="text-sm opacity-90">Record screening</p>
          </button>
        </div>
      </main>
    </div>
  );
}
