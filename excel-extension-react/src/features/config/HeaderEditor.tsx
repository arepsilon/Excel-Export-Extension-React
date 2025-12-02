import React from 'react';
import {
    CButton,
    CFormSelect,
    CFormInput,
    CFormLabel,
    CCard,
    CCardBody
} from '@coreui/react';
import { Trash2, Plus, ArrowUp, ArrowDown } from 'lucide-react';
import type { HeaderSettings, Column } from '../../types';

interface HeaderEditorProps {
    headerSettings: HeaderSettings[];
    onUpdate: (settings: HeaderSettings[]) => void;
    allFields: Column[];
    filters: any[];
}

export const HeaderEditor: React.FC<HeaderEditorProps> = ({
    headerSettings,
    onUpdate,
    allFields,
    filters
}) => {
    const addHeaderRow = () => {
        const newRow: HeaderSettings = {
            type: 'text',
            text: '',
            textAlign: 'left'
        };
        onUpdate([...headerSettings, newRow]);
    };

    const removeHeaderRow = (index: number) => {
        const newSettings = [...headerSettings];
        newSettings.splice(index, 1);
        onUpdate(newSettings);
    };

    const updateHeaderRow = (index: number, updates: Partial<HeaderSettings>) => {
        const newSettings = [...headerSettings];
        newSettings[index] = { ...newSettings[index], ...updates };
        onUpdate(newSettings);
    };

    const moveRow = (index: number, direction: 'up' | 'down') => {
        if (
            (direction === 'up' && index === 0) ||
            (direction === 'down' && index === headerSettings.length - 1)
        ) {
            return;
        }

        const newSettings = [...headerSettings];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [newSettings[index], newSettings[targetIndex]] = [newSettings[targetIndex], newSettings[index]];
        onUpdate(newSettings);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h5 className="font-semibold text-gray-700 m-0">Header Configuration</h5>
                <CButton color="primary" size="sm" onClick={addHeaderRow}>
                    <Plus size={16} className="mr-1" /> Add Header Row
                </CButton>
            </div>

            {headerSettings.length === 0 ? (
                <div className="text-center p-4 bg-gray-50 rounded border border-dashed border-gray-300 text-gray-500">
                    No header rows configured. Click "Add Header Row" to start.
                </div>
            ) : (
                <div className="space-y-3">
                    {headerSettings.map((row, index) => (
                        <CCard key={index} className="border border-gray-200 shadow-sm">
                            <CCardBody className="p-3">
                                <div className="flex gap-3 items-start">
                                    <div className="flex flex-col gap-1 mt-1">
                                        <CButton
                                            color="light"
                                            size="sm"
                                            className="p-1"
                                            onClick={() => moveRow(index, 'up')}
                                            disabled={index === 0}
                                        >
                                            <ArrowUp size={14} />
                                        </CButton>
                                        <CButton
                                            color="light"
                                            size="sm"
                                            className="p-1"
                                            onClick={() => moveRow(index, 'down')}
                                            disabled={index === headerSettings.length - 1}
                                        >
                                            <ArrowDown size={14} />
                                        </CButton>
                                    </div>

                                    <div className="flex-1 space-y-3">
                                        <div className="grid grid-cols-12 gap-3">
                                            <div className="col-span-4">
                                                <CFormLabel className="text-xs text-gray-500 mb-1">Type</CFormLabel>
                                                <CFormSelect
                                                    size="sm"
                                                    value={row.type}
                                                    onChange={(e) => updateHeaderRow(index, { type: e.target.value as any })}
                                                >
                                                    <option value="text">Custom Text</option>
                                                    <option value="column">Field Value</option>
                                                    <option value="filters">Filter List</option>
                                                    <option value="refreshDate">Refresh Date</option>
                                                </CFormSelect>
                                            </div>

                                            <div className="col-span-8">
                                                {row.type === 'text' && (
                                                    <div>
                                                        <CFormLabel className="text-xs text-gray-500 mb-1">Text Content</CFormLabel>
                                                        <CFormInput
                                                            size="sm"
                                                            type="text"
                                                            value={row.text || ''}
                                                            onChange={(e) => updateHeaderRow(index, { text: e.target.value })}
                                                            placeholder="Enter header text"
                                                        />
                                                    </div>
                                                )}

                                                {row.type === 'column' && (
                                                    <div>
                                                        <CFormLabel className="text-xs text-gray-500 mb-1">Select Field</CFormLabel>
                                                        <CFormSelect
                                                            size="sm"
                                                            value={row.column || ''}
                                                            onChange={(e) => updateHeaderRow(index, { column: e.target.value })}
                                                        >
                                                            <option value="">Select a field...</option>
                                                            {allFields.map(f => (
                                                                <option key={f.id} value={f.id}>{f.name}</option>
                                                            ))}
                                                        </CFormSelect>
                                                    </div>
                                                )}

                                                {row.type === 'filters' && (
                                                    <div>
                                                        <CFormLabel className="text-xs text-gray-500 mb-1">Select Filters to Show</CFormLabel>
                                                        <CFormSelect
                                                            size="sm"
                                                            multiple
                                                            value={row.selectedFilters || []}
                                                            onChange={(e) => {
                                                                const options = Array.from(e.target.selectedOptions, option => option.value);
                                                                updateHeaderRow(index, { selectedFilters: options });
                                                            }}
                                                            className="h-20"
                                                        >
                                                            {filters.map(f => (
                                                                <option key={f.id} value={f.id}>{f.name}</option>
                                                            ))}
                                                        </CFormSelect>
                                                        <small className="text-xs text-gray-400">Hold Ctrl/Cmd to select multiple</small>
                                                    </div>
                                                )}

                                                {row.type === 'refreshDate' && (
                                                    <div>
                                                        <CFormLabel className="text-xs text-gray-500 mb-1">Date Format</CFormLabel>
                                                        <CFormSelect
                                                            size="sm"
                                                            value={row.dateFormat || 'MM/DD/YYYY HH:mm'}
                                                            onChange={(e) => updateHeaderRow(index, { dateFormat: e.target.value })}
                                                        >
                                                            <option value="MM/DD/YYYY HH:mm">MM/DD/YYYY HH:mm</option>
                                                            <option value="YYYY-MM-DD HH:mm">YYYY-MM-DD HH:mm</option>
                                                            <option value="DD MMM YYYY HH:mm">DD MMM YYYY HH:mm</option>
                                                        </CFormSelect>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex gap-4">
                                            <div className="w-1/3">
                                                <CFormLabel className="text-xs text-gray-500 mb-1">Alignment</CFormLabel>
                                                <CFormSelect
                                                    size="sm"
                                                    value={row.textAlign || 'left'}
                                                    onChange={(e) => updateHeaderRow(index, { textAlign: e.target.value as any })}
                                                >
                                                    <option value="left">Left</option>
                                                    <option value="center">Center</option>
                                                    <option value="right">Right</option>
                                                </CFormSelect>
                                            </div>
                                            <div className="w-1/3">
                                                <CFormLabel className="text-xs text-gray-500 mb-1">Text Color</CFormLabel>
                                                <CFormInput
                                                    size="sm"
                                                    type="color"
                                                    value={row.fontColor || '#000000'}
                                                    onChange={(e) => updateHeaderRow(index, { fontColor: e.target.value })}
                                                    className="h-8 p-1"
                                                />
                                            </div>
                                            <div className="w-1/3">
                                                <CFormLabel className="text-xs text-gray-500 mb-1">Background</CFormLabel>
                                                <CFormInput
                                                    size="sm"
                                                    type="color"
                                                    value={row.bgColor || '#ffffff'}
                                                    onChange={(e) => updateHeaderRow(index, { bgColor: e.target.value })}
                                                    className="h-8 p-1"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <CButton
                                        color="danger"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeHeaderRow(index)}
                                        title="Remove Row"
                                    >
                                        <Trash2 size={16} />
                                    </CButton>
                                </div>
                            </CCardBody>
                        </CCard>
                    ))}
                </div>
            )}
        </div>
    );
};
