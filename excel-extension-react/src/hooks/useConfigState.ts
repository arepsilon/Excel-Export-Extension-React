import { useState } from 'react';
import type { Config, Column } from '../types';

export const defaultConfig: Config = {
    selectedWorksheet: '',
    worksheet: '',
    exportMode: 'formatted',
    workbookName: '',
    worksheetName: '',
    fileName: 'pivot_data',
    sheetName: 'Sheet1',
    headerRowsCount: 0,
    headerRowSettings: [],
    tableTitle: '',
    titleAlignment: 'center',
    titleFontColor: '#000000',
    titleBgColor: '#F8F9FA',
    groupColumns: [],
    pivotColumns: [],
    valueColumns: [],
    customFields: [],
    metricGroups: [],
    showSubtotals: false,
    subtotalLevels: [],
    subtotalLabels: {},
    useCustomSubtotalLabels: false,
    showRowTotals: false,
    rowTotalsPosition: 'right',
    rowTotalsLabel: 'Row Totals',
    showColumnTotals: false,
    columnTotalsPosition: 'bottom',
    columnTotalsLabel: 'Column Totals',
    rowFormatRules: {},
    fieldRenames: {},
    formatSettings: {},
    pivotHeaderFormat: {
        fontColor: '#000000',
        bgColor: '#F3F4F6', // gray-100
        textAlign: 'center'
    }
};

export const useConfigState = () => {
    const [config, setConfig] = useState<Config>(defaultConfig);

    const updateConfig = (updates: Partial<Config>) => {
        setConfig(prev => ({ ...prev, ...updates }));
    };

    const resetConfig = (worksheetName: string) => {
        setConfig({ ...defaultConfig, selectedWorksheet: worksheetName });
    };

    const addColumnToSection = (section: 'group' | 'pivot' | 'value', column: Column) => {
        setConfig(prev => {
            const key = `${section}Columns` as keyof Config;
            const currentList = prev[key] as Column[];
            // Avoid duplicates
            if (currentList.find(c => c.id === column.id)) return prev;
            return { ...prev, [key]: [...currentList, column] };
        });
    };

    const removeColumnFromSection = (section: 'group' | 'pivot' | 'value', columnId: string) => {
        setConfig(prev => {
            const key = `${section}Columns` as keyof Config;
            const currentList = prev[key] as Column[];
            return { ...prev, [key]: currentList.filter(c => c.id !== columnId) };
        });
    };

    const reorderColumns = (section: 'group' | 'pivot' | 'value', newOrder: Column[]) => {
        setConfig(prev => ({ ...prev, [`${section}Columns`]: newOrder }));
    };

    const addMetricGroup = () => {
        setConfig(prev => {
            const newId = prev.metricGroups.length > 0 ? Math.max(...prev.metricGroups.map(g => g.id)) + 1 : 1;
            const newGroup = {
                id: newId,
                name: `Group ${newId}`,
                fields: [],
                collapsed: false
            };
            return { ...prev, metricGroups: [...prev.metricGroups, newGroup] };
        });
    };

    const removeMetricGroup = (id: number) => {
        setConfig(prev => ({
            ...prev,
            metricGroups: prev.metricGroups.filter(g => g.id !== id)
        }));
    };

    const updateMetricGroup = (id: number, updates: Partial<Config['metricGroups'][0]>) => {
        setConfig(prev => ({
            ...prev,
            metricGroups: prev.metricGroups.map(g => g.id === id ? { ...g, ...updates } : g)
        }));
    };

    return {
        config,
        updateConfig,
        addColumnToSection,
        removeColumnFromSection,
        reorderColumns,
        addMetricGroup,
        removeMetricGroup,
        updateMetricGroup,
        resetConfig,
        setConfig // Export setConfig for direct loading
    };
};
