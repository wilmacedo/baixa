import { useEffect } from "react";
import { type GlobalAction, globalShortcut, isEditable } from "./shortcuts";

interface UseShortcutsOptions {
  helpOpen: boolean;
  onAction: (action: GlobalAction) => void;
}

export function useShortcuts({ helpOpen, onAction }: UseShortcutsOptions) {
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;

      const action = globalShortcut(event);
      if (!action) return;
      if (helpOpen && action.type !== "help") return;
      if (isEditable(event.target)) return;

      event.preventDefault();
      onAction(action);
    };

    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [helpOpen, onAction]);
}
