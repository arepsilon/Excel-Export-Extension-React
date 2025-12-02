import React from 'react';
import { CTable, CTableHead, CTableBody, CTableRow, CTableHeaderCell, CTableDataCell, CCard, CCardHeader, CCardBody } from '@coreui/react';
import type { Config } from '../../types';

interface PreviewTableProps {
    config: Config;
}

export const PreviewTable: React.FC<PreviewTableProps> = ({ config }) => {
    return (
        <CCard className="mt-4 shadow-sm">
            <CCardHeader className="bg-white font-semibold text-epsilon-blue">
                Preview
            </CCardHeader>
            <CCardBody className="overflow-auto max-h-[400px]">
                <CTable bordered hover responsive>
                    <CTableHead>
                        <CTableRow>
                            <CTableHeaderCell>Row Labels ({config.groupColumns.length})</CTableHeaderCell>
                            <CTableHeaderCell>Values ({config.valueColumns.length})</CTableHeaderCell>
                        </CTableRow>
                    </CTableHead>
                    <CTableBody>
                        <CTableRow>
                            <CTableDataCell colSpan={2} className="text-center text-gray-500">
                                Preview data will appear here...
                            </CTableDataCell>
                        </CTableRow>
                    </CTableBody>
                </CTable>
            </CCardBody>
        </CCard>
    );
};
