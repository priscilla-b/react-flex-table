import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import cls from 'classnames'
import debounce from 'lodash.debounce'
import Toolbar from './Toolbar'
import { useToast } from './ToastProvider'
import ColumnVisibilityMenu from './ColumnVisibilityMenu'
import SavedViews from './SavedViews'
import BulkEditDialog from './BulkEditDialog'
import BulkDuplicateDialog from './BulkDuplicateDialog'
import NewRecordDialog from './NewRecordDialog'
import Filters, { createDefaultFilterState, sanitizeFilterState } from './Filters'
import { fetchViews, createView, updateView, deleteViewServer } from '../lib/dataFetcher'
import Modal from './Modal'

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
  const initial = getValue();
  const [value, setValue] = useState(initial);
  const [editing, setEditing] = useState(false);

  const editor = column.columnDef?.editor || {};
  const editorType = editor.type || 'textarea';

  // debounce for text/textarea
  const saveDebounced = useRef(
    debounce((val) => {
      table.options.meta?.onUpdateCell?.(row.original.id, column.id, val);
    }, 300)
  ).current;

  // immediate save (used by select/date/number when it makes sense)
  const saveNow = useCallback((val) => {
    table.options.meta?.onUpdateCell?.(row.original.id, column.id, val);
  }, [row.original.id, column.id, table.options.meta]);

  useEffect(() => { setValue(initial); }, [initial]);

  const exitEdit = useCallback(() => setEditing(false), []);
  const cancelEdit = useCallback(() => { setValue(initial); setEditing(false); }, [initial]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      cancelEdit();
      return;
    }
    if (e.key === 'Enter') {
      if (editorType === 'textarea' || editorType === 'number' || editorType === 'date') {
        // flush debounced save for text/textarea; others will have saved on change
        saveDebounced.flush?.();
        exitEdit();
      }
    }
  };

  // ===== textarea autosize =====
  const textareaRef = useRef(null);
  const syncTextareaHeight = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
  }, []);
  useEffect(() => { if (editing && editorType === 'textarea') syncTextareaHeight(); }, [editing, value, editorType, syncTextareaHeight]);

  // focus when entering edit
  const inputRef = useRef(null);
  const selectRef = useRef(null);
  useEffect(() => {
    if (!editing) return;
    const el =
      editorType === 'textarea' ? textareaRef.current :
      editorType === 'select' ? selectRef.current :
      inputRef.current;
    el?.focus?.();
    if (editorType === 'date' && el?.showPicker) el.showPicker();
  }, [editing, editorType, value]);

  const selectOptions = Array.isArray(editor.options) ? editor.options : [];
  const normOptions = selectOptions.map(opt =>
    typeof opt === 'string' ? { label: opt, value: opt } : opt
  );
  const allowNull = editor.allowNull ?? true;

  const renderEditor = () => {
    switch (editorType) {
      case 'select':
        return (
          <select
            ref={selectRef}
            className="w-full bg-transparent outline-none leading-5"
            value={value ?? ''} 
            onChange={(e) => {
              const v = e.target.value === '' ? null : e.target.value;
              setValue(v);
              saveNow(v);        
              exitEdit();        
            }}
            onBlur={() => exitEdit()}
            onKeyDown={handleKeyDown}
          >
            {allowNull && <option value="">{editor.placeholder ?? '—'}</option>}
            {normOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        );

      case 'date':
        return (
          <input
            ref={inputRef}
            type="date"
            className="w-full bg-transparent outline-none leading-5"
            value={(value ?? '').toString().slice(0,10)}
            onChange={(e) => { setValue(e.target.value); saveNow(e.target.value); }}
            onBlur={() => exitEdit()}
            onKeyDown={handleKeyDown}
          />
        );

      case 'number':
        return (
          <input
            ref={inputRef}
            type="number"
            className="w-full bg-transparent outline-none leading-5"
            value={value ?? ''}
            onChange={(e) => {
              const num = e.target.value === '' ? null : Number(e.target.value);
              setValue(num);
              saveDebounced(num);
            }}
            onBlur={() => { saveDebounced.flush?.(); exitEdit(); }}
            onKeyDown={handleKeyDown}
          />
        );

      case 'textarea':
        return (
          <textarea
            ref={textareaRef}
            rows={1}
            className="w-full resize-none leading-5 bg-transparent outline-none"
            value={value ?? ''}
            onChange={(e) => { setValue(e.target.value); saveDebounced(e.target.value); syncTextareaHeight(); }}
            onBlur={() => { saveDebounced.flush?.(); exitEdit(); }}
            onKeyDown={handleKeyDown}
          />
        );

      default: // 'text'
        return (
          <input
            ref={inputRef}
            className="w-full bg-transparent outline-none leading-5"
            value={value ?? ''}
            onChange={(e) => { setValue(e.target.value); saveDebounced(e.target.value); }}
            onBlur={() => { saveDebounced.flush?.(); exitEdit(); }}
            onKeyDown={handleKeyDown}
          />
        );
    }
  };

  const renderDisplay = () => {
    return (
      <div className="cell-truncate">
        <span className="cell-truncate-inner block">{String(value ?? '')}</span>
      </div>
    );
  };

  return (
    <div
      tabIndex={0}
      onClick={() => setEditing(true)}
      onKeyDown={handleKeyDown}
      className={cls(
        'relative group cursor-pointer transition-all duration-200',
        editing && 'relative px-2 py-1 bg-slate-50 border-2 border-blue-500 rounded'
      )}
      title="click to edit"
    >
      {editing ? renderEditor() : renderDisplay()}

      {!editing && (
        <div className="absolute inset-0 bg-blue-50 opacity-0 group-hover:opacity-20 transition-opacity duration-200 pointer-events-none rounded" />
      )}
    </div>
  );
}


export default function DataTable({ columns: userColumns, fetcher, entityName, onCreate, onBulkDelete, onBulkEdit, onBulkDuplicate, onBulkUpload, onPatch }) {
  const toast = useToast()
  const [data, setData] = useState([])
  const [rowSelection, setRowSelection] = useState({})
  const [sorting, setSorting] = useState([])
  const [filterState, setFilterState] = useState(createDefaultFilterState())
  const [columnOrder, setColumnOrder] = useState([])
  const [columnVisibility, setColumnVisibility] = useState({})
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 100 })
  const [views, setViews] = useState([])
  const [activeViewId, setActiveViewId] = useState(null)
  const [viewLoading, setViewLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [dragging, setDragging] = useState(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [bulkEditOpen, setBulkEditOpen] = useState(false)
  const [bulkDuplicateOpen, setBulkDuplicateOpen] = useState(false)
  const [bulkEditLoading, setBulkEditLoading] = useState(false)
  const [bulkDuplicateLoading, setBulkDuplicateLoading] = useState(false)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [highlightedRowId, setHighlightedRowId] = useState(null)

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

  const currentViewState = useMemo(() => currentStateSnapshot(), [sorting, columnFilters, columnOrder, columnVisibility, pagination])
  const activeView = useMemo(() => views.find(v => v.id === activeViewId) ?? null, [views, activeViewId])
  const activeViewDirty = useMemo(() => {
    if (!activeView) return false
    return stableStringify(activeView.state) !== stableStringify(currentViewState)
  }, [activeView, currentViewState])
  const clearActiveView = useCallback(() => setActiveViewId(null), [])

  useEffect(() => {
    if (!activeViewId) return
    if (!views.some(v => v.id === activeViewId)) {
      setActiveViewId(null)
    }
  }, [views, activeViewId])

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
        size: 34,
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
    columnResizeMode: 'onChange',
    defaultColumn: {
      size: 150,
      minSize: 80,
      maxSize: 300,
    },
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
    }
  })

  const rowVirtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 10,
  })

  useEffect(() => {
    if (!highlightedRowId) return undefined
    const timer = setTimeout(() => setHighlightedRowId(null), 4000)
    return () => clearTimeout(timer)
  }, [highlightedRowId])

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

  const selectedRowModel = table.getSelectedRowModel()
  const selectedFlatRows = selectedRowModel.flatRows
  const selectedIds = selectedFlatRows.map(row => row.original?.id).filter(Boolean)
  const selectedCount = selectedFlatRows.length
  const hasSelection = selectedCount > 0
  const pageCount = Math.max(1, Math.ceil(total / pagination.pageSize))

  function currentStateSnapshot() {
    return { sorting, columnFilters, columnOrder, columnVisibility, pagination }
  }

  function applyViewState(st) {
    setSorting(st.sorting ?? [])
    setColumnOrder(st.columnOrder ?? [])
    setColumnVisibility(st.columnVisibility ?? {})
    setPagination(st.pagination ?? { pageIndex: 0, pageSize: 100 })

    const nextFilters = extractFilterStateFromColumns(st.columnFilters)
    setFilterState(prev => (filterStatesEqual(prev, nextFilters) ? prev : nextFilters))
  }

  async function saveCurrentView(name, { visibility='private', isDefault=false } = {}) {
    const state = currentStateSnapshot()
    const created = await createView(RESOURCE, name, state, visibility, isDefault)
    setViews(v => [...v.filter(x => x.id !== created.id), created].sort((a,b)=>a.name.localeCompare(b.name)))
    setActiveViewId(created.id)
  }

  async function loadViewById(id) {
    const v = views.find(x => x.id === id)
    if (!v) return
    applyViewState(v.state)
    setActiveViewId(v.id)
  }

  async function deleteViewById(id) {
    await deleteViewServer(id)
    setViews(v => v.filter(x => x.id !== id))
    if (id === activeViewId) {
      setActiveViewId(null)
    }
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

  async function handleBulkEditConfirm(columnId, value) {
    if (!onBulkEdit) return
    if (!columnId || !selectedIds.length) return
    setBulkEditLoading(true)
    try {
      await onBulkEdit(selectedIds, columnId, value)
      setBulkEditOpen(false)
      setRowSelection({})
      setRefreshTrigger(prev => prev + 1)
      toast.success(`Updated ${selectedIds.length} ${entityName.toLowerCase()} successfully`)
    } catch (error) {
      console.error('Failed to bulk edit records:', error)
      toast.error('Failed to update selected records')
    } finally {
      setBulkEditLoading(false)
    }
  }

  async function handleBulkDuplicateConfirm(options = {}) {
    if (!onBulkDuplicate) return
    if (!selectedIds.length) return
    setBulkDuplicateLoading(true)
    try {
      await onBulkDuplicate(selectedIds, options)
      setBulkDuplicateOpen(false)
      setRowSelection({})
      setRefreshTrigger(prev => prev + 1)
      const copies = Number(options?.copies || 1)
      const total = copies * selectedIds.length
      toast.success(`Duplicated ${total} ${entityName.toLowerCase()}`)
    } catch (error) {
      console.error('Failed to duplicate records:', error)
      toast.error('Failed to duplicate selected records')
    } finally {
      setBulkDuplicateLoading(false)
    }
  }

  const handleCreateSubmit = async (formValues) => {
    if (!onCreate) return
    setCreateLoading(true)
    try {
      const payload = { ...formValues }
      payload.annual_revenue = payload.annual_revenue === '' || payload.annual_revenue == null ? null : Number(payload.annual_revenue)
      if (Number.isNaN(payload.annual_revenue)) {
        throw new Error('Annual revenue must be a number or left blank.')
      }
      payload.next_action_date = payload.next_action_date || null
      payload.notes = (payload.notes ?? '').trim()

      const created = await onCreate(payload)
      if (!created || typeof created !== 'object') {
        throw new Error('Server did not return the created record.')
      }

      setCreateOpen(false)
      setPagination(prev => ({ ...prev, pageIndex: 0 }))
      setData(prev => {
        const previous = Array.isArray(prev) ? prev : []
        const without = previous.filter(row => row.id !== created.id)
        const next = [created, ...without]
        return pagination.pageSize ? next.slice(0, pagination.pageSize) : next
      })
      setTotal(prev => prev + 1)
      setRowSelection({})
      setHighlightedRowId(created.id)
      requestAnimationFrame(() => {
        parentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      })
    } catch (error) {
      throw error
    } finally {
      setCreateLoading(false)
    }
  }

  const renderSortIndicator = (header) => {
    const sortState = header.column.getIsSorted()
    if (!sortState) return ''
    return sortState === 'asc' ? 'v' : '^'
  }

  return (
    <div className="animate-fade-in flex flex-col h-full">
      <div className="flex-shrink-0">
        <Toolbar
            onAdd={() => setCreateOpen(true)}
            onDeleteSelected={async () => {
            if (!onBulkDelete || !selectedIds.length) return
            setBulkDeleteOpen(true)
            }}
            onBulkEdit={onBulkEdit ? () => { if (!hasSelection) return; setBulkEditOpen(true) } : undefined}
            onBulkDuplicate={onBulkDuplicate ? () => { if (!hasSelection) return; setBulkDuplicateOpen(true) } : undefined}
            onBulkUpload={typeof onBulkUpload === 'function' ? onBulkUpload : undefined}
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
            activeView={activeView}
            activeViewDirty={activeViewDirty}
            onClearActive={clearActiveView}
            />
        </Toolbar>
      </div>
      {createOpen && (
        <NewRecordDialog
          open={createOpen}
          onClose={() => { if (!createLoading) setCreateOpen(false) }}
          onSubmit={handleCreateSubmit}
          loading={createLoading}
          options={filterOptions}
        />
      )}

      {onBulkEdit && (
        <BulkEditDialog
          open={bulkEditOpen}
          onClose={() => { if (!bulkEditLoading) setBulkEditOpen(false) }}
          columns={userColumns}
          selectionCount={selectedCount}
          loading={bulkEditLoading}
          onConfirm={handleBulkEditConfirm}
        />
      )}
      {onBulkDuplicate && (
        <BulkDuplicateDialog
          open={bulkDuplicateOpen}
          onClose={() => { if (!bulkDuplicateLoading) setBulkDuplicateOpen(false) }}
          selectionCount={selectedCount}
          loading={bulkDuplicateLoading}
          onConfirm={handleBulkDuplicateConfirm}
        />
      )}

      {/* Bulk Delete Confirmation */}
      {onBulkDelete && (
        <Modal
          open={bulkDeleteOpen}
          onClose={() => { if (!bulkDeleteLoading) setBulkDeleteOpen(false) }}
          title={`Delete ${selectedCount} ${entityName.toLowerCase()}?`}
          description="This action cannot be undone. The selected records will be permanently removed."
          actions={[
            { label: 'Cancel', onClick: () => { if (!bulkDeleteLoading) setBulkDeleteOpen(false) } },
            { label: bulkDeleteLoading ? 'Deleting…' : 'Delete', variant: 'danger', disabled: bulkDeleteLoading, onClick: async () => {
              if (!onBulkDelete || !selectedIds.length) return
              setBulkDeleteLoading(true)
              try {
                await onBulkDelete(selectedIds)
                setBulkDeleteOpen(false)
                setRowSelection({})
                setRefreshTrigger(prev => prev + 1)
                toast.success(`Deleted ${selectedIds.length} ${entityName.toLowerCase()}`)
              } catch (error) {
                console.error('Failed to delete records:', error)
                toast.error('Failed to delete selected records')
              } finally {
                setBulkDeleteLoading(false)
              }
            } }
          ]}
        >
          <div className="text-sm text-gray-700">
            <p>You're about to delete <span className="font-semibold">{selectedCount}</span> {entityName.toLowerCase()}.</p>
            <p className="mt-2">Please confirm to proceed.</p>
          </div>
        </Modal>
      )}

    <div className="table-container flex-1 flex flex-col min-h-0 min-w-0">
        <div ref={parentRef} className="flex-1 min-h-0 min-w-0 overflow-auto custom-scrollbar">
          <table className="min-w-full table-fixed" style={{ width: table.getTotalSize() }}>
            <thead className="table-header sticky top-0 z-10">
              
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => {
                      const headerSize = header.getSize?.() ?? header.column.getSize?.()
                      const normalizedHeaderWidth = Number.isFinite(headerSize) ? headerSize : undefined
                      const headerStyle = normalizedHeaderWidth
                        ? {
                            width: normalizedHeaderWidth,
                            minWidth: header.column.columnDef?.minSize ?? normalizedHeaderWidth,
                            maxWidth: header.column.columnDef?.maxSize ?? normalizedHeaderWidth,
                          }
                        : undefined
                      return (
                        <th
                          key={header.id}
                          style={headerStyle}
                          className={cls(
                            'table-header-cell',
                            header.column.id === 'select' && 'checkbox-cell',
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
                          header.column.id === 'select' ? (
                            <div className="flex items-center justify-center">
                              {flexRender(header.column.columnDef.header, header.getContext())}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={header.column.getToggleSortingHandler()} 
                                className="flex items-center gap-1 hover:text-blue-600 transition-colors duration-200 text-left"
                              >
                                {flexRender(header.column.columnDef.header, header.getContext())}
                                {header.column.getIsSorted() && (
                                  <svg className="w-3 h-3 ml-1" fill="currentColor" viewBox="0 0 20 20">
                                    {header.column.getIsSorted() === 'asc' ? (
                                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                    ) : (
                                      <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                                    )}
                                  </svg>
                                )}
                              </button>
                              {header.column.getCanResize() && (
                                <div
                                  onMouseDown={header.getResizeHandler()}
                                  onTouchStart={header.getResizeHandler()}
                                  className="resize-handle w-1 h-4 bg-gray-300 hover:bg-blue-500 cursor-col-resize transition-colors duration-200"
                                />
                              )}
                            </div>
                          )
                        )}
                      </th>
                    )})}
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
                        ref={rowVirtualizer.measureElement}
                        data-index={virtualRow.index}
                        className={cls(
                          'table-row absolute left-0 right-0',
                          isSelected && 'selected',
                          highlightedRowId === row.original?.id && 'row-highlight',
                          virtualRow.index % 2 === 0 ? 'row-even' : 'row-odd'
                        )}
                        style={{ transform: `translateY(${virtualRow.start}px)` }}
                      >
                        {row.getVisibleCells().map(cell => {
                          const isInteractive = cell.column.id === 'select' || cell.column.columnDef.meta?.editable
                          const content = flexRender(cell.column.columnDef.cell ?? ((ctx)=>ctx.getValue()?.toString?.() ?? ''), cell.getContext())
                          const rawValue = cell.getValue?.()
                          const rawSize = cell.column.getSize?.()
                          const normalizedWidth = Number.isFinite(rawSize) ? rawSize : undefined
                          const cellStyle = normalizedWidth
                            ? { width: normalizedWidth, minWidth: normalizedWidth, maxWidth: normalizedWidth }
                            : undefined
                          const truncateStyle = normalizedWidth ? { '--cell-max-w': `${normalizedWidth}px` } : undefined
                          const tooltip =
                            rawValue === null || rawValue === undefined
                              ? undefined
                              : typeof rawValue === 'string'
                                ? rawValue
                                : (typeof rawValue === 'number' || typeof rawValue === 'boolean')
                                  ? String(rawValue)
                                  : undefined
                          return (
                            <td 
                              key={cell.id} 
                              className={cls(
                                'table-cell',
                                cell.column.id === 'select' && 'checkbox-cell'
                              )} 
                              style={cellStyle}
                            >
                              {isInteractive ? content : (
                                <div className="cell-truncate" style={truncateStyle} title={tooltip}>
                                  <div className="cell-truncate-inner">{content}</div>
                                </div>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
        </div>
      </div>

     <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 px-6 py-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="text-sm text-gray-600">
            <span className="font-medium">{total.toLocaleString()}</span> {entityName.toLowerCase()}
            {selectedCount > 0 && (
              <span className="ml-2 text-blue-600 font-medium">
                - {selectedCount} selected
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              onClick={()=>setPagination(p=>({...p, pageIndex: Math.max(0, p.pageIndex-1)}))}
              disabled={pagination.pageIndex===0 || loading}
            >
              <span className="hidden sm:inline">Previous</span>
              <span className="sm:hidden">Prev</span>
            </button>
            <span className="text-sm font-medium text-gray-700 whitespace-nowrap px-2">
              <span className="hidden sm:inline">Page {pagination.pageIndex+1} of {pageCount}</span>
              <span className="sm:hidden">{pagination.pageIndex+1}/{pageCount}</span>
            </span>
            <button
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              onClick={()=>setPagination(p=>({...p, pageIndex: Math.min((pageCount-1), p.pageIndex+1)}))}
              disabled={pagination.pageIndex+1>=pageCount || loading}
            >
              <span className="hidden sm:inline">Next</span>
              <span className="sm:hidden">Next</span>
            </button>
            <select
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              value={pagination.pageSize}
              onChange={e=>setPagination({ ...pagination, pageSize: Number(e.target.value), pageIndex: 0 })}
              disabled={loading}
            >
              {[100,200,300,400].map(s=> <option key={s} value={s}>{s} per page</option>)}
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}




