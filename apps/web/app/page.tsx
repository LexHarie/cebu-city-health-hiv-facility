"use client";

import * as React from "react";
import { KPICard } from "@cebu-health/ui/components/KPICard";
import { TaskList } from "@cebu-health/ui/components/TaskList";
import { RedRibbonIcon } from "@cebu-health/ui/components/RedRibbonIcon";
import { Users, Activity, Calendar, AlertTriangle } from "lucide-react";

export default function HomePage() {
  const [dashboardData] = React.useState({
    totalClients: 1247,
    activeClients: 1156,
    newEnrollments: 23,
    overdueVisits: 34,
    totalEnrollmentsTrend: { value: 8.2, isPositive: true },
    activeClientsTrend: { value: 3.1, isPositive: true },
    newEnrollmentsTrend: { value: 12.5, isPositive: true },
    overdueVisitsTrend: { value: 5.2, isPositive: false },
  });

  const [recentTasks] = React.useState([
    {
      id: "1",
      title: "Viral load monitoring due",
      type: "VL_MONITOR" as const,
      status: "OPEN" as const,
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      clientName: "John D.",
      clientCode: "CC-2024-001",
    },
    {
      id: "2", 
      title: "ARV refill required",
      type: "REFILL_ARV" as const,
      status: "OPEN" as const,
      dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      clientName: "Maria S.",
      clientCode: "CC-2024-002",
    },
    {
      id: "3",
      title: "Follow-up appointment",
      type: "FOLLOW_UP" as const,
      status: "OPEN" as const,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      clientName: "Carlos R.",
      clientCode: "CC-2024-003",
    },
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <RedRibbonIcon size={32} className="text-[#D4AF37]" />
            <h1 className="text-3xl font-bold text-gray-900">
              HIV Care Management Dashboard
            </h1>
          </div>
          <p className="text-gray-600">
            Overview of client care status and key metrics
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard
            title="Total Clients"
            value={dashboardData.totalClients.toLocaleString()}
            subtitle="All enrolled clients"
            trend={dashboardData.totalEnrollmentsTrend}
            icon={<Users />}
          />
          <KPICard
            title="Active Clients"
            value={dashboardData.activeClients.toLocaleString()}
            subtitle="Currently in care"
            trend={dashboardData.activeClientsTrend}
            icon={<Activity />}
          />
          <KPICard
            title="New Enrollments"
            value={dashboardData.newEnrollments}
            subtitle="This month"
            trend={dashboardData.newEnrollmentsTrend}
            icon={<Calendar />}
          />
          <KPICard
            title="Overdue Visits"
            value={dashboardData.overdueVisits}
            subtitle="Require follow-up"
            trend={dashboardData.overdueVisitsTrend}
            icon={<AlertTriangle />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Priority Tasks
            </h2>
            <TaskList 
              tasks={recentTasks.filter(task => task.status === "OPEN")}
              onTaskClick={() => {
                /* Handle task click */
              }}
            />
          </div>

          <div className="bg-white rounded-lg border shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <button className="p-4 text-left rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="font-medium text-sm">New Client</div>
                <div className="text-xs text-gray-500">Enroll new patient</div>
              </button>
              <button className="p-4 text-left rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="font-medium text-sm">Search Clients</div>
                <div className="text-xs text-gray-500">Find existing patients</div>
              </button>
              <button className="p-4 text-left rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="font-medium text-sm">Lab Results</div>
                <div className="text-xs text-gray-500">Enter test results</div>
              </button>
              <button className="p-4 text-left rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="font-medium text-sm">Reports</div>
                <div className="text-xs text-gray-500">Generate reports</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}