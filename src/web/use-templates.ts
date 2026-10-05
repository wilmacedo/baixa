import { useCallback, useEffect, useRef, useState } from "react";
import type { Template, TemplateInput, TemplatePatch } from "../shared/types";
import { api } from "./api";

export function useTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const latest = useRef(templates);
  latest.current = templates;

  const load = useCallback(() => {
    setStatus("loading");
    api.listTemplates().then(
      (list) => {
        setTemplates(list);
        setStatus("ready");
      },
      () => setStatus("error"),
    );
  }, []);

  useEffect(load, [load]);

  const create = async (
    input: TemplateInput,
  ): Promise<Template | undefined> => {
    try {
      const created = await api.createTemplate(input);
      setTemplates((current) => [...current, created]);
      return created;
    } catch {
      return undefined;
    }
  };

  const update = async (id: string, patch: TemplatePatch): Promise<boolean> => {
    const previous = latest.current.find((t) => t.id === id);
    if (!previous) return false;

    const replace = (template: Template) =>
      setTemplates((current) =>
        current.map((t) => (t.id === id ? template : t)),
      );

    replace({ ...previous, ...patch });
    try {
      await api.updateTemplate(id, patch);
      return true;
    } catch {
      replace(previous);
      return false;
    }
  };

  return { templates, status, reload: load, create, update };
}
