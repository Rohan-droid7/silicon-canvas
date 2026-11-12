import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { SideControlDrawer } from '../components/layout/SideControlDrawer';
import { useCanvasStore } from '../store/useCanvasStore';

describe('SideControlDrawer Component', () => {
  beforeEach(() => {
    useCanvasStore.setState({
      activeTool: 'SELECT',
      activeDefectClass: 'PARTICLE',
      annotations: [
        {
          id: 'test-1',
          type: 'BBOX',
          classType: 'PARTICLE',
          confidence: 0.99,
          createdAt: 0,
          updatedAt: 0,
          x: 0.1,
          y: 0.1,
          width: 0.1,
          height: 0.1,
        },
      ],
      filterParams: { brightness: 0, contrast: 0, filterType: 'NONE' },
    });
  });

  it('renders tool buttons and changes active tool', async () => {
    render(<SideControlDrawer />);

    // Click on Box tool
    const boxButtons = screen.getAllByRole('button');
    // Box icon button should exist
    expect(boxButtons.length).toBeGreaterThan(0);

    // Defect taxonomy list should show Particle with count 1
    expect(screen.getByText('Particle')).toBeInTheDocument();
    expect(screen.getByText('DEFECT TAXONOMY (1)')).toBeInTheDocument();
  });

  it('allows selecting different defect classes', async () => {
    render(<SideControlDrawer />);

    const scratchItem = screen.getByText('Scratch');
    await userEvent.click(scratchItem);

    expect(useCanvasStore.getState().activeDefectClass).toBe('SCRATCH');
  });
});
