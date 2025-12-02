import React from 'react';
import { CFormSelect, CCard, CCardBody, CCardHeader, CButton } from '@coreui/react';
import { Settings } from 'lucide-react';

interface WorksheetSelectorProps {
    worksheets: any[];
    selectedWorksheet: string;
    onSelect: (worksheetName: string) => void;
    onOpenSettings: () => void;
}

export const WorksheetSelector: React.FC<WorksheetSelectorProps> = ({
    worksheets,
    selectedWorksheet,
    onSelect,
    onOpenSettings
}) => {
    return (
        <CCard className="mb-4 shadow-sm">
            <CCardHeader className="bg-white font-semibold text-epsilon-blue flex justify-between items-center">
                <span>Select Worksheet</span>
                <CButton
                    color="secondary"
                    variant="outline"
                    size="sm"
                    onClick={onOpenSettings}
                    title="Export Settings"
                >
                    <Settings size={16} />
                </CButton>
            </CCardHeader>
            <CCardBody>
                <CFormSelect
                    value={selectedWorksheet}
                    onChange={(e) => onSelect(e.target.value)}
                    aria-label="Select Worksheet"
                >
                    <option value="">Select a worksheet</option>
                    {worksheets.map((ws) => (
                        <option key={ws.name} value={ws.name}>
                            {ws.name}
                        </option>
                    ))}
                </CFormSelect>
            </CCardBody>
        </CCard>
    );
};
