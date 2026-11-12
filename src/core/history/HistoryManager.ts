import { Annotation } from '../../types/annotation';

/**
 * Undo/Redo manager stored OUTSIDE of Zustand to avoid polluting reactive state
 * with large snapshot arrays.
 */
export class HistoryManager {
  private undoStack: Annotation[][] = [];
  private redoStack: Annotation[][] = [];
  private maxSize: number;

  constructor(maxSize = 50) {
    this.maxSize = maxSize;
  }

  /** Call BEFORE making a mutation. Pushes the current state for undo. Clears redo. */
  push(currentAnnotations: Annotation[]): void {
    this.undoStack.push(structuredClone(currentAnnotations));
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }
    this.redoStack = []; // New action invalidates redo history
  }

  undo(currentAnnotations: Annotation[]): Annotation[] | null {
    if (this.undoStack.length === 0) return null;
    this.redoStack.push(structuredClone(currentAnnotations));
    return this.undoStack.pop() ?? null;
  }

  redo(currentAnnotations: Annotation[]): Annotation[] | null {
    if (this.redoStack.length === 0) return null;
    this.undoStack.push(structuredClone(currentAnnotations));
    return this.redoStack.pop() ?? null;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}
