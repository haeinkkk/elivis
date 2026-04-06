"use client";

import { useTranslations } from "next-intl";
import {
    DndContext,
    type DragEndEvent,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    SortableContext,
    arrayMove,
    rectSortingStrategy,
    sortableKeyboardCoordinates,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { TeamDetail } from "../types/team-detail";
import { INTRO_BLOCK_LABEL, colSpanClassFixed, type IntroLayoutConfig } from "../utils/team-intro-layout";

import { IntroBlockContent } from "./TeamIntroBlockContent";

export function SortablePreviewBlock({
    id,
    colSpan,
    label,
    children,
}: {
    id: string;
    colSpan: number;
    label: string;
    children: React.ReactNode;
}) {
    const tDrag = useTranslations("teams.detail.intro");
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id,
    });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.88 : 1,
        zIndex: isDragging ? 10 : undefined,
    };
    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`min-w-0 ${colSpanClassFixed(colSpan as 4 | 6 | 8 | 12)}`}
        >
            <div className="overflow-hidden rounded-2xl border border-amber-200/80 bg-white shadow-sm ring-1 ring-amber-100/80">
                <div className="flex flex-wrap items-center gap-2 border-b border-amber-100/90 bg-amber-50/90 px-2 py-2 sm:px-3">
                    <button
                        type="button"
                        className="flex h-9 w-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg border border-dashed border-amber-300/80 bg-white text-amber-600/80 active:cursor-grabbing"
                        aria-label={tDrag("sortableDragAria")}
                        {...attributes}
                        {...listeners}
                    >
                        <svg
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M8.25 15.75h7.5M8.25 12h7.5m-7.5-3.75h7.5"
                            />
                        </svg>
                    </button>
                    <span className="min-w-0 flex-1 text-xs font-semibold text-stone-700">{label}</span>
                </div>
                <div className="relative">{children}</div>
            </div>
        </div>
    );
}

export function TeamIntroSortableEditGrid({
    team,
    layout,
    onLayoutChange,
}: {
    team: TeamDetail;
    layout: IntroLayoutConfig;
    onLayoutChange: (next: IntroLayoutConfig) => void;
}) {
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    function onDragEnd(e: DragEndEvent) {
        const { active, over } = e;
        if (!over || active.id === over.id) return;
        const oldIndex = layout.blocks.findIndex((b) => b.id === active.id);
        const newIndex = layout.blocks.findIndex((b) => b.id === over.id);
        if (oldIndex < 0 || newIndex < 0) return;
        onLayoutChange({
            ...layout,
            blocks: arrayMove(layout.blocks, oldIndex, newIndex),
        });
    }

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext
                items={layout.blocks.map((b) => b.id)}
                strategy={rectSortingStrategy}
            >
                <div className="grid grid-cols-12 gap-4">
                    {layout.blocks.map((b) => (
                        <SortablePreviewBlock
                            key={b.id}
                            id={b.id}
                            colSpan={b.colSpan}
                            label={INTRO_BLOCK_LABEL[b.type]}
                        >
                            <IntroBlockContent
                                team={team}
                                blockType={b.type}
                            />
                        </SortablePreviewBlock>
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
}
