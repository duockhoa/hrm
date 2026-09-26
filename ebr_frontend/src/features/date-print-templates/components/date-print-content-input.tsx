"use client";

import { useId, useRef, useState, type ComponentProps } from "react";
import { Textarea } from "@/components/ui/textarea";

const VARIABLES = [
  { name: "mfg_dd", label: "Ngày sản xuất (2 chữ số)" },
  { name: "mfg_mm", label: "Tháng sản xuất (2 chữ số)" },
  { name: "mfg_yy", label: "Năm sản xuất (2 chữ số)" },
  { name: "mfg_yyyy", label: "Năm sản xuất (4 chữ số)" },
  { name: "exp_dd", label: "Ngày hết hạn (2 chữ số)" },
  { name: "exp_mm", label: "Tháng hết hạn (2 chữ số)" },
  { name: "exp_yy", label: "Năm hết hạn (2 chữ số)" },
  { name: "exp_yyyy", label: "Năm hết hạn (4 chữ số)" },
  { name: "batch_number", label: "Số lô" },
];

type Token = { start: number; end: number; query: string };

function getToken(input: HTMLTextAreaElement): Token | null {
  const end = input.selectionStart;
  if (end !== input.selectionEnd) return null;
  const prefix = input.value.slice(0, end);
  const match = prefix.match(/\{\{?([a-zA-Z_]*)$/);
  if (match) {
    return { start: end - match[0].length, end, query: match[1].toLowerCase() };
  }
  // Only trigger shortcuts at a word boundary, not inside normal words.
  const shortcut = prefix.match(/(?:^|[^\p{L}\p{N}_])(d{1,2}|m{1,2}|y{1,4})$/iu);
  if (!shortcut) return null;
  return { start: end - shortcut[1].length, end, query: shortcut[1].toLowerCase() };
}

function matchesVariable(name: string, query: string) {
  if (/^d{1,2}$/.test(query)) return name.endsWith("_dd");
  if (/^m{1,2}$/.test(query)) return name.endsWith("_mm");
  if (/^y{1,4}$/.test(query)) {
    return query.length > 2
      ? name.endsWith("_yyyy")
      : name.endsWith("_yy") || name.endsWith("_yyyy");
  }
  return name.includes(query);
}

export default function DatePrintContentInput({
  value,
  onValueChange,
  variablePrefix,
  ...props
}: Omit<ComponentProps<"textarea">, "value" | "onChange"> & {
  value: string;
  onValueChange: (value: string) => void;
  variablePrefix?: "mfg" | "exp";
}) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const [token, setToken] = useState<Token | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const suggestions = token
    ? VARIABLES.filter((variable) =>
        (!variablePrefix || variable.name.startsWith(`${variablePrefix}_`)) &&
        matchesVariable(variable.name, token.query),
      )
    : [];
  const isOpen = token !== null && suggestions.length > 0;

  const updateToken = (input: HTMLTextAreaElement) => {
    const next = getToken(input);
    if (
      next?.start !== token?.start ||
      next?.end !== token?.end ||
      next?.query !== token?.query
    ) {
      setToken(next);
      setActiveIndex(0);
    }
  };

  const selectVariable = (name: string) => {
    if (!token) return;
    // Replace the rest of an existing token too, including closing braces.
    const suffix = value.slice(token.end);
    const remainder = suffix.match(/^[a-zA-Z_]*\}{0,2}/)?.[0] ?? "";
    const replacement = `{{${name}}}`;
    onValueChange(
      value.slice(0, token.start) +
        replacement +
        suffix.slice(remainder.length),
    );
    const caret = token.start + replacement.length;
    setToken(null);
    setActiveIndex(0);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(caret, caret);
    });
  };

  return (
    <div className="space-y-2">
      <Textarea
        {...props}
        ref={inputRef}
        value={value}
        aria-autocomplete="list"
        aria-controls={isOpen ? listId : undefined}
        aria-activedescendant={isOpen ? `${listId}-${activeIndex}` : undefined}
        onChange={(event) => {
          onValueChange(event.target.value);
          updateToken(event.target);
        }}
        onSelect={(event) => updateToken(event.currentTarget)}
        onBlur={() => setToken(null)}
        onKeyDown={(event) => {
          if (!isOpen || event.nativeEvent.isComposing) return;
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            setToken(null);
          } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            const next =
              (activeIndex +
                (event.key === "ArrowDown" ? 1 : -1) +
                suggestions.length) %
              suggestions.length;
            setActiveIndex(next);
            listRef.current?.children[next]?.scrollIntoView({
              block: "nearest",
            });
          } else if (event.key === "Enter" || event.key === "Tab") {
            event.preventDefault();
            selectVariable(suggestions[activeIndex].name);
          }
        }}
      />
      {isOpen && (
        <div className="rounded-md border bg-popover p-1 text-popover-foreground shadow-sm">
          <div
            id={listId}
            ref={listRef}
            role="listbox"
            aria-label="Biến nội dung in"
            className="max-h-56 overflow-y-auto"
          >
            {suggestions.map((variable, index) => (
              <div
                key={variable.name}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                className={`flex cursor-pointer flex-wrap items-center justify-between gap-x-3 rounded-sm px-2 py-2 text-sm ${index === activeIndex ? "bg-accent text-accent-foreground" : ""}`}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectVariable(variable.name)}
              >
                <span className="font-mono">{`{{${variable.name}}}`}</span>
                <span className="text-muted-foreground">{variable.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
