import { useState, useEffect } from 'react';

// Declare global tableau variable
declare global {
    interface Window {
        tableau: any;
    }
}

export const useTableau = () => {
    const [isInitialized, setIsInitialized] = useState(false);
    const [dashboard, setDashboard] = useState<any>(null);
    const [worksheets, setWorksheets] = useState<any[]>([]);
    const [workbook, setWorkbook] = useState<any>(null);

    useEffect(() => {
        const initTableau = async () => {
            try {
                // Check if tableau library is loaded
                if (!window.tableau) {
                    console.warn('Tableau library not found. Retrying in 500ms...');
                    setTimeout(initTableau, 500);
                    return;
                }


                await window.tableau.extensions.initializeAsync({
                    configure: () => {
                        // Open configuration dialog
                        const configUrl = new URL('config.html', window.location.href).href;
                        window.tableau.extensions.ui.displayDialogAsync(
                            configUrl,
                            '',
                            { height: 800, width: 1200 }
                        ).then((closePayload: string) => {
                            console.log('Configuration dialog closed:', closePayload);
                            // No need to reload, App.tsx listens for SettingsChanged event
                        }).catch((error: any) => {
                            console.error('Error displaying dialog:', error);
                        });
                    }
                });
                const dashboard = window.tableau.extensions.dashboardContent.dashboard;
                const workbook = window.tableau.extensions.workbook;
                setDashboard(dashboard);
                setWorkbook(workbook);
                setWorksheets(dashboard.worksheets);
                setIsInitialized(true);
            } catch (error) {
                console.error('Error initializing Tableau extension:', error);
            }
        };

        initTableau();
    }, []);

    return { isInitialized, dashboard, worksheets, workbook };
};
