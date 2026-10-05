import { useCallback, useState } from "react";
import styles from "./App.module.css";
import { BottomBar } from "./components/BottomBar";
import { ChatButton } from "./components/ChatButton";
import { ChatPanel } from "./components/ChatPanel";
import { Header, type Screen } from "./components/Header";
import { MobileHeader } from "./components/MobileHeader";
import { ShortcutsHelp } from "./components/ShortcutsHelp";
import { Toast } from "./components/Toast";
import { MonthScreen, type QuickAddRequest } from "./screens/MonthScreen";
import { RecurringScreen } from "./screens/RecurringScreen";
import type { GlobalAction } from "./shortcuts";
import { useChat } from "./use-chat";
import { useExpenseHistory } from "./use-expense-history";
import { useMonthNavigation } from "./use-month-navigation";
import { useShortcuts } from "./use-shortcuts";
import { useTheme } from "./use-theme";
import { useToast } from "./use-toast";
import { useToday } from "./use-today";
import { useUndo } from "./use-undo";
import { useViewport } from "./use-viewport";

export function App() {
  const today = useToday();
  const { theme, toggle } = useTheme();
  const { width, mode } = useViewport();
  const navigation = useMonthNavigation(today.month);
  const [screen, setScreen] = useState<Screen>("month");
  const toast = useToast();
  const undo = useUndo();
  const history = useExpenseHistory();
  const [quickAdd, setQuickAdd] = useState<QuickAddRequest | null>(null);

  const openQuickAdd = useCallback((request: QuickAddRequest = {}) => {
    setScreen("month");
    setQuickAdd(request);
  }, []);
  const closeQuickAdd = useCallback(() => setQuickAdd(null), []);

  const announce = useCallback(
    (text: string, undoAction?: () => unknown) => {
      if (undoAction) undo.record(undoAction);
      toast.show(text, undoAction !== undefined);
    },
    [undo.record, toast.show],
  );

  const performUndo = async () => {
    if (await undo.run()) toast.show("Desfeito", false);
  };

  const [helpOpen, setHelpOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const chat = useChat(chatOpen);

  useShortcuts({
    helpOpen,
    chatOpen,
    onAction: (action: GlobalAction) => {
      switch (action.type) {
        case "theme":
          return toggle();
        case "help":
          return setHelpOpen((open) => !open);
        case "chat":
          return chat.available && setChatOpen((open) => !open);
        case "month":
        case "recurring":
          return setScreen(action.type);
        case "undo":
          return performUndo();
        case "newExpense":
          return openQuickAdd({ initialRaw: action.digit });
      }
    },
  });

  return (
    <div className={styles.app}>
      {mode === "desktop" ? (
        <>
          <span aria-hidden="true" className={styles.margin} />
          <Header
            screen={screen}
            today={today}
            wide={width >= 1180}
            themeName={theme === "dark" ? "carbono" : "folha"}
            onScreen={setScreen}
            onToggleTheme={toggle}
            onHelp={() => setHelpOpen(true)}
            onNewExpense={() => openQuickAdd()}
          />
        </>
      ) : (
        <MobileHeader
          month={screen === "month" ? navigation.month : null}
          canGoBack={navigation.canGoBack}
          slide={navigation.style}
          onPrevious={() => navigation.goBy(-1)}
          onNext={() => navigation.goBy(1)}
          onToggleTheme={toggle}
        />
      )}
      {screen === "month" && (
        <MonthScreen
          navigation={navigation}
          today={today}
          width={width}
          announce={announce}
          history={history.history}
          onHistoryChanged={history.refresh}
          quickAdd={quickAdd}
          onOpenQuickAdd={openQuickAdd}
          onCloseQuickAdd={closeQuickAdd}
          keysEnabled={!helpOpen && !chatOpen}
          mode={mode}
        />
      )}
      {screen === "recurring" && (
        <RecurringScreen today={today} width={width} announce={announce} />
      )}
      {mode === "mobile" && (
        <BottomBar
          screen={screen}
          onScreen={setScreen}
          onNewExpense={() => openQuickAdd()}
        />
      )}
      {helpOpen && <ShortcutsHelp onClose={() => setHelpOpen(false)} />}
      {chat.available && !chatOpen && (
        <ChatButton
          compact={mode === "mobile"}
          busy={chat.state.phase !== "idle"}
          onOpen={() => setChatOpen(true)}
        />
      )}
      {chatOpen && (
        <ChatPanel
          mode={mode}
          state={chat.state}
          onSend={chat.send}
          onStop={chat.stop}
          onStartOver={chat.startOver}
          onClose={() => setChatOpen(false)}
        />
      )}
      <Toast
        toast={toast.toast}
        compact={mode === "mobile"}
        onUndo={performUndo}
      />
    </div>
  );
}
