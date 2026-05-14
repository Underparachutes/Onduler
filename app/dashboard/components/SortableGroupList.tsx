'use client'

import { useState, useTransition } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GroupCard } from './GroupCard'
import { reorderGroups } from '@/app/actions/groups'

type Group = { id: string; name: string; color: string }

function SortableItem({ group }: { group: Group }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: group.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="flex items-center gap-2"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none select-none text-th-faint hover:text-th-muted active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        ⠿
      </button>
      <div className="flex-1">
        <GroupCard group={group} />
      </div>
    </div>
  )
}

export function SortableGroupList({ groups }: { groups: Group[] }) {
  const [ordered, setOrdered] = useState(groups)
  const [, startTransition] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const next = arrayMove(ordered, ordered.findIndex(g => g.id === active.id), ordered.findIndex(g => g.id === over.id))
    setOrdered(next)
    startTransition(async () => { await reorderGroups(next.map(g => g.id)) })
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ordered.map(g => g.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {ordered.map(group => (
            <SortableItem key={group.id} group={group} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
