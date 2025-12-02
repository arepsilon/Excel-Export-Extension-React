import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CButton } from '@coreui/react';
import { GripVertical, X, Settings, Pen, Palette, Hash } from 'lucide-react';

interface SortableItemProps {
    id: string;
    name: string;
    onRemove?: () => void;
    onSettings?: () => void;
    showSettings?: boolean;
    onEdit?: () => void;
    showEdit?: boolean;
    onDelete?: () => void;
    showDelete?: boolean;
    onFormat?: () => void;
    showFormat?: boolean;
    onNumberFormat?: () => void;
    showNumberFormat?: boolean;
}

export const SortableItem: React.FC<SortableItemProps> = ({
    id,
    name,
    onRemove,
    onSettings,
    showSettings = false,
    onEdit,
    showEdit = false,
    onDelete,
    showDelete = false,
    onFormat,
    showFormat = false,
    onNumberFormat,
    showNumberFormat = false
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex items-center justify-between p-2 mb-2 bg-white border rounded shadow-sm group"
        >
            <div className="flex items-center flex-1 min-w-0">
                <div {...attributes} {...listeners} className="cursor-grab mr-2 text-gray-400 hover:text-gray-600">
                    <GripVertical size={16} />
                </div>
                <span className="truncate text-sm font-medium text-gray-700" title={name}>
                    {name}
                </span>
            </div>

            <div className="flex items-center gap-1 transition-opacity">
                {showFormat && onFormat && (
                    <CButton
                        color="light"
                        size="sm"
                        className="p-1 text-gray-500 hover:text-purple-500"
                        onClick={onFormat}
                        title="Conditional Formatting"
                    >
                        <Palette size={14} />
                    </CButton>
                )}
                {showNumberFormat && onNumberFormat && (
                    <CButton
                        color="light"
                        size="sm"
                        className="p-1 text-gray-500 hover:text-epsilon-blue"
                        onClick={onNumberFormat}
                        title="Number/Date Format"
                    >
                        <Hash size={14} />
                    </CButton>
                )}
                {showEdit && onEdit && (
                    <CButton
                        color="light"
                        size="sm"
                        className="p-1 text-gray-500 hover:text-epsilon-blue"
                        onClick={onEdit}
                        title="Edit Formula"
                    >
                        <Pen size={14} />
                    </CButton>
                )}
                {showSettings && onSettings && (
                    <CButton
                        color="light"
                        size="sm"
                        className="p-1 text-gray-500 hover:text-epsilon-blue"
                        onClick={onSettings}
                    >
                        <Settings size={14} />
                    </CButton>
                )}
                {showDelete && onDelete && (
                    <CButton
                        color="light"
                        size="sm"
                        className="p-1 text-gray-500 hover:text-red-500"
                        onClick={onDelete}
                        title="Delete Field"
                    >
                        <X size={14} />
                    </CButton>
                )}
                {onRemove && (
                    <CButton
                        color="light"
                        size="sm"
                        className="p-1 text-gray-500 hover:text-red-500"
                        onClick={onRemove}
                    >
                        <X size={14} />
                    </CButton>
                )}
            </div>
        </div>
    );
};
