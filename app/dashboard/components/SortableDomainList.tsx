'use client'

import { useState, useEffect } from 'react'
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

type Domain = { id: string; name: string; weight: number; color: string }

const STORAGE_KEY = 'onduler-domain-order'

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

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return
    try {
      const ids: string[] = JSON.parse(saved)
      const map = new Map(domains.map(d => [d.id, d]))
      const reordered = ids.flatMap(id => (map.has(id) ? [map.get(id)!] : []))
      const seen = new Set(ids)
      domains.forEach(d => { if (!seen.has(d.id)) reordered.push(d) })
      setOrdered(reordered)
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setOrdered(prev => {
      const next = arrayMove(prev, prev.findIndex(d => d.id === active.id), prev.findIndex(d => d.id === over.id))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next.map(d => d.id)))
      return next
    })
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
