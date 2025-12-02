import React from 'react';
import { CButton } from '@coreui/react';
import { Download } from 'lucide-react';

interface ExportButtonProps {
    onExport: () => void;
    disabled?: boolean;
}

export const ExportButton: React.FC<ExportButtonProps> = ({ onExport, disabled }) => {
    return (
        <div className="fixed bottom-6 right-6 z-50">
            <CButton
                color="primary"
                size="lg"
                className="shadow-lg flex items-center gap-2 px-6 py-3 rounded-full font-bold text-white bg-epsilon-blue hover:bg-epsilon-blue-dark"
                onClick={onExport}
                disabled={disabled}
            >
                <Download size={20} />
                Export to Excel
            </CButton>
        </div>
    );
};
