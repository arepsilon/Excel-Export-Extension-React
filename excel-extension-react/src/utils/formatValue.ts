import { format } from 'date-fns';
import type { NumberFormat, DateFormat } from '../types';

export const formatNumberValue = (value: number, options?: NumberFormat): string => {
    if (value === null || value === undefined || isNaN(value)) return '';
    if (!options) return value.toString();

    const {
        decimalPlaces = 2,
        thousandSeparator = true,
        displayType = 'number',
        currencySymbol = '$',
        negativeFormat = '-1234'
    } = options;

    let formattedValue = '';

    // Handle Percentage
    if (displayType === 'percentage') {
        const percentValue = value * 100;
        formattedValue = percentValue.toFixed(decimalPlaces);
    }
    // Handle Scientific
    else if (displayType === 'scientific') {
        formattedValue = value.toExponential(decimalPlaces);
        return formattedValue; // Scientific notation usually doesn't use thousand separators or currency
    }
    // Handle Number and Currency
    else {
        formattedValue = value.toFixed(decimalPlaces);
    }

    // Add Thousand Separator
    if (thousandSeparator && (displayType as string) !== 'scientific') {
        const parts = formattedValue.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        formattedValue = parts.join('.');
    }

    // Add Currency Symbol
    if (displayType === 'currency') {
        formattedValue = `${currencySymbol}${formattedValue}`;
    }

    // Add Percentage Symbol
    if (displayType === 'percentage') {
        formattedValue = `${formattedValue}%`;
    }

    // Handle Negative Format
    if (value < 0) {
        // Remove the negative sign added by toFixed/toString if present, as we handle it manually
        const cleanValue = formattedValue.replace('-', '');

        switch (negativeFormat) {
            case '(1234)':
                return `(${cleanValue})`;
            case '1234-':
                return `${cleanValue}-`;
            case '-1234':
            default:
                return `-${cleanValue}`;
        }
    }

    return formattedValue;
};

export const formatDateValue = (value: string | Date, options?: DateFormat): string => {
    if (!value) return '';
    if (!options) return new Date(value).toLocaleDateString();

    const date = new Date(value);
    if (isNaN(date.getTime())) return String(value);

    const { pattern, customPattern } = options;

    try {
        if (pattern === 'custom' && customPattern) {
            return format(date, customPattern);
        }

        switch (pattern) {
            case 'short':
                return format(date, 'P'); // 04/29/1453
            case 'medium':
                return format(date, 'PP'); // Apr 29, 1453
            case 'long':
                return format(date, 'PPP'); // April 29th, 1453
            case 'full':
                return format(date, 'PPPP'); // Friday, April 29th, 1453
            case 'ISO':
                return date.toISOString().split('T')[0];
            default:
                return format(date, 'P');
        }
    } catch (error) {
        console.warn('Error formatting date:', error);
        return date.toLocaleDateString();
    }
};
