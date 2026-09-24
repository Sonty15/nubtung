'use client';

import { useEffect, useRef, useCallback } from 'react';

interface UseHistoryModalOptions {
  isOpen: boolean;
  onClose: () => void;
  modalId?: string;
  enableEsc?: boolean;
}

/**
 * Custom hook to sync modal state with browser history (Back / Forward buttons & mobile swipe gestures).
 *
 * Behaviors:
 * 1. When the modal opens: Pushes a history state entry into window.history.
 * 2. When the user taps the phone's back button / browser back / swipe gesture:
 *    The popstate event triggers onClose() to dismiss the modal, keeping the user on the current page!
 * 3. When the user closes the modal via UI (Cancel button, X button, or form submission):
 *    closeModal() cleanly calls history.back() so the browser's history stack is kept in sync.
 * 4. When Escape key is pressed (on desktop):
 *    Dismisses the modal and reverts history state.
 */
export function useHistoryModal({
  isOpen,
  onClose,
  modalId = 'modal',
  enableEsc = true,
}: UseHistoryModalOptions) {
  const isPushedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Safe manual close function to trigger from UI buttons (Cancel, X, Save completion)
  const closeModal = useCallback(() => {
    if (typeof window !== 'undefined' && isPushedRef.current) {
      isPushedRef.current = false;
      window.history.back();
    }
    onCloseRef.current();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (isOpen) {
      if (!isPushedRef.current) {
        window.history.pushState({ [modalId]: true }, '', window.location.href);
        isPushedRef.current = true;
      }

      const handlePopState = (event: PopStateEvent) => {
        if (isPushedRef.current) {
          isPushedRef.current = false;
          onCloseRef.current();
        }
      };

      const handleKeyDown = (event: KeyboardEvent) => {
        if (enableEsc && event.key === 'Escape') {
          closeModal();
        }
      };

      window.addEventListener('popstate', handlePopState);
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        window.removeEventListener('popstate', handlePopState);
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      // If isOpen became false directly without popstate
      if (isPushedRef.current) {
        isPushedRef.current = false;
        if (window.history.state?.[modalId]) {
          window.history.back();
        }
      }
    }
  }, [isOpen, modalId, enableEsc, closeModal]);

  return { closeModal };
}
