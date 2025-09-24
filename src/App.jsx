import React, { useMemo } from 'react'
import DataTable from './components/DataTable'
import { fetchLeads, patchLead, bulkDeleteLeads, bulkEditLeads, bulkDuplicateLeads, createLead } from './lib/dataFetcher'

// TODO: Fetch from server
const STAGES = ['Prospect','Qualified','Proposal','Won','Lost']
const SOURCES = ['Referral','Ads','Events','Outbound','Organic']
const OWNERS = ['Teammate A','Teammate B', 'Teammate C']

export default function App() {
  const columns = useMemo(() => [
    { accessorKey: 'id', header: 'ID', size: 48 },
    { accessorKey: 'company_name', header: 'Company', size: 200, editable: true, required: true },
    { accessorKey: 'contact_name', header: 'Contact', size: 180, editable: true, required: true },
    { accessorKey: 'email', header: 'Email', size: 200, editable: true, required: true },
    { accessorKey: 'phone', header: 'Phone', size: 140, editable: true },
    { accessorKey: 'country', header: 'Country', size: 120, editable: true },
    { accessorKey: 'stage', header: 'Stage', size: 120, editable: true, required: true, editor: { type: 'select', options: STAGES, allowNull: false } },
    { accessorKey: 'source', header: 'Source', size: 120, editable: true, required: true, editor: { type: 'select', options: SOURCES, allowNull: false } },
    { accessorKey: 'owner', header: 'Owner', size: 120, editable: true, required: true, editor: { type: 'select', options: OWNERS, allowNull: false } },
    { accessorKey: 'annual_revenue', header: 'Annual Revenue', size: 120, editable: true, editor: { type: 'number' }, cellFormat: 'currency' },
    { accessorKey: 'next_action_date', header: 'Next Action', size: 120, editable: true, editor: { type: 'date' } },
    { accessorKey: 'notes', header: 'Notes', size: 320, editable: true },
    { accessorKey: 'created_at', header: 'Created', size: 120 },
  ], [])

  return (
    <div className="h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm flex-shrink-0">
        <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h2a2 2 0 002-2z" />
              </svg>
            </div>
            <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">CRM Leads</h1>
            <p className="text-xs sm:text-sm text-gray-500">Flexible & intuitive data management for entrepreneurs</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-2 sm:p-4 lg:p-6 overflow-hidden">
        <div className="w-full h-full">
          <div className="bg-white/70 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl border border-white/20 p-2 sm:p-4 lg:p-6 h-full flex flex-col">
            <DataTable
              columns={columns}
              fetcher={fetchLeads}
              entityName="Leads"
              onCreate={createLead}
              onBulkDelete={bulkDeleteLeads}
              onBulkEdit={bulkEditLeads}
              onBulkDuplicate={bulkDuplicateLeads}
              onPatch={patchLead}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
