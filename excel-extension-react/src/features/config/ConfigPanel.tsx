import React, { useState } from 'react';
import type { Column, MetricGroup, Config } from '../../types';
import { WorksheetSelector } from './WorksheetSelector';
import { PivotConfig } from './PivotConfig';
import { SettingsModal } from './SettingsModal';
import { TotalsConfig } from './TotalsConfig';
import { CContainer, CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter, CButton } from '@coreui/react';

interface ConfigPanelProps {
    config: Config;
    onUpdateConfig: (updates: Partial<Config>) => void;
    worksheets: any[];
    onWorksheetChange: (name: string) => void;
    availableColumns: Column[];
    allFields: Column[];
    groupColumns: Column[];
    pivotColumns: Column[];
    valueColumns: Column[];
    onColumnsUpdate: (section: 'group' | 'pivot' | 'value', columns: Column[]) => void;
    // Metric Group Props
    metricGroups: MetricGroup[];
    onAddGroup: () => void;
    onRemoveGroup: (id: number) => void;
    onUpdateGroup: (id: number, updates: Partial<MetricGroup>) => void;
    onAddCustomField: (name: string, def: any) => void;
    onDeleteCustomField: (fieldId: string) => void;
    onUpdateCustomField: (fieldId: string, name: string, def: any) => void;
    filters: any[];
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
    config,
    onUpdateConfig,
    worksheets,
    onWorksheetChange,
    availableColumns,
    allFields,
    groupColumns,
    pivotColumns,
    valueColumns,
    onColumnsUpdate,
    metricGroups,
    onAddGroup,
    onRemoveGroup,
    onUpdateGroup,
    onAddCustomField,
    onDeleteCustomField,
    onUpdateCustomField,
    filters
}) => {
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showTotalsModal, setShowTotalsModal] = useState(false);

    return (
        <CContainer fluid className="p-4">
            <WorksheetSelector
                worksheets={worksheets}
                selectedWorksheet={config.selectedWorksheet}
                onSelect={onWorksheetChange}
                onOpenSettings={() => setShowSettingsModal(true)}
            />

            <SettingsModal
                visible={showSettingsModal}
                onClose={() => setShowSettingsModal(false)}
                config={config}
                onUpdateConfig={onUpdateConfig}
                allFields={allFields}
                filters={filters}
            />

            {config.selectedWorksheet && (
                <div className="mt-4">
                    <PivotConfig
                        availableColumns={availableColumns}
                        allFields={allFields}
                        groupColumns={groupColumns}
                        pivotColumns={pivotColumns}
                        valueColumns={valueColumns}
                        onUpdate={onColumnsUpdate}
                        metricGroups={metricGroups}
                        onAddGroup={onAddGroup}
                        onRemoveGroup={onRemoveGroup}
                        onUpdateGroup={onUpdateGroup}

                        onAddCustomField={onAddCustomField}
                        onDeleteCustomField={onDeleteCustomField}
                        onUpdateCustomField={onUpdateCustomField}
                        onConfigureTotals={() => setShowTotalsModal(true)}
                    />
                </div>
            )}

            <CModal visible={showTotalsModal} onClose={() => setShowTotalsModal(false)} size="lg">
                <CModalHeader>
                    <CModalTitle>Table Settings</CModalTitle>
                </CModalHeader>
                <CModalBody>
                    <TotalsConfig
                        showRowTotals={config.showRowTotals}
                        rowTotalsPosition={config.rowTotalsPosition}
                        showColumnTotals={config.showColumnTotals}
                        columnTotalsPosition={config.columnTotalsPosition}
                        showSubtotals={config.showSubtotals}
                        onUpdate={onUpdateConfig}
                    />
                </CModalBody>
                <CModalFooter>
                    <CButton color="secondary" onClick={() => setShowTotalsModal(false)}>
                        Close
                    </CButton>
                </CModalFooter>
            </CModal>
        </CContainer>
    );
};
