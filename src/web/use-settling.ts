import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Group } from "../shared/types";

const RELEASE_AFTER_MS = 2600;
const LEAVE_DELAY_MS = 260;

export type Settling = Record<string, Group>;

export function releaseSettled(
  settling: Settling,
  release: { group?: Group; hovered: Group | null },
): Settling {
  return Object.fromEntries(
    Object.entries(settling).filter(([, group]) =>
      release.group ? group !== release.group : group === release.hovered,
    ),
  );
}

export function useSettling() {
  const [settling, setSettling] = useState<Settling>({});
  const hovered = useRef<Group | null>(null);
  const releaseTimer = useRef<number | undefined>(undefined);
  const leaveTimer = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      window.clearTimeout(releaseTimer.current);
      window.clearTimeout(leaveTimer.current);
    },
    [],
  );

  const hold = useCallback((templateId: string, group: Group) => {
    setSettling((current) => ({ ...current, [templateId]: group }));
    window.clearTimeout(releaseTimer.current);
    releaseTimer.current = window.setTimeout(
      () =>
        setSettling((current) =>
          releaseSettled(current, { hovered: hovered.current }),
        ),
      RELEASE_AFTER_MS,
    );
  }, []);

  const drop = useCallback((templateId: string) => {
    setSettling((current) => {
      const { [templateId]: _removed, ...rest } = current;
      return rest;
    });
  }, []);

  const clear = useCallback(() => setSettling({}), []);

  const onHover = useCallback((group: Group, hovering: boolean) => {
    window.clearTimeout(leaveTimer.current);
    if (hovering) {
      hovered.current = group;
      return;
    }
    hovered.current = null;
    leaveTimer.current = window.setTimeout(() => {
      if (hovered.current !== group) {
        setSettling((current) =>
          releaseSettled(current, { group, hovered: hovered.current }),
        );
      }
    }, LEAVE_DELAY_MS);
  }, []);

  const held = useMemo(() => new Set(Object.keys(settling)), [settling]);

  return { settling: held, hold, drop, clear, onHover };
}
