import React, { useState, useEffect } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    type DragStartEvent,
    type DragEndEvent
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    arrayMove
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import {
    CCard,
    CCardBody,
    CCardHeader,
    CRow,
    CCol,
    CModal,
    CModalHeader,
    CModalTitle,
    CModalBody,
    CButton
} from '@coreui/react';
import type { Column, MetricGroup, ConditionalFormatRule } from '../../types';
import { SortableItem } from '../../components/ui/SortableItem';
import { MetricGroups } from './MetricGroups';
import { Layers, Settings } from 'lucide-react';
import { ConditionalFormattingEditor } from './ConditionalFormattingEditor';
import { NumberFormatEditor } from './NumberFormatEditor';


interface PivotConfigProps {
    availableColumns: Column[];
    allFields: Column[];
    groupColumns: Column[];
    pivotColumns: Column[];
    valueColumns: Column[];
    onUpdate: (section: 'group' | 'pivot' | 'value', columns: Column[]) => void;
    onMetricGroupsUpdate?: (groups: MetricGroup[]) => void; // Optional if not used directly
    metricGroups: MetricGroup[];
    onAddGroup: () => void;
    onRemoveGroup: (id: number) => void;
    onUpdateGroup: (id: number, updates: Partial<MetricGroup>) => void;
    onAddCustomField: (name: string, def: any) => void;
    onDeleteCustomField: (fieldId: string) => void;
    onUpdateCustomField: (fieldId: string, name: string, def: any) => void;
    onConfigureTotals: () => void;
}

type ContainerId = 'available' | 'group' | 'pivot' | 'value';

// Droppable container wrapper
const DroppableContainer: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => {
    const { setNodeRef } = useDroppable({ id });
    return <div ref={setNodeRef} className="h-full">{children}</div>;
};

export const PivotConfig: React.FC<PivotConfigProps> = ({
    availableColumns,
    groupColumns,
    pivotColumns,
    valueColumns,
    onUpdate,
    metricGroups,
    onAddGroup,
    onRemoveGroup,
    onUpdateGroup,
    onConfigureTotals
}) => {
    const [activeId, setActiveId] = useState<string | null>(null);
    const [showMetricModal, setShowMetricModal] = useState(false);

    // Conditional Formatting State
    const [showFormatModal, setShowFormatModal] = useState(false);
    const [formattingField, setFormattingField] = useState<Column | null>(null);
    const [formattingSection, setFormattingSection] = useState<'group' | 'pivot' | 'value' | null>(null);

    // Number/Date Formatting State
    const [showNumberFormatModal, setShowNumberFormatModal] = useState(false);
    const [numberFormattingField, setNumberFormattingField] = useState<Column | null>(null);

    const [containers, setContainers] = useState<{ [key in ContainerId]: Column[] }>({
        available: availableColumns,
        group: groupColumns,
        pivot: pivotColumns,
        value: valueColumns
    });

    useEffect(() => {
        setContainers({
            available: availableColumns,
            group: groupColumns,
            pivot: pivotColumns,
            value: valueColumns
        });
    }, [availableColumns, groupColumns, pivotColumns, valueColumns]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const findContainer = (id: string): ContainerId | undefined => {
        if (id in containers) return id as ContainerId;
        return Object.keys(containers).find((key) =>
            containers[key as ContainerId].find((c) => c.id === id)
        ) as ContainerId;
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        const activeContainer = findContainer(active.id as string);

        if (!activeContainer || !over) {
            setActiveId(null);
            return;
        }

        // Determine the target container
        let overContainer: ContainerId | undefined;

        // Check if dropped on a container div
        if (['available', 'group', 'pivot', 'value'].includes(over.id as string)) {
            overContainer = over.id as ContainerId;
        } else {
            // Dropped on an item, find which container it belongs to
            overContainer = findContainer(over.id as string);
        }

        if (!overContainer) {
            setActiveId(null);
            return;
        }

        if (activeContainer === overContainer) {
            // Reordering within same list
            const oldIndex = containers[activeContainer].findIndex(c => c.id === active.id);
            const newIndex = containers[activeContainer].findIndex(c => c.id === over.id);

            if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
                const newItems = arrayMove(containers[activeContainer], oldIndex, newIndex);
                const newContainers = { ...containers, [activeContainer]: newItems };
                setContainers(newContainers);

                // Notify parent if not available column
                if (activeContainer !== 'available') {
                    onUpdate(activeContainer, newItems);
                }
            }
        } else {
            // Moving between lists
            const activeItem = containers[activeContainer].find(c => c.id === active.id);
            if (!activeItem) {
                setActiveId(null);
                return;
            }

            const newSource = containers[activeContainer].filter(c => c.id !== active.id);
            const newDest = [...containers[overContainer], activeItem];

            const newContainers = {
                ...containers,
                [activeContainer]: newSource,
                [overContainer]: newDest
            };
            setContainers(newContainers);

            // Notify parent for both containers if not available
            if (activeContainer !== 'available') {
                onUpdate(activeContainer, newSource);
            }
            if (overContainer !== 'available') {
                onUpdate(overContainer, newDest);
            }
        }
        setActiveId(null);
    };



    const handleFormat = (col: Column, section: 'group' | 'pivot' | 'value') => {
        setFormattingField(col);
        setFormattingSection(section);
        setShowFormatModal(true);
    };

    const handleSaveFormat = (rule: ConditionalFormatRule[]) => {
        if (!formattingField || !formattingSection) return;

        const updatedCols = containers[formattingSection].map(c =>
            c.id === formattingField.id ? { ...c, conditionalFormats: rule } : c
        );

        onUpdate(formattingSection, updatedCols);
        setShowFormatModal(false);
        setFormattingField(null);
    };

    const handleNumberFormat = (col: Column) => {
        setNumberFormattingField(col);
        setShowNumberFormatModal(true);
    };

    const handleSaveNumberFormat = (format: any) => {
        if (!numberFormattingField) return;

        let section: ContainerId | undefined;
        if (containers.value.find(c => c.id === numberFormattingField.id)) section = 'value';
        else if (containers.group.find(c => c.id === numberFormattingField.id)) section = 'group';
        else if (containers.pivot.find(c => c.id === numberFormattingField.id)) section = 'pivot';

        if (!section) return;

        const updatedCols = containers[section].map(c => {
            if (c.id === numberFormattingField.id) {
                if (c.dataType === 'date' || c.dataType === 'datetime') {
                    return { ...c, dateFormat: format };
                } else {
                    return { ...c, numberFormat: format };
                }
            }
            return c;
        });

        onUpdate(section as 'group' | 'pivot' | 'value', updatedCols);
        setShowNumberFormatModal(false);
        setNumberFormattingField(null);
    };

    const renderList = (title: string, containerId: ContainerId, items: Column[], headerAction?: React.ReactNode) => (
        <DroppableContainer id={containerId}>
            <CCard className="h-full shadow-sm flex flex-col">
                <CCardHeader className="bg-gray-50 font-semibold text-sm text-gray-700 flex-none flex justify-between items-center">
                    <span>{title} ({items.length}) </span>
                    {headerAction}
                </CCardHeader>
                <CCardBody className="flex-1 bg-gray-50/50 p-2 overflow-y-auto min-h-[200px]">
                    <SortableContext
                        id={containerId}
                        items={items.map(c => c.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {items.length === 0 ? (
                            <div className="text-center text-gray-400 text-sm py-8">
                                Drop columns here
                            </div>
                        ) : (
                            items.map((col) => (
                                <SortableItem
                                    key={col.id}
                                    id={col.id}
                                    name={col.name}
                                    showEdit={false}
                                    onEdit={() => { }}
                                    showDelete={false}
                                    onDelete={() => { }}
                                    showFormat={containerId !== 'available'}
                                    onFormat={() => handleFormat(col, containerId as 'group' | 'pivot' | 'value')}
                                    showNumberFormat={containerId !== 'available'}
                                    onNumberFormat={() => handleNumberFormat(col)}
                                />
                            ))
                        )}
                    </SortableContext>
                </CCardBody>
            </CCard>
        </DroppableContainer>
    );

    return (
        <>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <CRow className="g-4 h-full">
                    <CCol md={3} className="h-full">
                        {renderList('Available Columns', 'available', containers.available)}
                    </CCol>
                    <CCol md={3} className="h-full">
                        {renderList('Rows (Group By)', 'group', containers.group)}
                    </CCol>
                    <CCol md={3} className="h-full">
                        {renderList('Columns (Pivot)', 'pivot', containers.pivot)}
                    </CCol>
                    <CCol md={3} className="h-full">
                        {renderList('Values', 'value', containers.value, (
                            <div className="flex gap-1">
                                <CButton
                                    color="light"
                                    size="sm"
                                    className="p-1 text-gray-500 hover:text-epsilon-blue hover:bg-blue-50"
                                    onClick={onConfigureTotals}
                                    title="Configure Totals & Subtotals"
                                >
                                    <Settings size={16} />
                                </CButton>
                                <CButton
                                    color="light"
                                    size="sm"
                                    className="p-1 text-gray-500 hover:text-epsilon-blue hover:bg-blue-50"
                                    onClick={() => setShowMetricModal(true)}
                                    title="Configure Metric Groups"
                                >
                                    <Layers size={16} />
                                </CButton>
                            </div>
                        ))}
                    </CCol>
                </CRow>
                <DragOverlay>
                    {activeId ? (
                        <div className="p-2 bg-white border border-epsilon-blue rounded shadow-lg">
                            <span className="text-sm font-medium">{activeId}</span>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            <CModal
                visible={showMetricModal}
                onClose={() => setShowMetricModal(false)}
                size="lg"
            >
                <CModalHeader closeButton>
                    <CModalTitle>Metric Grouping</CModalTitle>
                </CModalHeader>
                <CModalBody>
                    <MetricGroups
                        groups={metricGroups}
                        valueColumns={valueColumns}
                        onAddGroup={onAddGroup}
                        onRemoveGroup={onRemoveGroup}
                        onUpdateGroup={onUpdateGroup}
                    />
                </CModalBody>
            </CModal>



            <ConditionalFormattingEditor
                visible={showFormatModal}
                onClose={() => {
                    setShowFormatModal(false);
                    setFormattingField(null);
                }}
                onSave={handleSaveFormat}
                column={formattingField}
                section={formattingSection}
            />

            <NumberFormatEditor
                visible={showNumberFormatModal}
                onClose={() => {
                    setShowNumberFormatModal(false);
                    setNumberFormattingField(null);
                }}
                onSave={handleSaveNumberFormat}
                column={numberFormattingField}
            />
        </>
    );
};
