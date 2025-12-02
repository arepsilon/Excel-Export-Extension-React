import React, { useState } from 'react';
import {
    CButton,
    CFormInput,
    CBadge,
    CDropdown,
    CDropdownToggle,
    CDropdownMenu,
    CDropdownItem
} from '@coreui/react';
import type { MetricGroup, Column } from '../../types';
import { Plus, Trash2, Edit2, Check, X, ChevronDown, ChevronUp, Layers } from 'lucide-react';

interface MetricGroupsProps {
    groups: MetricGroup[];
    valueColumns: Column[];
    onAddGroup: () => void;
    onRemoveGroup: (id: number) => void;
    onUpdateGroup: (id: number, updates: Partial<MetricGroup>) => void;
}

export const MetricGroups: React.FC<MetricGroupsProps> = ({
    groups,
    valueColumns,
    onAddGroup,
    onRemoveGroup,
    onUpdateGroup
}) => {
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [expandedGroups, setExpandedGroups] = useState<number[]>([]);

    const toggleExpand = (id: number) => {
        setExpandedGroups(prev =>
            prev.includes(id) ? prev.filter(gId => gId !== id) : [...prev, id]
        );
    };

    const startEditing = (group: MetricGroup) => {
        setEditingId(group.id);
        setEditName(group.name);
    };

    const saveEditing = (id: number) => {
        if (editName.trim()) {
            onUpdateGroup(id, { name: editName.trim() });
        }
        setEditingId(null);
    };

    const addFieldToGroup = (groupId: number, fieldId: string) => {
        const group = groups.find(g => g.id === groupId);
        if (group && !group.fields.includes(fieldId)) {
            onUpdateGroup(groupId, { fields: [...group.fields, fieldId] });
        }
    };

    const removeFieldFromGroup = (groupId: number, fieldId: string) => {
        const group = groups.find(g => g.id === groupId);
        if (group) {
            onUpdateGroup(groupId, { fields: group.fields.filter(f => f !== fieldId) });
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-end mb-4">
                <CButton
                    color="primary"
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1 hover:bg-primary hover:text-white transition-colors"
                    onClick={() => {
                        onAddGroup();
                    }}
                >
                    <Plus size={16} /> New Group
                </CButton>
            </div>

            <div className={groups.length === 0 ? 'p-0' : 'bg-gray-50/30 rounded-lg'}>
                {groups.length === 0 ? (
                    <div className="text-center py-10 px-4 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                        <div className="bg-blue-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Layers className="text-epsilon-blue" size={24} />
                        </div>
                        <h6 className="text-gray-600 font-medium mb-1">No Groups Created</h6>
                        <p className="text-gray-400 text-sm max-w-xs mx-auto mb-4">
                            Create groups to organize your value columns hierarchically.
                        </p>
                        <CButton color="primary" size="sm" onClick={onAddGroup}>
                            Create First Group
                        </CButton>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {groups.map((group) => {
                            const isExpanded = expandedGroups.includes(group.id);
                            const availableFields = valueColumns.filter(col => !group.fields.includes(col.id));

                            return (
                                <div
                                    key={group.id}
                                    className={`bg-white rounded-lg border transition-all duration-200 ${isExpanded ? 'border-blue-200 shadow-md ring-1 ring-blue-50' : 'border-gray-200 hover:border-blue-200'}`}
                                >
                                    {/* Group Header */}
                                    <div
                                        className="p-3 flex items-center justify-between cursor-pointer select-none"
                                        onClick={() => toggleExpand(group.id)}
                                    >
                                        <div className="flex items-center gap-3 flex-1">
                                            <div className={`p-1.5 rounded-md transition-colors ${isExpanded ? 'bg-blue-50 text-epsilon-blue' : 'bg-gray-100 text-gray-500'}`}>
                                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </div>

                                            {editingId === group.id ? (
                                                <div className="flex items-center gap-2 flex-1 max-w-md" onClick={e => e.stopPropagation()}>
                                                    <CFormInput
                                                        autoFocus
                                                        size="sm"
                                                        value={editName}
                                                        onChange={e => setEditName(e.target.value)}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') saveEditing(group.id);
                                                            if (e.key === 'Escape') setEditingId(null);
                                                        }}
                                                        className="font-medium"
                                                    />
                                                    <CButton color="success" size="sm" variant="ghost" onClick={() => saveEditing(group.id)}>
                                                        <Check size={16} />
                                                    </CButton>
                                                    <CButton color="secondary" size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                                                        <X size={16} />
                                                    </CButton>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 group">
                                                    <span className="font-semibold text-gray-700">{group.name}</span>
                                                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                                        {group.fields.length} fields
                                                    </span>
                                                    <CButton
                                                        color="secondary"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-gray-400 hover:text-epsilon-blue p-1"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            startEditing(group);
                                                        }}
                                                    >
                                                        <Edit2 size={14} />
                                                    </CButton>
                                                </div>
                                            )}
                                        </div>

                                        <CButton
                                            color="danger"
                                            variant="ghost"
                                            size="sm"
                                            className="text-gray-400 hover:text-red-500 hover:bg-red-50"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRemoveGroup(group.id);
                                            }}
                                        >
                                            <Trash2 size={16} />
                                        </CButton>
                                    </div>

                                    {/* Group Body (Expanded) */}
                                    {isExpanded && (
                                        <div className="px-4 pb-4 pt-1 border-t border-gray-50">
                                            <div className="mt-3 flex flex-wrap gap-2 min-h-[40px] items-center">
                                                {group.fields.map(fieldId => {
                                                    const col = valueColumns.find(c => c.id === fieldId);
                                                    return (
                                                        <CBadge
                                                            key={fieldId}
                                                            color="info"
                                                            shape="rounded-pill"
                                                            className="flex items-center gap-2 pl-3 pr-2 py-1.5 bg-blue-50 text-blue-700 border border-blue-100 font-medium"
                                                        >
                                                            {col ? col.name : fieldId}
                                                            <div
                                                                className="hover:bg-blue-200 rounded-full p-0.5 cursor-pointer transition-colors"
                                                                onClick={() => removeFieldFromGroup(group.id, fieldId)}
                                                            >
                                                                <X size={12} />
                                                            </div>
                                                        </CBadge>
                                                    );
                                                })}

                                                <CDropdown className="inline-block">
                                                    <CDropdownToggle
                                                        color="secondary"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-xs font-medium text-gray-500 hover:text-epsilon-blue border border-dashed border-gray-300 hover:border-epsilon-blue rounded-full px-3"
                                                    >
                                                        <Plus size={12} className="inline mr-1" /> Add Field
                                                    </CDropdownToggle>
                                                    <CDropdownMenu className="max-h-60 overflow-y-auto shadow-lg border-gray-100">
                                                        {availableFields.length === 0 ? (
                                                            <CDropdownItem disabled className="text-xs text-gray-400">
                                                                No more value fields available
                                                            </CDropdownItem>
                                                        ) : (
                                                            availableFields.map(col => (
                                                                <CDropdownItem
                                                                    key={col.id}
                                                                    onClick={() => addFieldToGroup(group.id, col.id)}
                                                                    className="text-sm cursor-pointer hover:bg-blue-50"
                                                                >
                                                                    {col.name}
                                                                </CDropdownItem>
                                                            ))
                                                        )}
                                                    </CDropdownMenu>
                                                </CDropdown>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
