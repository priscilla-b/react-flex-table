import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  createColumnHelper,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import cls from 'classnames'
import debounce from 'lodash.debounce'
import Toolbar from './Toolbar'
import ColumnVisibilityMenu from './ColumnVisibilityMenu'
import SavedViews from './SavedViews'
import Filters, { createDefaultFilterState, sanitizeFilterState } from './Filters'
import { fetchViews, createView, updateView, deleteViewServer } from '../lib/dataFetcher'

const columnHelper = createColumnHelper()
const RESOURCE = 'leads'
const FILTER_COLUMN_ID = '__filters__'

function stableStringify(value) {
  return JSON.stringify(value, (_, val) => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      return Object.keys(val)
        .sort()
        .reduce((acc, key) => {
          acc[key] = val[key]
          return acc
        }, {})
    }
    return val
  })
}

function filterStatesEqual(a, b) {
  return stableStringify(a) === stableStringify(b)
}

function extractFilterStateFromColumns(filtersArray) {
  if (!Array.isArray(filtersArray) || filtersArray.length === 0) {
    return createDefaultFilterState()
  }

  const entry = filtersArray.find(item => item?.id === FILTER_COLUMN_ID)
  if (entry && entry.value) {
    return sanitizeFilterState(entry.value)
  }

  const simple = {}
  filtersArray.forEach(item => {
    if (!item || typeof item !== 'object') return
    const { id, value } = item
    if (!id || value === '' || value === null || value === undefined) return
    simple[id] = value
  })

  const fallback = sanitizeFilterState(simple)
  fallback.mode = 'simple'
  return fallback
}

function EditableCell({ getValue, row, column, table }) {
  const initial = getValue()
  const [value, setValue] = useState(initial)
  const [editing, setEditing] = useState(false)
  const save = useRef(debounce((val)=>{
    table.options.meta?.onUpdateCell?.(row.original.id, column.id, val)
  }, 400)).current

  useEffect(()=>{ setValue(initial) }, [initial])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      setEditing(v => !v)
    } else if (e.key === 'Escape') {
      setValue(initial)
      setEditing(false)
    }
  }

  const handleSave = () => {
    setEditing(false)
    save(value)
  }

  return (
    <div
      tabIndex={0}
      onClick={()=>setEditing(true)}
      onKeyDown={handleKeyDown}
      className={cls(
        'relative group cursor-pointer transition-all duration-200',
        editing && 'table-cell-editing'
      )}
      title="click to edit"
    >
      {editing ? (
        <input
          className="table-cell-input"
          value={value ?? ''}
          onChange={e=>{ setValue(e.target.value); save(e.target.value) }}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      ) : (
        <span className="block group-hover:text-blue-600 transition-colors duration-200">
          {String(value ?? '')}
        </span>
      )}
      {!editing && (
        <div className="absolute inset-0 bg-blue-50 opacity-0 group-hover:opacity-20 transition-opacity duration-200 pointer-events-none rounded" />
      )}
    </div>
  )
}

export default function DataTable({ columns: userColumns, fetcher, entityName, storageKey, onCreate, onBulkDelete, onPatch }) {
  const [data, setData] = useState([])
  const [rowSelection, setRowSelection] = useState({})
  const [sorting, setSorting] = useState([])
  const [filterState, setFilterState] = useState(createDefaultFilterState())
  const [columnOrder, setColumnOrder] = useState([])
  const [columnVisibility, setColumnVisibility] = useState({})
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 })
  const [views, setViews] = useState([])
  const [viewLoading, setViewLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [dragging, setDragging] = useState(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const dragCol = useRef(null)
  const parentRef = useRef(null)



  const filterOptions = useMemo(() => {
    const getOptions = (key) => {
      const column = userColumns.find(col => col.accessorKey === key)
      return Array.isArray(column?.editor?.options) ? column.editor.options : []
    }
    return {
      stage: getOptions('stage'),
      source: getOptions('source'),
      owner: getOptions('owner'),
    }
  }, [userColumns])

  const columnFilters = useMemo(() => ([{ id: FILTER_COLUMN_ID, value: filterState }]), [filterState])

  const applyFilters = useCallback((nextFilters) => {
    const sanitized = sanitizeFilterState(nextFilters)
    let changed = false
    setFilterState(prev => {
      if (filterStatesEqual(prev, sanitized)) return prev
      changed = true
      return sanitized
    })
    if (changed) {
      setPagination(prev => ({ ...prev, pageIndex: 0 }))
    }
  }, [])

  const clearFilters = useCallback(() => {
    applyFilters(createDefaultFilterState())
  }, [applyFilters])

  const handleColumnFiltersChange = useCallback((updater) => {
    let changed = false
    setFilterState(prev => {
      const prevArray = [{ id: FILTER_COLUMN_ID, value: prev }]
      const nextArray = typeof updater === 'function' ? updater(prevArray) : updater
      const entry = Array.isArray(nextArray) ? nextArray.find(item => item?.id === FILTER_COLUMN_ID) : null
      if (!entry) return prev
      const sanitized = sanitizeFilterState(entry.value)
      if (filterStatesEqual(prev, sanitized)) return prev
      changed = true
      return sanitized
    })
    if (changed) {
      setPagination(prev => ({ ...prev, pageIndex: 0 }))
    }
  }, [])

  const columns = useMemo(()=>{
    return [
      {
        id: 'select',
        header: ({ table }) => (
          <input 
            type="checkbox" 
            className="checkbox"
            checked={table.getIsAllRowsSelected()} 
            onChange={table.getToggleAllRowsSelectedHandler()} 
          />
        ),
        cell: ({ row }) => (
          <input 
            type="checkbox" 
            className="checkbox"
            checked={row.getIsSelected()} 
            onChange={row.getToggleSelectedHandler()} 
          />
        ),
        size: 48,
        enableResizing: false
      },
      ...userColumns.map(c => ({
        ...c,
        header: c.header,
        cell: c.editable ? EditableCell : undefined,
        meta: { editable: !!c.editable }
      }))
    ]
  }, [userColumns])

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, columnOrder, columnVisibility, rowSelection, pagination },
    onSortingChange: setSorting,
    onColumnFiltersChange: handleColumnFiltersChange,
    onColumnOrderChange: setColumnOrder,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    enableColumnResizing: true,
    manualPagination: true,
    pageCount: Math.ceil(total / pagination.pageSize) || -1,
    autoResetPageIndex: false,
    autoResetAll: false,
    meta: {
      onUpdateCell: async (id, key, value) => {
        setData(prev => prev.map(r => r.id===id ? { ...r, [key]: value } : r))

        if (onPatch) {
          try {
            await onPatch(id, { [key]: value })
          } catch (error) {
            console.error('Failed to update cell:', error)
            setData(prev => prev.map(r => r.id===id ? { ...r, [key]: prev.find(orig => orig.id === id)?.[key] } : r))
          }
        }
      }
    },
    columnResizeMode: 'onChange'
  })

  const rowVirtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 10,
  })

  useEffect(() => {
    let mounted = true
    const loadViews = async () => {
      try {
        setViewLoading(true)
        const res = await fetchViews(RESOURCE)
        if (mounted) {
          setViews(res)
        }
      } finally {
        if (mounted) setViewLoading(false)
      }
    }
    loadViews()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(()=>{
    let active = true
    const run = async()=>{
      setLoading(true)
      try {
        const q = {
          page: pagination.pageIndex + 1,
          pageSize: pagination.pageSize,
          sort: sorting[0]?.id,
          dir: sorting[0]?.desc ? 'desc' : 'asc',
          filters: filterState
        }
        const res = await fetcher(q)
        if(!active) return
        setData(res.rows)
        setTotal(res.total)
      } finally {
        if(active) setLoading(false)
      }
    }
    run()
    return ()=>{ active = false }
  }, [fetcher, pagination.pageIndex, pagination.pageSize, sorting, filterState, refreshTrigger])

  const selectedCount = Object.keys(rowSelection).length
  const pageCount = Math.max(1, Math.ceil(total / pagination.pageSize))

  function currentStateSnapshot() {
    return { sorting, columnFilters, columnOrder, columnVisibility, pagination }
  }

  function applyViewState(st) {
    setSorting(st.sorting ?? [])
    setColumnOrder(st.columnOrder ?? [])
    setColumnVisibility(st.columnVisibility ?? {})
    setPagination(st.pagination ?? { pageIndex: 0, pageSize: 25 })

    const nextFilters = extractFilterStateFromColumns(st.columnFilters)
    setFilterState(prev => (filterStatesEqual(prev, nextFilters) ? prev : nextFilters))
  }

  async function saveCurrentView(name, { visibility='private', isDefault=false } = {}) {
    const state = currentStateSnapshot()
    const created = await createView(RESOURCE, name, state, visibility, isDefault)
    setViews(v => [...v.filter(x => x.id !== created.id), created].sort((a,b)=>a.name.localeCompare(b.name)))
  }

  async function loadViewById(id) {
    const v = views.find(x => x.id === id)
    if (!v) return
    applyViewState(v.state)
  }

  async function deleteViewById(id) {
    await deleteViewServer(id)
    setViews(v => v.filter(x => x.id !== id))
  }

  async function editViewMeta(id, { name, visibility }) {
    const patch = {}
    if (name) patch.name = name
    if (visibility) patch.visibility = visibility
    const updated = await updateView(id, patch)
    setViews(v => v.map(x => x.id === id ? updated : x).sort((a,b)=>a.name.localeCompare(b.name)))
  }

  async function saveCurrentStateToView(id) {
    const state = currentStateSnapshot()
    const updated = await updateView(id, { state })
    setViews(v => v.map(x => x.id === id ? updated : x))
  }

  const renderSortIndicator = (header) => {
    const sortState = header.column.getIsSorted()
    if (!sortState) return ''
    return sortState === 'asc' ? 'v' : '^'
  }

  return (
    <div className="animate-fade-in">
      <Toolbar
        onAdd={async () => {
          if (onCreate) {
            try {
              const newRecord = {
                company_name: 'New Company',
                contact_name: 'New Contact',
                email: 'new@example.com',
                phone: '',
                country: '',
                stage: 'Prospect',
                source: 'Referral',
                owner: 'Teammate A',
                annual_revenue: 0,
                next_action_date: new Date().toISOString().split('T')[0],
                created_at: new Date().toISOString(),
                tags: JSON.stringify([])
              }
              await onCreate(newRecord)
              setRefreshTrigger(prev => prev + 1)
            } catch (error) {
              console.error('Failed to create record:', error)
            }
          }
        }}
        onDeleteSelected={async () => {
          const selectedIds = Object.keys(rowSelection)
            .map(idx => table.getRowModel().rows[Number(idx)]?.original?.id)
            .filter(Boolean)
          
          if (selectedIds.length === 0) return
          
          if (onBulkDelete) {
            try {
              await onBulkDelete(selectedIds)
              setRowSelection({})
              setRefreshTrigger(prev => prev + 1)
            } catch (error) {
              console.error('Failed to delete records:', error)
            }
          }
        }}
        selectedCount={selectedCount}
      >
        <ColumnVisibilityMenu table={table} />
        <Filters
          filters={filterState}
          onApply={applyFilters}
          onClear={clearFilters}
          options={filterOptions}
        />
        <SavedViews 
          views={views}
          onSave={saveCurrentView}
          onLoad={loadViewById}
          onDelete={deleteViewById}
          onEditMeta={editViewMeta}
          onSaveState={saveCurrentStateToView}
          loading={viewLoading}
        />
      </Toolbar>

      <div className="table-container">
        <div ref={parentRef} className="max-h-[520px] overflow-auto custom-scrollbar border-t border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="table-header">
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th
                        key={header.id}
                        style={{ width: header.getSize() }}
                        className={cls(
                          'table-header-cell',
                          header.column.id === dragging && 'dragging'
                        )}
                        draggable
                        onDragStart={()=>{ 
                          dragCol.current = header.column.id
                          setDragging(header.column.id)
                        }}
                        onDragEnd={() => setDragging(null)}
                        onDragOver={(e)=>e.preventDefault()}
                        onDrop={()=>{
                          const src = dragCol.current
                          const dest = header.column.id
                          if (!src || src===dest) return
                          const order = table.getState().columnOrder.length ? [...table.getState().columnOrder] : table.getAllLeafColumns().map(c=>c.id)
                          const srcIdx = order.indexOf(src)
                          const destIdx = order.indexOf(dest)
                          order.splice(destIdx, 0, ...order.splice(srcIdx, 1))
                          setColumnOrder(order)
                          setDragging(null)
                        }}
                      >
                        {header.isPlaceholder ? null : (
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={header.column.getToggleSortingHandler()} 
                              className="flex items-center gap-2 hover:text-blue-600 transition-colors duration-200"
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              <span className="sort-indicator">{renderSortIndicator(header)}</span>
                            </button>
                            {header.column.getCanResize() && (
                              <div
                                onMouseDown={header.getResizeHandler()}
                                onTouchStart={header.getResizeHandler()}
                                className="resize-handle"
                              />
                            )}
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody 
                className="virtual-table-container"
                style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}
              >
                {loading ? (
                  <tr>
                    <td colSpan={table.getAllLeafColumns().length}>
                      <div className="p-8 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <p className="mt-2 text-sm text-gray-500">Loading page {pagination.pageIndex + 1}...</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rowVirtualizer.getVirtualItems().map(virtualRow => {
                    const row = table.getRowModel().rows[virtualRow.index]
                    const isSelected = row.getIsSelected()
                    return (
                      <tr
                        key={row.id}
                        className={cls(
                          'table-row absolute left-0 right-0',
                          isSelected && 'selected',
                          virtualRow.index % 2 === 0 && 'bg-white'
                        )}
                        style={{ transform: `translateY(${virtualRow.start}px)` }}
                      >
                        {row.getVisibleCells().map(cell => (
                          <td 
                            key={cell.id} 
                            className={cls(
                              'table-cell',
                              cell.column.id === 'select' && 'checkbox-cell'
                            )} 
                            style={{ width: cell.column.getSize() }}
                          >
                            {flexRender(cell.column.columnDef.cell ?? ((ctx)=>ctx.getValue()?.toString?.() ?? ''), cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4 animate-slide-in">
        <div className="text-xs sm:text-sm text-gray-600">
          <span className="font-medium">{total.toLocaleString()}</span> {entityName.toLowerCase()}
          {selectedCount > 0 && (
            <span className="ml-2 text-blue-600 font-medium">
              - {selectedCount} selected
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            className="pagination-button"
            onClick={()=>setPagination(p=>({...p, pageIndex: Math.max(0, p.pageIndex-1)}))}
            disabled={pagination.pageIndex===0 || loading}
          >
            <span className="hidden sm:inline">{'<- Previous'}</span>
            <span className="sm:hidden">{'<- Prev'}</span>
          </button>
          <span className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap">
            <span className="hidden sm:inline">Page {pagination.pageIndex+1} of {pageCount}</span>
            <span className="sm:hidden">{pagination.pageIndex+1}/{pageCount}</span>
          </span>
          <button
            className="pagination-button"
            onClick={()=>setPagination(p=>({...p, pageIndex: Math.min((pageCount-1), p.pageIndex+1)}))}
            disabled={pagination.pageIndex+1>=pageCount || loading}
          >
            <span className="hidden sm:inline">{'Next ->'}</span>
            <span className="sm:hidden">{'Next ->'}</span>
          </button>
          <select
            className="pagination-select"
            value={pagination.pageSize}
            onChange={e=>setPagination({ ...pagination, pageSize: Number(e.target.value), pageIndex: 0 })}
            disabled={loading}
          >
            {[10,25,50,100].map(s=> <option key={s} value={s}>{s} per page</option>)}
          </select>
        </div>
      </div>
    </div>
  )
}









