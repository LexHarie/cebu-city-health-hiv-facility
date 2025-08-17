"use client";

import * as React from "react";
import { SearchInput } from "@cebu-health/ui/components/SearchInput";
import { StatusBadge } from "@cebu-health/ui/components/StatusBadge";
import { RedRibbonIcon } from "@cebu-health/ui/components/RedRibbonIcon";
import { Plus, Filter, Download } from "lucide-react";

interface Client {
  id: string;
  clientCode: string;
  uic: string;
  legalSurname: string;
  legalFirst: string;
  preferredName?: string;
  dateOfBirth?: Date;
  status: "ACTIVE" | "INACTIVE" | "TRANSFERRED_OUT" | "EXPIRED" | "LOST_TO_FOLLOW_UP";
  lastVisitAt?: Date;
  caseManagerName?: string;
}

export default function ClientsPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");

  const [clients] = React.useState<Client[]>([
    {
      id: "1",
      clientCode: "CC-2024-001",
      uic: "UIC001",
      legalSurname: "Dela Cruz",
      legalFirst: "Juan",
      preferredName: "John",
      dateOfBirth: new Date("1990-05-15"),
      status: "ACTIVE",
      lastVisitAt: new Date("2024-08-10"),
      caseManagerName: "Dr. Santos",
    },
    {
      id: "2",
      clientCode: "CC-2024-002",
      uic: "UIC002", 
      legalSurname: "Santos",
      legalFirst: "Maria",
      dateOfBirth: new Date("1985-12-22"),
      status: "ACTIVE",
      lastVisitAt: new Date("2024-08-14"),
      caseManagerName: "Nurse Rivera",
    },
    {
      id: "3",
      clientCode: "CC-2024-003",
      uic: "UIC003",
      legalSurname: "Reyes",
      legalFirst: "Carlos",
      dateOfBirth: new Date("1978-03-08"),
      status: "LOST_TO_FOLLOW_UP",
      lastVisitAt: new Date("2024-05-20"),
      caseManagerName: "Dr. Santos",
    },
  ]);

  const filteredClients = React.useMemo(() => {
    return clients.filter(client => {
      const matchesSearch = searchQuery === "" || 
        client.legalSurname.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.legalFirst.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.preferredName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.clientCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.uic.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "ALL" || client.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [clients, searchQuery, statusFilter]);

  const calculateAge = (dateOfBirth?: Date) => {
    if (!dateOfBirth) return "N/A";
    const today = new Date();
    const age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      return age - 1;
    }
    return age;
  };

  const formatDate = (date?: Date) => {
    if (!date) return "Never";
    return new Intl.DateTimeFormat("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <RedRibbonIcon size={32} className="text-[#D4AF37]" />
            <h1 className="text-3xl font-bold text-gray-900">
              Client Management
            </h1>
          </div>
          <p className="text-gray-600">
            Search and manage HIV care clients
          </p>
        </div>

        <div className="bg-white rounded-lg border shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex-1 max-w-md">
                <SearchInput
                  placeholder="Search by name, client code, or UIC..."
                  onSearch={setSearchQuery}
                  className="w-full"
                />
              </div>
              
              <div className="flex items-center gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                >
                  <option value="ALL">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="TRANSFERRED_OUT">Transferred Out</option>
                  <option value="LOST_TO_FOLLOW_UP">Lost to Follow-up</option>
                  <option value="EXPIRED">Expired</option>
                </select>
                
                <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]">
                  <Filter className="w-4 h-4 mr-1" />
                  Filter
                </button>
                
                <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]">
                  <Download className="w-4 h-4 mr-1" />
                  Export
                </button>
                
                <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-[#D4AF37] hover:bg-[#B8941F] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]">
                  <Plus className="w-4 h-4 mr-1" />
                  New Client
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Identifiers
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Age
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Visit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Case Manager
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredClients.map((client) => (
                  <tr
                    key={client.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => { /* Navigate to client */ }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {client.legalSurname}, {client.legalFirst}
                        </div>
                        {client.preferredName && (
                          <div className="text-sm text-gray-500">
                            &quot;{client.preferredName}&quot;
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {client.clientCode}
                      </div>
                      <div className="text-sm text-gray-500">
                        UIC: {client.uic}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {calculateAge(client.dateOfBirth)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={client.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(client.lastVisitAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {client.caseManagerName || "Unassigned"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredClients.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-500">
                  {searchQuery ? "No clients found matching your search" : "No clients found"}
                </div>
              </div>
            )}
          </div>

          <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div>
                Showing {filteredClients.length} of {clients.length} clients
              </div>
              <div className="flex items-center space-x-2">
                <button
                  disabled
                  className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-400 cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1">1</span>
                <button
                  disabled
                  className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-400 cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}