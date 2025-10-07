import React, { useEffect, useCallback } from 'react';

interface KeyboardShortcutsProps {
  onStart?: () => void;
  onRevision?: () => void;
  onExport?: () => void;
  onToggleTheme?: () => void;
  isLoading?: boolean;
  hasCompletedRun?: boolean;
  hasFeedback?: boolean;
}

const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({
  onStart,
  onRevision,
  onExport,
  onToggleTheme,
  isLoading = false,
  hasCompletedRun = false,
  hasFeedback = false
}) => {
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when user is typing in input fields
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    const { ctrlKey, metaKey, shiftKey, key } = event;
    const cmdOrCtrl = ctrlKey || metaKey;

    switch (key.toLowerCase()) {
      case 's':
        if (cmdOrCtrl && shiftKey) {
          event.preventDefault();
          onStart?.();
        }
        break;
      case 'r':
        if (cmdOrCtrl && shiftKey && hasFeedback && !isLoading) {
          event.preventDefault();
          onRevision?.();
        }
        break;
      case 'e':
        if (cmdOrCtrl && hasCompletedRun) {
          event.preventDefault();
          onExport?.();
        }
        break;
      case 't':
        if (cmdOrCtrl) {
          event.preventDefault();
          onToggleTheme?.();
        }
        break;
    }
  }, [onStart, onRevision, onExport, onToggleTheme, isLoading, hasCompletedRun, hasFeedback]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-gray-900 dark:bg-gray-800 text-white rounded-lg shadow-lg p-3 max-w-xs">
        <div className="text-xs font-semibold mb-2 text-gray-300">Keyboard Shortcuts</div>
        <div className="space-y-1 text-xs">
          {onStart && (
            <div className="flex justify-between">
              <span className="text-gray-400">Start Analysis</span>
              <kbd className="bg-gray-700 px-1 rounded text-gray-200">⌘⇧S</kbd>
            </div>
          )}
          {onRevision && hasFeedback && (
            <div className="flex justify-between">
              <span className="text-gray-400">New Revision</span>
              <kbd className="bg-gray-700 px-1 rounded text-gray-200">⌘⇧R</kbd>
            </div>
          )}
          {onExport && hasCompletedRun && (
            <div className="flex justify-between">
              <span className="text-gray-400">Export Results</span>
              <kbd className="bg-gray-700 px-1 rounded text-gray-200">⌘E</kbd>
            </div>
          )}
          {onToggleTheme && (
            <div className="flex justify-between">
              <span className="text-gray-400">Toggle Theme</span>
              <kbd className="bg-gray-700 px-1 rounded text-gray-200">⌘T</kbd>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcuts;
