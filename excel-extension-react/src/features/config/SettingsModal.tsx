import React, { useState, useEffect } from 'react';
import {
    CModal,
    CModalHeader,
    CModalTitle,
    CModalBody,
    CModalFooter,
    CButton,
    CFormCheck,
    CFormInput,
    CFormLabel
} from '@coreui/react';
import type { Config, Column } from '../../types';
import { HeaderEditor } from './HeaderEditor';

interface SettingsModalProps {
    visible: boolean;
    onClose: () => void;
    config: Config;
    onUpdateConfig: (updates: Partial<Config>) => void;
    allFields: Column[];
    filters: any[];
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
    visible,
    onClose,
    config,
    onUpdateConfig,
    allFields,
    filters
}) => {
    const [localConfig, setLocalConfig] = useState<Config>(config);

    // Reset local config when modal opens or config changes externally
    useEffect(() => {
        if (visible) {
            setLocalConfig(config);
        }
    }, [visible, config]);

    const handleUpdateLocal = (updates: Partial<Config>) => {
        setLocalConfig(prev => ({ ...prev, ...updates }));
    };

    const handleSave = () => {
        onUpdateConfig(localConfig);
        onClose();
    };

    return (
        <CModal visible={visible} onClose={onClose} size="xl">
            <CModalHeader>
                <CModalTitle>Export Settings</CModalTitle>
            </CModalHeader>
            <CModalBody>
                <div className="grid grid-cols-12 gap-6">
                    {/* Left Column: General Settings */}
                    <div className="col-span-4 space-y-6">
                        {/* Export Mode Section */}
                        <div>
                            <h5 className="mb-3 font-semibold text-gray-700">Export Mode</h5>
                            <div className="flex flex-col gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <CFormCheck
                                    type="radio"
                                    name="exportMode"
                                    id="modeFormatted"
                                    label={
                                        <span>
                                            <span className="font-semibold">Formatted Excel</span>
                                            <span className="block text-xs text-gray-500 mt-1">Full pivot table with formatting, totals, and grouping</span>
                                        </span>
                                    }
                                    checked={localConfig.exportMode === 'formatted'}
                                    onChange={() => handleUpdateLocal({ exportMode: 'formatted' })}
                                />
                                <CFormCheck
                                    type="radio"
                                    name="exportMode"
                                    id="modeDataDump"
                                    label={
                                        <span>
                                            <span className="font-semibold">Data Dump</span>
                                            <span className="block text-xs text-gray-500 mt-1">Raw data export with custom headers only</span>
                                        </span>
                                    }
                                    checked={localConfig.exportMode === 'datadump'}
                                    onChange={() => handleUpdateLocal({ exportMode: 'datadump' })}
                                />
                            </div>
                        </div>

                        {/* File Names Section */}
                        <div>
                            <h5 className="mb-3 font-semibold text-gray-700">File Names</h5>
                            <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div>
                                    <CFormLabel className="text-xs text-gray-500 mb-1">Workbook Name (Optional)</CFormLabel>
                                    <CFormInput
                                        type="text"
                                        placeholder="e.g., Sales Report"
                                        value={localConfig.workbookName || ''}
                                        onChange={(e) => handleUpdateLocal({ workbookName: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <CFormLabel className="text-xs text-gray-500 mb-1">Worksheet Name (Optional)</CFormLabel>
                                    <CFormInput
                                        type="text"
                                        placeholder="e.g., Q1 Data"
                                        value={localConfig.worksheetName || ''}
                                        onChange={(e) => handleUpdateLocal({ worksheetName: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Pivot Header Styling */}
                        <div>
                            <h5 className="mb-3 font-semibold text-gray-700">Pivot Header Styling</h5>
                            <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div>
                                    <CFormLabel className="text-xs text-gray-500 mb-1">Text Color</CFormLabel>
                                    <CFormInput
                                        type="color"
                                        className="h-8 p-1 w-full"
                                        value={localConfig.pivotHeaderFormat?.fontColor || '#000000'}
                                        onChange={(e) => handleUpdateLocal({
                                            pivotHeaderFormat: {
                                                ...localConfig.pivotHeaderFormat!,
                                                fontColor: e.target.value
                                            }
                                        })}
                                    />
                                </div>
                                <div>
                                    <CFormLabel className="text-xs text-gray-500 mb-1">Background Color</CFormLabel>
                                    <CFormInput
                                        type="color"
                                        className="h-8 p-1 w-full"
                                        value={localConfig.pivotHeaderFormat?.bgColor || '#F3F4F6'}
                                        onChange={(e) => handleUpdateLocal({
                                            pivotHeaderFormat: {
                                                ...localConfig.pivotHeaderFormat!,
                                                bgColor: e.target.value
                                            }
                                        })}
                                    />
                                </div>
                                <div>
                                    <CFormLabel className="text-xs text-gray-500 mb-1">Alignment</CFormLabel>
                                    <div className="flex gap-2">
                                        {['left', 'center', 'right'].map((align) => (
                                            <CButton
                                                key={align}
                                                color={localConfig.pivotHeaderFormat?.textAlign === align ? 'primary' : 'light'}
                                                size="sm"
                                                className="flex-1 capitalize"
                                                onClick={() => handleUpdateLocal({
                                                    pivotHeaderFormat: {
                                                        ...localConfig.pivotHeaderFormat!,
                                                        textAlign: align as 'left' | 'center' | 'right'
                                                    }
                                                })}
                                            >
                                                {align}
                                            </CButton>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Header Configuration */}
                    <div className="col-span-8">
                        <HeaderEditor
                            headerSettings={localConfig.headerRowSettings || []}
                            onUpdate={(settings) => handleUpdateLocal({ headerRowSettings: settings })}
                            allFields={allFields}
                            filters={filters}
                        />
                    </div>
                </div>
            </CModalBody>
            <CModalFooter>
                <CButton color="secondary" variant="ghost" onClick={onClose}>
                    Cancel
                </CButton>
                <CButton color="primary" onClick={handleSave}>
                    Save Changes
                </CButton>
            </CModalFooter>
        </CModal>
    );
};
