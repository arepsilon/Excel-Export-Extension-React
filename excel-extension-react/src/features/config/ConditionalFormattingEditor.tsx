import React, { useState, useEffect } from 'react';
import {
    CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter,
    CButton, CFormSelect, CFormInput, CFormLabel, CFormCheck,
    CDropdown, CDropdownToggle, CDropdownMenu, CDropdownItem
} from '@coreui/react';
import { Trash2, Plus } from 'lucide-react';
import type { ConditionalFormatRule, Column, CellValueRule, TopBottomRule } from '../../types';

interface ConditionalFormattingEditorProps {
    visible: boolean;
    onClose: () => void;
    onSave: (rules: ConditionalFormatRule[]) => void;
    column: Column | null;
    section: 'group' | 'pivot' | 'value' | null;
}

export const ConditionalFormattingEditor: React.FC<ConditionalFormattingEditorProps> = ({
    visible, onClose, onSave, column, section
}) => {
    const [rules, setRules] = useState<ConditionalFormatRule[]>([]);
    const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

    useEffect(() => {
        if (visible && column) {
            setRules(column.conditionalFormats || []);
            setEditingRuleId(null);
        }
    }, [visible, column]);

    const handleAddRule = (type: ConditionalFormatRule['type']) => {
        const newRule: ConditionalFormatRule = createDefaultRule(type);
        setRules([...rules, newRule]);
        setEditingRuleId(newRule.id);
    };

    const handleUpdateRule = (updatedRule: ConditionalFormatRule) => {
        setRules(rules.map(r => r.id === updatedRule.id ? updatedRule : r));
    };

    const handleDeleteRule = (id: string) => {
        setRules(rules.filter(r => r.id !== id));
        if (editingRuleId === id) setEditingRuleId(null);
    };

    const handleSave = () => {
        onSave(rules);
        onClose();
    };

    const createDefaultRule = (type: ConditionalFormatRule['type']): ConditionalFormatRule => {
        const id = `rule_${Date.now()}`;
        const baseStyle = { fontColor: '#000000', bgColor: '#ffffff' };

        switch (type) {
            case 'cellValue':
                return {
                    id, type: 'cellValue',
                    operator: 'gt', value1: 0, style: { ...baseStyle, bgColor: '#ffcccc', fontColor: '#9c0006' }
                };
            case 'topBottom':
                return {
                    id, type: 'topBottom',
                    mode: 'top', count: 10, percent: false, style: { ...baseStyle, bgColor: '#c6efce', fontColor: '#006100' }
                };
            case 'colorScale':
                return {
                    id, type: 'colorScale',
                    scaleType: '3-color', minColor: '#f8696b', midColor: '#ffeb84', maxColor: '#63be7b'
                };
            case 'iconSet':
                return {
                    id, type: 'iconSet',
                    iconSet: 'trafficLights', reverse: false
                };
        }
    };

    const renderRuleEditor = (rule: ConditionalFormatRule) => {
        switch (rule.type) {
            case 'cellValue':
                return (
                    <div className="p-3 border rounded bg-gray-50">
                        <div className="mb-3">
                            <CFormLabel>Format cells where value is:</CFormLabel>
                            <div className="flex gap-2">
                                <CFormSelect
                                    value={rule.operator}
                                    onChange={(e: any) => handleUpdateRule({ ...rule, operator: e.target.value })}
                                    className="w-1/3"
                                >
                                    <option value="gt">Greater than</option>
                                    <option value="lt">Less than</option>
                                    <option value="gte">Greater than or equal to</option>
                                    <option value="lte">Less than or equal to</option>
                                    <option value="eq">Equal to</option>
                                    <option value="neq">Not equal to</option>
                                    <option value="between">Between</option>
                                    <option value="contains">Text contains</option>
                                </CFormSelect>
                                <CFormInput
                                    value={rule.value1}
                                    onChange={(e) => handleUpdateRule({ ...rule, value1: e.target.value })}
                                    className="w-1/3"
                                    placeholder="Value"
                                />
                                {rule.operator === 'between' && (
                                    <CFormInput
                                        value={rule.value2 || ''}
                                        onChange={(e) => handleUpdateRule({ ...rule, value2: e.target.value })}
                                        className="w-1/3"
                                        placeholder="Value 2"
                                    />
                                )}
                            </div>
                        </div>
                        <StyleEditor rule={rule} onUpdate={(style) => handleUpdateRule({ ...rule, style })} />
                    </div>
                );
            case 'topBottom':
                return (
                    <div className="p-3 border rounded bg-gray-50">
                        <div className="mb-3">
                            <CFormLabel>Format cells that rank in the:</CFormLabel>
                            <div className="flex gap-2 items-center">
                                <CFormSelect
                                    value={rule.mode}
                                    onChange={(e: any) => handleUpdateRule({ ...rule, mode: e.target.value })}
                                    className="w-1/4"
                                >
                                    <option value="top">Top</option>
                                    <option value="bottom">Bottom</option>
                                </CFormSelect>
                                <CFormInput
                                    type="number"
                                    value={rule.count}
                                    onChange={(e) => handleUpdateRule({ ...rule, count: parseInt(e.target.value) || 10 })}
                                    className="w-1/4"
                                />
                                <div className="flex items-center">
                                    <CFormCheck
                                        id="percentCheck"
                                        checked={rule.percent}
                                        onChange={(e) => handleUpdateRule({ ...rule, percent: e.target.checked })}
                                        label="% of selected range"
                                    />
                                </div>
                            </div>
                        </div>
                        <StyleEditor rule={rule} onUpdate={(style) => handleUpdateRule({ ...rule, style })} />
                    </div>
                );
            case 'colorScale':
                return (
                    <div className="p-3 border rounded bg-gray-50">
                        <div className="mb-3">
                            <CFormLabel>Format Style</CFormLabel>
                            <CFormSelect
                                value={rule.scaleType}
                                onChange={(e: any) => handleUpdateRule({ ...rule, scaleType: e.target.value })}
                            >
                                <option value="2-color">2-Color Scale</option>
                                <option value="3-color">3-Color Scale</option>
                            </CFormSelect>
                        </div>
                        <div className="flex gap-4 justify-between">
                            <div>
                                <CFormLabel>Minimum</CFormLabel>
                                <input
                                    type="color"
                                    value={rule.minColor}
                                    onChange={(e) => handleUpdateRule({ ...rule, minColor: e.target.value })}
                                    className="form-control form-control-color w-full"
                                />
                            </div>
                            {rule.scaleType === '3-color' && (
                                <div>
                                    <CFormLabel>Midpoint</CFormLabel>
                                    <input
                                        type="color"
                                        value={rule.midColor}
                                        onChange={(e) => handleUpdateRule({ ...rule, midColor: e.target.value })}
                                        className="form-control form-control-color w-full"
                                    />
                                </div>
                            )}
                            <div>
                                <CFormLabel>Maximum</CFormLabel>
                                <input
                                    type="color"
                                    value={rule.maxColor}
                                    onChange={(e) => handleUpdateRule({ ...rule, maxColor: e.target.value })}
                                    className="form-control form-control-color w-full"
                                />
                            </div>
                        </div>
                    </div>
                );
            case 'iconSet':
                return (
                    <div className="p-3 border rounded bg-gray-50">
                        <div className="mb-3">
                            <CFormLabel>Icon Style</CFormLabel>
                            <CFormSelect
                                value={rule.iconSet}
                                onChange={(e: any) => handleUpdateRule({ ...rule, iconSet: e.target.value })}
                            >
                                <option value="trafficLights">Traffic Lights (Green, Yellow, Red)</option>
                                <option value="arrows">Arrows (Up, Side, Down)</option>
                                <option value="flags">Flags (Green, Yellow, Red)</option>
                                <option value="shapes">Shapes (Circle, Triangle, Diamond)</option>
                            </CFormSelect>
                        </div>
                        <div className="mb-3">
                            <CFormCheck
                                checked={rule.reverse}
                                onChange={(e) => handleUpdateRule({ ...rule, reverse: e.target.checked })}
                                label="Reverse Icon Order"
                            />
                        </div>
                    </div>
                );
        }
    };

    return (
        <CModal visible={visible} onClose={onClose} size="lg">
            <CModalHeader>
                <CModalTitle>Conditional Formatting: {column?.name}</CModalTitle>
            </CModalHeader>
            <CModalBody>
                <div className="flex gap-4 h-[500px]">
                    {/* Rules List */}
                    <div className="w-1/3 border-r pr-4 overflow-y-auto">
                        <div className="flex justify-between items-center mb-3">
                            <h5 className="mb-0">Rules</h5>
                            <CDropdown>
                                <CDropdownToggle color="primary" size="sm">
                                    <Plus size={14} /> Add
                                </CDropdownToggle>
                                <CDropdownMenu>
                                    <CDropdownItem onClick={() => handleAddRule('cellValue')}>Cell Value</CDropdownItem>
                                    {section === 'value' && (
                                        <>
                                            <CDropdownItem onClick={() => handleAddRule('topBottom')}>Top/Bottom</CDropdownItem>
                                            <CDropdownItem onClick={() => handleAddRule('colorScale')}>Color Scale</CDropdownItem>
                                            <CDropdownItem onClick={() => handleAddRule('iconSet')}>Icon Set</CDropdownItem>
                                        </>
                                    )}
                                </CDropdownMenu>
                            </CDropdown>
                        </div>

                        {rules.length === 0 && (
                            <div className="text-gray-400 text-center mt-10 text-sm">
                                No rules defined.
                            </div>
                        )}

                        <div className="space-y-2">
                            {rules.map((rule) => (
                                <div
                                    key={rule.id}
                                    className={`p-2 border rounded cursor-pointer flex justify-between items-center ${editingRuleId === rule.id ? 'border-primary bg-blue-50' : 'hover:bg-gray-50'}`}
                                    onClick={() => setEditingRuleId(rule.id)}
                                >
                                    <div>
                                        <div className="font-medium text-sm">
                                            {rule.type === 'cellValue' && 'Cell Value'}
                                            {rule.type === 'topBottom' && 'Top/Bottom'}
                                            {rule.type === 'colorScale' && 'Color Scale'}
                                            {rule.type === 'iconSet' && 'Icon Set'}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {getRuleDescription(rule)}
                                        </div>
                                    </div>
                                    <button
                                        className="text-gray-400 hover:text-red-500 p-1"
                                        onClick={(e) => { e.stopPropagation(); handleDeleteRule(rule.id); }}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Rule Editor */}
                    <div className="w-2/3 pl-4 overflow-y-auto">
                        {editingRuleId ? (
                            <div>
                                <h5 className="mb-3">Edit Rule</h5>
                                {renderRuleEditor(rules.find(r => r.id === editingRuleId)!)}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400">
                                Select a rule to edit or create a new one.
                            </div>
                        )}
                    </div>
                </div>
            </CModalBody>
            <CModalFooter>
                <CButton color="secondary" onClick={onClose}>Cancel</CButton>
                <CButton color="primary" onClick={handleSave}>Apply Rules</CButton>
            </CModalFooter>
        </CModal>
    );
};

const StyleEditor = ({ rule, onUpdate }: { rule: CellValueRule | TopBottomRule, onUpdate: (style: any) => void }) => {
    return (
        <div className="mt-3 border-t pt-3">
            <CFormLabel>Preview Style</CFormLabel>
            <div className="flex gap-4 mb-3">
                <div
                    className="border rounded px-4 py-2 text-center w-full"
                    style={{
                        color: rule.style.fontColor,
                        backgroundColor: rule.style.bgColor,
                        fontWeight: rule.style.bold ? 'bold' : 'normal',
                        fontStyle: rule.style.italic ? 'italic' : 'normal'
                    }}
                >
                    AaBbCcYyZz
                </div>
            </div>

            <div className="row">
                <div className="col-md-6 mb-2">
                    <CFormLabel className="text-xs">Font Color</CFormLabel>
                    <input
                        type="color"
                        value={rule.style.fontColor || '#000000'}
                        onChange={(e) => onUpdate({ ...rule.style, fontColor: e.target.value })}
                        className="form-control form-control-color w-full"
                    />
                </div>
                <div className="col-md-6 mb-2">
                    <CFormLabel className="text-xs">Background Color</CFormLabel>
                    <input
                        type="color"
                        value={rule.style.bgColor || '#ffffff'}
                        onChange={(e) => onUpdate({ ...rule.style, bgColor: e.target.value })}
                        className="form-control form-control-color w-full"
                    />
                </div>
            </div>

            <div className="flex gap-4 mt-2">
                <CFormCheck
                    id={`bold-${rule.id}`}
                    checked={rule.style.bold || false}
                    onChange={(e) => onUpdate({ ...rule.style, bold: e.target.checked })}
                    label="Bold"
                />
                <CFormCheck
                    id={`italic-${rule.id}`}
                    checked={rule.style.italic || false}
                    onChange={(e) => onUpdate({ ...rule.style, italic: e.target.checked })}
                    label="Italic"
                />
            </div>
        </div>
    );
};

const getRuleDescription = (rule: ConditionalFormatRule): string => {
    switch (rule.type) {
        case 'cellValue':
            return `${rule.operator} ${rule.value1}`;
        case 'topBottom':
            return `${rule.mode} ${rule.count} ${rule.percent ? '%' : 'items'}`;
        case 'colorScale':
            return `${rule.scaleType}`;
        case 'iconSet':
            return `${rule.iconSet}`;
        default:
            return '';
    }
};
