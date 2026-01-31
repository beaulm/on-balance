import { useState, useCallback, type ReactNode } from 'react';
import TextSelectionHandler, { type SelectionData } from './TextSelectionHandler';
import ResonancePopup from './ResonancePopup';

interface ResonanceWrapperProps {
  children: ReactNode;
}

export default function ResonanceWrapper({ children }: ResonanceWrapperProps) {
  const [selection, setSelection] = useState<SelectionData | null>(null);

  const handleSelection = useCallback((newSelection: SelectionData | null) => {
    setSelection(newSelection);
  }, []);

  const handleResonance = useCallback((selectionData: SelectionData) => {
    // For now, just log - actual persistence will be in later issues (#47, #48)
    console.log('[ResonanceWrapper] Resonance recorded:', selectionData);
  }, []);

  const handleDismiss = useCallback(() => {
    setSelection(null);
    // Clear the browser's text selection
    window.getSelection()?.removeAllRanges();
  }, []);

  return (
    <>
      <TextSelectionHandler onSelection={handleSelection}>
        {children}
      </TextSelectionHandler>
      <ResonancePopup
        key={selection ? `${selection.startOffset}-${selection.endOffset}` : 'none'}
        selection={selection}
        onResonance={handleResonance}
        onDismiss={handleDismiss}
      />
    </>
  );
}
