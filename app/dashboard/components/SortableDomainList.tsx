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
import { DomainCard } from './DomainCard'
import { reorderDomains } from '@/app/actions/domains'

type Domain = { id: string; name: string; weight: number; color: string }

function SortableItem({ domain }: { domain: Domain }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: domain.id })

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
        <DomainCard domain={domain} />
      </div>
    </div>
  )
}

export function SortableDomainList({ domains }: { domains: Domain[] }) {
  const [ordered, setOrdered] = useState(domains)
  const [, startTransition] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const next = arrayMove(ordered, ordered.findIndex(d => d.id === active.id), ordered.findIndex(d => d.id === over.id))
    setOrdered(next)
    startTransition(async () => { await reorderDomains(next.map(d => d.id)) })
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ordered.map(d => d.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {ordered.map(domain => (
            <SortableItem key={domain.id} domain={domain} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
