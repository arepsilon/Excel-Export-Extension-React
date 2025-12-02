import React, { useState, useEffect } from 'react';
import {
    CModal,
    CModalHeader,
    CModalTitle,
    CModalBody,
    CModalFooter,
    CButton,
    CFormLabel,
    CFormInput,
    CFormSelect,
    CFormCheck,
} from '@coreui/react';
import type { Column, NumberFormat, DateFormat } from '../../types';

interface NumberFormatEditorProps {
    visible: boolean;
    onClose: () => void;
    onSave: (numberFormat?: NumberFormat, dateFormat?: DateFormat) => void;
    column: Column | null;
}

export const NumberFormatEditor: React.FC<NumberFormatEditorProps> = ({
    visible, onClose, onSave, column
}) => {
    const [numberFormat, setNumberFormat] = useState<NumberFormat>({
        decimalPlaces: 2,
        thousandSeparator: true,
        displayType: 'number',
        currencySymbol: '$',
        negativeFormat: 'minus'
    });

    const [dateFormat, setDateFormat] = useState<DateFormat>({
        pattern: 'MM/DD/YYYY',
        customPattern: ''
    });

    useEffect(() => {
        if (column) {
            if (column.numberFormat) {
                setNumberFormat(column.numberFormat);
            }
            if (column.dateFormat) {
                setDateFormat(column.dateFormat);
            }
        }
    }, [column]);

    const isNumberField = () => {
        return column?.dataType === 'real' || column?.dataType === 'float' || column?.dataType === 'integer' || column?.dataType === 'int';
    };

    const isDateField = () => {
        return column?.dataType === 'date' || column?.dataType === 'datetime';
    };

    const handleSave = () => {
        if (isNumberField()) {
            onSave(numberFormat, undefined);
        } else if (isDateField()) {
            onSave(undefined, dateFormat);
        }
        onClose();
    };

    return (
        <CModal visible={visible} onClose={onClose} size="lg">
            <CModalHeader>
                <CModalTitle>Number/Date Format - {column?.name}</CModalTitle>
            </CModalHeader>
            <CModalBody>
                {isNumberField() && (
                    <div className="space-y-3">
                        <div>
                            <CFormLabel>Display Type</CFormLabel>
                            <CFormSelect
                                value={numberFormat.displayType}
                                onChange={(e) => setNumberFormat({
                                    ...numberFormat,
                                    displayType: e.target.value as 'number' | 'currency' | 'percentage' | 'scientific'
                                })}
                            >
                                <option value="number">Number</option>
                                <option value="currency">Currency</option>
                                <option value="percentage">Percentage</option>
                                <option value="scientific">Scientific</option>
                            </CFormSelect>
                        </div>

                        {numberFormat.displayType === 'currency' && (
                            <div>
                                <CFormLabel>Currency Symbol</CFormLabel>
                                <CFormSelect
                                    value={numberFormat.currencySymbol}
                                    onChange={(e) => setNumberFormat({ ...numberFormat, currencySymbol: e.target.value })}
                                >
                                    <option value="$">$ (Dollar)</option>
                                    <option value="€">€ (Euro)</option>
                                    <option value="£">£ (Pound)</option>
                                    <option value="¥">¥ (Yen/Yuan)</option>
                                    <option value="₹">₹ (Rupee)</option>
                                </CFormSelect>
                            </div>
                        )}

                        <div>
                            <CFormLabel>Decimal Places</CFormLabel>
                            <CFormSelect
                                value={numberFormat.decimalPlaces}
                                onChange={(e) => setNumberFormat({ ...numberFormat, decimalPlaces: Number(e.target.value) })}
                            >
                                <option value="0">0</option>
                                <option value="1">1</option>
                                <option value="2">2</option>
                                <option value="3">3</option>
                                <option value="4">4</option>
                            </CFormSelect>
                        </div>

                        <div>
                            <CFormCheck
                                label="Use Thousand Separator"
                                checked={numberFormat.thousandSeparator}
                                onChange={(e) => setNumberFormat({ ...numberFormat, thousandSeparator: e.target.checked })}
                            />
                        </div>

                        <div>
                            <CFormLabel>Negative Number Format</CFormLabel>
                            <CFormSelect
                                value={numberFormat.negativeFormat}
                                onChange={(e) => setNumberFormat({ ...numberFormat, negativeFormat: e.target.value as 'minus' | 'parentheses' | 'red' })}
                            >
                                <option value="minus">-123 (Minus sign)</option>
                                <option value="parentheses">(123) (Parentheses)</option>
                                <option value="red">-123 (Red color)</option>
                            </CFormSelect>
                        </div>
                    </div>
                )}

                {isDateField() && (
                    <div className="space-y-3">
                        <div>
                            <CFormLabel>Date Format</CFormLabel>
                            <CFormSelect
                                value={dateFormat.pattern}
                                onChange={(e) => setDateFormat({ ...dateFormat, pattern: e.target.value })}
                            >
                                <option value="MM/DD/YYYY">MM/DD/YYYY (01/15/2024)</option>
                                <option value="DD/MM/YYYY">DD/MM/YYYY (15/01/2024)</option>
                                <option value="YYYY-MM-DD">YYYY-MM-DD (2024-01-15)</option>
                                <option value="MMM DD, YYYY">MMM DD, YYYY (Jan 15, 2024)</option>
                                <option value="DD MMM YYYY">DD MMM YYYY (15 Jan 2024)</option>
                                <option value="MMMM DD, YYYY">MMMM DD, YYYY (January 15, 2024)</option>
                                <option value="custom">Custom</option>
                            </CFormSelect>
                        </div>

                        {dateFormat.pattern === 'custom' && (
                            <div>
                                <CFormLabel>Custom Pattern</CFormLabel>
                                <CFormInput
                                    type="text"
                                    value={dateFormat.customPattern || ''}
                                    onChange={(e) => setDateFormat({ ...dateFormat, customPattern: e.target.value })}
                                    placeholder="e.g., YYYY/MM/DD HH:mm:ss"
                                />
                                <small className="text-muted">
                                    Tokens: YYYY (year), MM (month), DD (day), HH (24hr), hh (12hr), mm (min), ss (sec), A (AM/PM)
                                </small>
                            </div>
                        )}
                    </div>
                )}

                {!isNumberField() && !isDateField() && (
                    <div className="alert alert-info">
                        This field type ({column?.dataType}) does not support number or date formatting.
                    </div>
                )}
            </CModalBody>
            <CModalFooter>
                <CButton color="secondary" onClick={onClose}>Close</CButton>
                <CButton color="primary" onClick={handleSave} disabled={!isNumberField() && !isDateField()}>
                    Save
                </CButton>
            </CModalFooter>
        </CModal>
    );
};
