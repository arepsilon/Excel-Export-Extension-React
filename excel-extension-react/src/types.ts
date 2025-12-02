

export type ConditionalFormatType = 'cellValue' | 'topBottom' | 'colorScale' | 'iconSet';

export interface CellValueRule {
    id: string;
    type: 'cellValue';
    operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'neq' | 'between' | 'contains';
    value1: number | string;
    value2?: number | string;
    style: {
        fontColor?: string;
        bgColor?: string;
        bold?: boolean;
        italic?: boolean;
    };
}

export interface TopBottomRule {
    id: string;
    type: 'topBottom';
    mode: 'top' | 'bottom';
    count: number;
    percent: boolean;
    style: {
        fontColor?: string;
        bgColor?: string;
        bold?: boolean;
        italic?: boolean;
    };
}

export interface ColorScaleRule {
    id: string;
    type: 'colorScale';
    scaleType: '2-color' | '3-color';
    minColor: string;
    midColor?: string;
    maxColor: string;
}

export interface IconSetRule {
    id: string;
    type: 'iconSet';
    iconSet: 'arrows' | 'trafficLights' | 'flags' | 'shapes';
    reverse: boolean;
}

export type ConditionalFormatRule = CellValueRule | TopBottomRule | ColorScaleRule | IconSetRule;

export interface NumberFormat {
    decimalPlaces?: number;
    thousandSeparator?: boolean;
    displayType?: 'number' | 'currency' | 'percentage' | 'scientific';
    currencySymbol?: string;
    negativeFormat?: 'minus' | 'parentheses' | 'red' | '-1234' | '(1234)' | '1234-';
}

export interface DateFormat {
    pattern: string; // e.g., "MM/DD/YYYY" or "custom"
    customPattern?: string; // used when pattern === 'custom'
}


export interface Column {
    id: string;
    name: string;
    dataType?: string;
    role?: string;
    isCalculatedField?: boolean;
    isCustom?: boolean;
    conditionalFormats?: ConditionalFormatRule[];
    numberFormat?: NumberFormat;
    dateFormat?: DateFormat;
}

export interface MetricGroup {
    id: number;
    name: string;
    fields: string[]; // Column IDs
    collapsed: boolean;
}

export interface FormatSettings {
    decimals?: number;
    formatType?: 'number' | 'currency' | 'percentage' | 'text';
    currencySymbol?: string;
    fontColor?: string;
    bgColor?: string;
    conditions?: Condition[];
}

export interface Condition {
    operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
    value: string | number;
    compareType: 'value' | 'field';
    fontColor?: string;
    bgColor?: string;
    shape?: string;
}

export interface HeaderSettings {
    type: 'text' | 'column' | 'filters' | 'refreshDate';
    text?: string;
    column?: string;
    selectedFilters?: string[];
    dateFormat?: string;
    timeZone?: string;
    prefixText?: string;
    fontColor?: string;
    bgColor?: string;
    textAlign?: 'left' | 'center' | 'right';
}

export interface PivotHeaderFormat {
    fontColor: string;
    bgColor: string;
    textAlign: 'left' | 'center' | 'right';
}

export interface Config {
    selectedWorksheet: string;
    worksheet: string;
    exportMode: 'formatted' | 'datadump';
    workbookName?: string;
    worksheetName?: string;
    fileName: string;
    sheetName: string;
    headerRowsCount: number;
    headerRowSettings: HeaderSettings[];
    tableTitle: string;
    titleColumn?: string;
    titleAlignment: 'left' | 'center' | 'right';
    titleFontColor: string;
    titleBgColor: string;

    groupColumns: Column[];
    pivotColumns: Column[];
    valueColumns: Column[];
    customFields: Column[];

    metricGroups: MetricGroup[];

    showSubtotals: boolean;
    subtotalLevels: number[];
    subtotalLabels: Record<number, string>;
    useCustomSubtotalLabels: boolean;

    showRowTotals: boolean;
    rowTotalsPosition: 'left' | 'right';
    rowTotalsLabel: string;
    showColumnTotals: boolean;
    columnTotalsPosition: 'top' | 'bottom';
    columnTotalsLabel: string;

    rowFormatField?: string;
    rowFormatRules: Record<string, string>; // value -> color

    fieldRenames: Record<string, string>;
    formatSettings: Record<string, FormatSettings>;
    pivotHeaderFormat: PivotHeaderFormat;
}
