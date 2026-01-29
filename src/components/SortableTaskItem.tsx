import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import type { ReactNode } from "react";
import type { DraggableSyntheticListeners } from "@dnd-kit/core";
import type { UniqueIdentifier } from "@dnd-kit/core";

interface SortableTaskItemProps {
  id: UniqueIdentifier;
  children: (props: {
    listeners: DraggableSyntheticListeners | undefined;
    attributes: Record<string, string>;
    setActivatorNodeRef: (node: HTMLElement | null) => void;
  }) => ReactNode;
}

const SortableTaskItem = ({ id, children }: SortableTaskItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? "opacity-70" : ""}>
      {children({
        listeners,
        attributes: attributes as unknown as Record<string, string>,
        setActivatorNodeRef
      })}
    </div>
  );
};

export default SortableTaskItem;
