import { Children, isValidElement, type ReactNode, useEffect, useRef } from "react";

type ElementWithChildren = {
  children?: ReactNode;
};

type HelmetEntry = {
  order: number;
  title: string;
};

const helmetEntries = new Map<symbol, HelmetEntry>();
let nextOrder = 0;

const applyLatestTitle = () => {
  let latest: HelmetEntry | null = null;
  for (const entry of helmetEntries.values()) {
    if (latest === null || entry.order > latest.order) {
      latest = entry;
    }
  }

  if (latest !== null) {
    document.title = latest.title;
  }
};

const toText = (node: ReactNode): string => {
  if (node === null || node === undefined || typeof node === "boolean") {
    return "";
  }

  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map((child) => toText(child)).join("");
  }

  if (isValidElement<ElementWithChildren>(node)) {
    return toText(node.props.children as ReactNode);
  }

  return "";
};

const extractTitle = (children: ReactNode): string | null => {
  for (const child of Children.toArray(children)) {
    if (isValidElement<ElementWithChildren>(child) && child.type === "title") {
      return toText(child.props.children as ReactNode);
    }
  }

  return null;
};

type HelmetProps = {
  children: ReactNode;
};

export const Helmet = ({ children }: HelmetProps) => {
  const idRef = useRef<symbol>(Symbol("helmet"));
  const title = extractTitle(children);

  useEffect(() => {
    if (title === null) {
      return;
    }

    const id = idRef.current;
    const existing = helmetEntries.get(id);
    if (existing === undefined) {
      helmetEntries.set(id, { order: ++nextOrder, title });
    } else {
      helmetEntries.set(id, { ...existing, title });
    }

    applyLatestTitle();

    return () => {
      helmetEntries.delete(id);
      applyLatestTitle();
    };
  }, [title]);

  return null;
};
