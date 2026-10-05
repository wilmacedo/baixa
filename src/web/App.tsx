import { useCallback, useState } from "react";
import styles from "./App.module.css";
import { Header, type Screen } from "./components/Header";
import { Toast } from "./components/Toast";
import { MonthScreen } from "./screens/MonthScreen";
import { useMonthNavigation } from "./use-month-navigation";
import { useTheme } from "./use-theme";
import { useToast } from "./use-toast";
import { useToday } from "./use-today";
import { useUndo } from "./use-undo";
import { useViewport } from "./use-viewport";

const noop = () => {};

export function App() {
  const today = useToday();
  const { theme, toggle } = useTheme();
  const { width } = useViewport();
  const navigation = useMonthNavigation(today.month);
  const [screen, setScreen] = useState<Screen>("month");
  const toast = useToast();
  const undo = useUndo();

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

  return (
    <div className={styles.app}>
      <span aria-hidden="true" className={styles.margin} />
      <Header
        screen={screen}
        today={today}
        wide={width >= 1180}
        themeName={theme === "dark" ? "carbono" : "folha"}
        onScreen={setScreen}
        onToggleTheme={toggle}
        onHelp={noop}
        onNewExpense={noop}
      />
      {screen === "month" && (
        <MonthScreen
          navigation={navigation}
          today={today}
          width={width}
          announce={announce}
        />
      )}
      <Toast toast={toast.toast} onUndo={performUndo} />
    </div>
  );
}
