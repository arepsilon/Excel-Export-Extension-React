import React from 'react';
import {
    CCard,
    CCardBody,
    CCardHeader,
    CRow,
    CCol,
    CFormSwitch,
    CFormSelect,
    CFormLabel
} from '@coreui/react';
import { Settings } from 'lucide-react';
import type { Config } from '../../types';

interface TotalsConfigProps {
    showRowTotals: boolean;
    rowTotalsPosition: 'left' | 'right';
    showColumnTotals: boolean;
    columnTotalsPosition: 'top' | 'bottom';
    showSubtotals: boolean;
    onUpdate: (updates: Partial<Config>) => void;
}

export const TotalsConfig: React.FC<TotalsConfigProps> = ({
    showRowTotals,
    rowTotalsPosition,
    showColumnTotals,
    columnTotalsPosition,
    showSubtotals,
    onUpdate
}) => {
    return (
        <CCard className="mt-4 shadow-sm">
            <CCardHeader className="bg-white font-semibold text-epsilon-blue flex items-center gap-2">
                <Settings size={18} />
                <span>Totals & Subtotals</span>
            </CCardHeader>
            <CCardBody>
                <CRow className="g-4">
                    {/* Row Totals */}
                    <CCol md={4}>
                        <div className="mb-3">
                            <CFormSwitch
                                label="Show Row Grand Totals"
                                id="showRowTotals"
                                checked={showRowTotals}
                                onChange={(e) => onUpdate({ showRowTotals: e.target.checked })}
                            />
                        </div>
                        {showRowTotals && (
                            <div className="ms-4">
                                <CFormLabel htmlFor="rowTotalsPosition" className="text-sm text-gray-600">Position</CFormLabel>
                                <CFormSelect
                                    id="rowTotalsPosition"
                                    size="sm"
                                    value={rowTotalsPosition}
                                    onChange={(e) => onUpdate({ rowTotalsPosition: e.target.value as 'left' | 'right' })}
                                >
                                    <option value="right">Right (End)</option>
                                    <option value="left">Left (Start)</option>
                                </CFormSelect>
                            </div>
                        )}
                    </CCol>

                    {/* Column Totals */}
                    <CCol md={4}>
                        <div className="mb-3">
                            <CFormSwitch
                                label="Show Column Grand Totals"
                                id="showColumnTotals"
                                checked={showColumnTotals}
                                onChange={(e) => onUpdate({ showColumnTotals: e.target.checked })}
                            />
                        </div>
                        {showColumnTotals && (
                            <div className="ms-4">
                                <CFormLabel htmlFor="columnTotalsPosition" className="text-sm text-gray-600">Position</CFormLabel>
                                <CFormSelect
                                    id="columnTotalsPosition"
                                    size="sm"
                                    value={columnTotalsPosition}
                                    onChange={(e) => onUpdate({ columnTotalsPosition: e.target.value as 'top' | 'bottom' })}
                                >
                                    <option value="bottom">Bottom (End)</option>
                                    <option value="top">Top (Start)</option>
                                </CFormSelect>
                            </div>
                        )}
                    </CCol>

                    {/* Subtotals */}
                    <CCol md={4}>
                        <div className="mb-3">
                            <CFormSwitch
                                label="Show Subtotals"
                                id="showSubtotals"
                                checked={showSubtotals}
                                onChange={(e) => onUpdate({ showSubtotals: e.target.checked })}
                            />
                        </div>
                        {showSubtotals && (
                            <div className="ms-4 text-xs text-gray-500">
                                Subtotals will be displayed for each group level.
                            </div>
                        )}
                    </CCol>
                </CRow>
            </CCardBody>
        </CCard>
    );
};
