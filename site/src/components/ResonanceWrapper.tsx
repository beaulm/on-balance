import { useState, useCallback, type ReactNode } from 'react';
import TextSelectionHandler, { type SelectionData } from './TextSelectionHandler';
import ResonancePopup from './ResonancePopup';
import { formatSelectionData, sendResonance } from '../lib/resonance';

interface ResonanceWrapperProps {
  children: ReactNode;
  moduleSlug: string;
}

export default function ResonanceWrapper({ children, moduleSlug }: ResonanceWrapperProps) {
  const [selection, setSelection] = useState<SelectionData | null>(null);

  const handleSelection = useCallback((newSelection: SelectionData | null) => {
    setSelection(newSelection);
  }, []);

  const handleResonance = useCallback(async (selectionData: SelectionData) => {
    const payload = await formatSelectionData(moduleSlug, selectionData);
    await sendResonance(payload);
  }, [moduleSlug]);

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
