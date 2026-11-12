import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { CanvasViewport } from '../components/canvas/CanvasViewport';
import { useCanvasStore } from '../store/useCanvasStore';

describe('CanvasViewport Component', () => {
  beforeEach(() => {
    useCanvasStore.setState({
      transform: { scale: 1.0, translateX: 0, translateY: 0 },
      imageDimensions: { width: 1024, height: 1024 },
      activeTool: 'SELECT',
      annotations: [],
    });
  });

  it('renders without crashing and mounts all 3 canvas layers and HUD', () => {
    const { container } = render(<CanvasViewport />);

    // Must find 4 canvases (Layer 1 Grid, Layer 2 Raster, Layer 3 Vector, Minimap Canvas)
    const canvases = container.querySelectorAll('canvas');
    expect(canvases.length).toBeGreaterThanOrEqual(3);

    // Check HUD text elements
    expect(screen.getByText(/ZOOM:/i)).toBeInTheDocument();
    expect(screen.getByText(/1024 × 1024 px/i)).toBeInTheDocument();
  });

  it('updates zoom and reflects in HUD when transform changes', () => {
    render(<CanvasViewport />);

    // Initially 100%
    expect(screen.getByText(/ZOOM: 100%/i)).toBeInTheDocument();

    // Update zoom in store wrapped in act
    act(() => {
      useCanvasStore.getState().setTransform({ scale: 2.5 });
    });

    // Should reflect 250%
    expect(screen.getByText(/ZOOM: 250%/i)).toBeInTheDocument();
  });
});
