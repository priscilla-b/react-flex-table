import React, { useRef, useState } from 'react'

export default function SavedViews({ views, onSave, onLoad, onDelete, onEditMeta, onSaveState,  loading = false, }) {
  const [open, setOpen] = useState(false)
  const inputRef = useRef(null)
  const [saveName, setSaveName] = useState('');
  const [saveVisibility, setSaveVisibility] = useState('private')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editVisibility, setEditVisibility] = useState('private')

   const handleSaveNew = async () => {
    if (!saveName.trim()) return;
    await onSave?.(saveName.trim(), { visibility: saveVisibility });
    setSaveName('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave()
    }
  }

  const beginEdit = (v) => {
    setEditingId(v.id);
    setEditName(v.name);
    setEditVisibility(v.visibility || 'private');
  }

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditVisibility('private');
  }

  const handleEditMeta = async () => {
    if (!editingId) return;
    await onEditMeta?.(editingId, { name: editName.trim(), visibility: editVisibility });
    cancelEdit();
  };

  const isArray = Array.isArray(views)
  const count = isArray ? (views?.length || 0) : Object.keys(views || {}).length

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="toolbar-button bg-gray-100 hover:bg-gray-200 text-gray-700"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
        Views ({count})
      </button>

      {open && (
        <div className="dropdown-menu animate-slide-in min-w-[230px]">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Saved Views
          </div>

          {!editingId ? (
            <div className="mb-3">
              <div className="mb-1 text-xs text-gray-500">
                    Save current table state as new view
                </div>
              <div className="flex flex-col sm:flex-row gap-2 mb-3">
                <input
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  placeholder="View name"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveNew(); }}
                />
                <div className="flex gap-2">
                  <select
                    value={saveVisibility}
                    onChange={e => setSaveVisibility(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    title="Visibility"
                  >
                    <option value="private">Private</option>
                    <option value="team">Team</option>
                    <option value="org">Org</option>
                  </select>
                 <button
                    onClick={handleSaveNew}
                    className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                    title="Save view"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" 
                        className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
              <div className="text-xs font-semibold text-gray-600 mb-2">Edit view</div>
              <div className="flex flex-col gap-2">
                <input
                  className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="View name"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleEditMeta(); if (e.key === 'Escape') cancelEdit(); }}
                />
                <div className="flex gap-2">
                  <select
                    className="flex-1 border border-gray-300 rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={editVisibility}
                    onChange={e => setEditVisibility(e.target.value)}
                  >
                    <option value="private">Private</option>
                    <option value="team">Team</option>
                    <option value="org">Org</option>
                  </select>
                  <button
                    className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                    onClick={handleEditMeta}
                    title="Save details"
                  >
                    Save
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    className="toolbar-button px-2 py-1 text-xs"
                    onClick={async () => { await onSaveState?.(editingId); cancelEdit(); }}
                    title="Overwrite this view with the current table state"
                  >
                    Save current state
                  </button>
                  <button
                    className="toolbar-button text-gray-600 px-2 py-1 text-xs"
                    onClick={cancelEdit}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="h-px bg-gray-200 mb-3" />

          <div className="text-xs font-semibold text-gray-500 tracking-wide mb-2">
            Views List
          </div>

          <div className="max-h-64 overflow-auto">
            {loading ? (
              <div className="p-3 text-sm text-gray-500">Loading…</div>
            ) : count === 0 ? (
              <div className="text-sm text-gray-500 p-3 text-center bg-gray-50 rounded-lg">
                No saved views yet
                <div className="text-xs mt-1">Create filters and save them for quick access</div>
              </div>
            ) : (
              <ul className="space-y-1">
                {views.map(v => (
                  <li key={v.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50">
                    <button
                      className="flex-1 text-left text-gray-700 hover:text-blue-600 truncate"
                      onClick={() => { onLoad?.(v.id); }}
                      title={`Load "${v.name}"`}
                    >
                      <span className="font-medium">{v.name}</span>
                      <span className="ml-2 text-xs text-gray-500">• {v.visibility || 'private'}</span>
                    </button>

                    <button
                      className="p-1 text-gray-500 hover:text-gray-700"
                      onClick={() => beginEdit(v)}
                      title="Edit view"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036l-4 1 1-4L16.732 3.732z"
                        />
                      </svg>

                    </button>

                    <button
                      className="p-1 text-red-500 hover:text-red-600"
                      onClick={() => onDelete?.(v.id)}
                      title="Delete view"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );

}