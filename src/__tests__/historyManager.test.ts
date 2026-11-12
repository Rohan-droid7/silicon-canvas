import { describe, expect, it } from 'vitest';
import { HistoryManager } from '../core/history/HistoryManager';
import { Annotation } from '../types/annotation';

describe('HistoryManager', () => {
  it('undo restores previous state without reference sharing', () => {
    const history = new HistoryManager(10);

    const state0: Annotation[] = [];
    const state1: Annotation[] = [
      {
        id: 'box1',
        type: 'BBOX',
        classType: 'PARTICLE',
        confidence: 0.9,
        createdAt: 100,
        updatedAt: 100,
        x: 0.1,
        y: 0.1,
        width: 0.2,
        height: 0.2,
      },
    ];

    // Push state0 before transitioning to state1
    history.push(state0);

    // Current state is state1, undo should return deep copy of state0
    const undone = history.undo(state1);
    expect(undone).toEqual([]);
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(true);

    // Redo should return deep copy of state1
    const redone = history.redo(undone!);
    expect(redone).toEqual(state1);
    expect(redone![0]).not.toBe(state1[0]); // Must be deep clone
    expect(history.canUndo).toBe(true);
    expect(history.canRedo).toBe(false);
  });

  it('pushing a new state clears the redo stack', () => {
    const history = new HistoryManager(10);
    const s0: Annotation[] = [];
    const s1: Annotation[] = [
      {
        id: '1',
        type: 'BBOX',
        classType: 'SCRATCH',
        confidence: 1,
        createdAt: 0,
        updatedAt: 0,
        x: 0,
        y: 0,
        width: 0.1,
        height: 0.1,
      },
    ];
    const s2: Annotation[] = [
      ...s1,
      {
        id: '2',
        type: 'BBOX',
        classType: 'CORROSION',
        confidence: 1,
        createdAt: 0,
        updatedAt: 0,
        x: 0.5,
        y: 0.5,
        width: 0.1,
        height: 0.1,
      },
    ];

    history.push(s0);
    history.push(s1);

    // Undo from s2 -> restores s1
    history.undo(s2);
    expect(history.canRedo).toBe(true);

    // Branch a new action s3 instead of redoing
    const s3: Annotation[] = [
      {
        id: '3',
        type: 'BBOX',
        classType: 'VIA_VOID',
        confidence: 1,
        createdAt: 0,
        updatedAt: 0,
        x: 0.2,
        y: 0.2,
        width: 0.2,
        height: 0.2,
      },
    ];
    history.push(s3);

    // Redo stack must be purged
    expect(history.canRedo).toBe(false);
    expect(history.redo(s3)).toBeNull();
  });

  it('respects maximum stack size limit', () => {
    const history = new HistoryManager(3);
    for (let i = 0; i < 5; i++) {
      history.push([
        {
          id: `box-${i}`,
          type: 'BBOX',
          classType: 'PARTICLE',
          confidence: 1,
          createdAt: 0,
          updatedAt: 0,
          x: 0,
          y: 0,
          width: 0.1,
          height: 0.1,
        },
      ]);
    }

    // Only 3 items kept in undo stack
    let undoCount = 0;
    let curr: Annotation[] = [];
    while (history.canUndo) {
      curr = history.undo(curr)!;
      undoCount++;
    }
    expect(undoCount).toBe(3);
  });
});
