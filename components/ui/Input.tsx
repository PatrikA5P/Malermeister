
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Input & Form primitives (Tailwind)
 * Ziel: stabile, einheitliche Felder (48px), identisches Spacing zwischen Label/Feld/Hint/Error,
 * und robuste Popups (Select, SearchableSelect, MultiSelect, PhoneInput), die NICHT durch overflow hidden abgeschnitten werden.
 */

const cn = (...classes: Array<string | undefined | false | null>) => classes.filter(Boolean).join(" ");

export const baseInputStyles =
  "w-full min-h-[48px] bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-sm transition " +
  "focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-300 " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

/* ---------------------------------- */
/* FormField: einheitliches Spacing    */
/* ---------------------------------- */

export interface FormFieldProps {
  label?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  warning?: string;
  fullWidth?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  required,
  hint,
  error,
  warning,
  fullWidth = true,
  className,
  children,
}) => {
  return (
    <div className={cn(fullWidth ? "w-full" : "inline-block", "space-y-1.5", className)}>
      {label ? (
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-zinc-800">{label}</label>
          {required ? <span className="text-rose-600 text-xs font-bold">*</span> : null}
        </div>
      ) : null}

      <div>{children}</div>

      {error ? (
        <p className="text-sm text-rose-700">{error}</p>
      ) : warning ? (
        <p className="text-sm text-amber-700">{warning}</p>
      ) : hint ? (
        <p className="text-sm text-zinc-500">{hint}</p>
      ) : null}
    </div>
  );
};

/* ---------------------------------- */
/* Helpers: Outside click + Floating   */
/* ---------------------------------- */

const useOutsideClick = (
  isOpen: boolean,
  refs: Array<React.RefObject<HTMLElement>>,
  onClose: () => void
) => {
  useEffect(() => {
    if (!isOpen) return;

    const handler = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;

      const inside = refs.some((r) => r.current && r.current.contains(target));
      if (!inside) onClose();
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, refs, onClose]);
};

const useDropdownPosition = (isOpen: boolean, anchorRef: React.RefObject<HTMLElement>) => {
  const [position, setPosition] = useState<"bottom" | "top">("bottom");

  useLayoutEffect(() => {
    if (!isOpen || !anchorRef.current) return;

    const rect = anchorRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const dropdownHeight = 280;

    if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) setPosition("top");
    else setPosition("bottom");
  }, [isOpen, anchorRef]);

  return position;
};

type FloatingStyle = { position: "fixed"; left: number; top: number; width: number };

const useFloatingStyle = (
  isOpen: boolean,
  anchorRef: React.RefObject<HTMLElement>,
  position: "bottom" | "top",
  opts?: { offset?: number; widthMode?: "anchor" | "minAnchor" | "fixed"; fixedWidth?: number }
) => {
  const [style, setStyle] = useState<FloatingStyle | null>(null);

  useLayoutEffect(() => {
    if (!isOpen || !anchorRef.current) return;

    const offset = opts?.offset ?? 8;

    const compute = () => {
      const rect = anchorRef.current!.getBoundingClientRect();
      const width =
        opts?.widthMode === "fixed"
          ? opts.fixedWidth ?? 320
          : opts?.widthMode === "minAnchor"
          ? Math.max(320, rect.width)
          : rect.width;

      const left = Math.min(rect.left, window.innerWidth - width - 8);
      const top = position === "top" ? rect.top - offset : rect.bottom + offset;

      setStyle({ position: "fixed", left: Math.max(8, left), top, width });
    };

    compute();

    const onScroll = () => compute();
    const onResize = () => compute();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [isOpen, anchorRef, position, opts?.offset, opts?.widthMode, opts?.fixedWidth]);

  return style;
};

const Portal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
};

const fieldTone = (error?: string, warning?: string) => {
  if (error) {
    return {
      border: "border-rose-300 focus:border-rose-300 focus:ring-rose-500/15",
      bg: "bg-rose-50/40",
    };
  }
  if (warning) {
    return {
      border: "border-amber-300 focus:border-amber-300 focus:ring-amber-500/15",
      bg: "bg-amber-50/40",
    };
  }
  return { border: "border-zinc-200 focus:border-zinc-300 focus:ring-zinc-900/10", bg: "bg-zinc-50" };
};

/* ---------------------------------- */
/* TextInput                            */
/* ---------------------------------- */

interface BaseInputProps {
  label?: string;
  error?: string;
  warning?: string;
  fullWidth?: boolean;
  required?: boolean;
  hint?: string;
}

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement>, BaseInputProps {
  icon?: string;
  rightIcon?: string;
  onRightIconClick?: () => void;
}

export const TextInput: React.FC<TextInputProps> = ({
  label,
  error,
  warning,
  fullWidth = true,
  className = "",
  icon,
  rightIcon,
  onRightIconClick,
  type,
  required,
  hint,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  const tone = fieldTone(error, warning);

  return (
    <FormField label={label} required={required} error={error} warning={warning} hint={hint} fullWidth={fullWidth}>
      <div className="relative">
        {icon ? <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">{icon}</span> : null}

        <input
          {...props}
          type={inputType}
          className={cn(
            baseInputStyles,
            tone.border,
            tone.bg,
            icon ? "pl-10" : "",
            rightIcon || isPassword ? "pr-10" : "",
            className
          )}
        />

        {isPassword ? (
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg hover:bg-zinc-100 text-zinc-600 flex items-center justify-center transition"
            aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
          >
            {showPassword ? "🙈" : "👁️"}
          </button>
        ) : rightIcon ? (
          <button
            type="button"
            onClick={onRightIconClick}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg hover:bg-zinc-100 text-zinc-600 flex items-center justify-center transition"
            aria-label="Aktion"
          >
            {rightIcon}
          </button>
        ) : null}
      </div>
    </FormField>
  );
};

/* ---------------------------------- */
/* TextArea                             */
/* ---------------------------------- */

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement>, BaseInputProps {}

export const TextArea: React.FC<TextAreaProps> = ({
  label,
  error,
  warning,
  fullWidth = true,
  className = "",
  required,
  hint,
  ...props
}) => {
  const tone = fieldTone(error, warning);
  return (
    <FormField label={label} required={required} error={error} warning={warning} hint={hint} fullWidth={fullWidth}>
      <textarea
        {...props}
        className={cn(
          "w-full min-h-[120px] bg-zinc-50 border rounded-xl px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-sm transition focus:outline-none focus:ring-2",
          tone.border,
          tone.bg,
          className
        )}
      />
    </FormField>
  );
};

/* ---------------------------------- */
/* SimpleSearchInput                    */
/* ---------------------------------- */

interface SimpleSearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: string;
  onChange: (val: string) => void;
  onClear?: () => void;
  placeholder?: string;
}

export const SimpleSearchInput: React.FC<SimpleSearchInputProps> = ({ value, onChange, onClear, placeholder, ...props }) => {
  return (
    <div className="relative w-full">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">🔍</span>
      <input
        {...props}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Suchen..."}
        className={cn(baseInputStyles, "pl-10 pr-10")}
      />
      {value && onClear ? (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg hover:bg-zinc-100 text-zinc-600 flex items-center justify-center transition"
          aria-label="Suche leeren"
        >
          ✕
        </button>
      ) : null}
    </div>
  );
};

/* ---------------------------------- */
/* SearchInputToolbar / Big             */
/* ---------------------------------- */

interface SearchInputToolbarProps extends React.InputHTMLAttributes<HTMLInputElement> {
  placeholder?: string;
}

export const SearchInputToolbar: React.FC<SearchInputToolbarProps> = ({ placeholder, className, ...props }) => (
  <div className="relative w-full">
    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">🔎</span>
    <input
      {...props}
      placeholder={placeholder || "Suchen..."}
      className={cn(
        "w-full h-10 bg-white border border-zinc-200 rounded-xl pl-10 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-300",
        className
      )}
    />
  </div>
);

interface SearchInputBigProps extends React.InputHTMLAttributes<HTMLInputElement> {
  placeholder?: string;
}

export const SearchInputBig: React.FC<SearchInputBigProps> = ({ placeholder, className, ...props }) => (
  <div className="relative w-full">
    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 text-base">🔎</span>
    <input
      {...props}
      placeholder={placeholder || "Suchen..."}
      className={cn(
        "w-full h-12 bg-zinc-50 border border-zinc-200 rounded-2xl pl-12 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-300",
        className
      )}
    />
  </div>
);

/* ---------------------------------- */
/* Select (Custom Dropdown)             */
/* ---------------------------------- */

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange">, BaseInputProps {
  options: SelectOption[];
  onChange?: (e: { target: { value: any; name?: string } }) => void;
  placeholder?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  className = "",
  value,
  onChange,
  placeholder,
  name,
  disabled,
  error,
  warning,
  required,
  hint,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const anchorRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const position = useDropdownPosition(isOpen, anchorRef);
  const floatStyle = useFloatingStyle(isOpen, anchorRef, position, { widthMode: "anchor" });
  useOutsideClick(isOpen, [anchorRef as any, dropdownRef], () => setIsOpen(false));

  const currentOption = options.find((o) => String(o.value) === String(value));
  const displayLabel = currentOption ? currentOption.label : placeholder || "Bitte wählen...";

  const showSearch = options.length > 10;
  const filtered = useMemo(() => {
    if (!showSearch) return options;
    const s = search.trim().toLowerCase();
    if (!s) return options;
    return options.filter((o) => o.label.toLowerCase().includes(s));
  }, [options, search, showSearch]);

  const tone = fieldTone(error, warning);

  const selectValue = (val: string | number) => {
    if (onChange) onChange({ target: { value: val, name } });
    setIsOpen(false);
    setSearch("");
  };

  return (
    <FormField label={label} required={required} error={error} warning={warning} hint={hint}>
      <div className="relative">
        <button
          ref={anchorRef}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen((o) => !o)}
          className={cn(
            baseInputStyles,
            tone.border,
            tone.bg,
            "text-left flex items-center justify-between gap-3",
            disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
            className
          )}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className={cn("truncate", currentOption ? "text-zinc-900" : "text-zinc-500")}>{displayLabel}</span>
          <span className="text-zinc-500 text-lg">{isOpen ? "▴" : "▾"}</span>
        </button>

        {isOpen && floatStyle ? (
          <Portal>
            <div
              ref={dropdownRef}
              className="z-[9999] rounded-2xl border border-zinc-200 bg-white shadow-xl overflow-hidden"
              style={floatStyle}
            >
              {showSearch ? (
                <div className="p-2 border-b border-zinc-100">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Suchen..."
                    className="w-full h-10 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                    autoFocus
                  />
                </div>
              ) : null}

              <div className="max-h-64 overflow-auto py-1">
                {filtered.length === 0 ? (
                  <div className="px-3 py-3 text-sm text-zinc-500">Keine Treffer</div>
                ) : (
                  filtered.map((opt) => {
                    const active = String(opt.value) === String(value);
                    return (
                      <button
                        key={String(opt.value)}
                        type="button"
                        onClick={() => selectValue(opt.value)}
                        className={cn(
                          "w-full text-left px-3 py-2.5 text-sm flex items-center justify-between gap-3",
                          active ? "bg-zinc-900 text-white" : "hover:bg-zinc-50 text-zinc-900"
                        )}
                        role="option"
                        aria-selected={active}
                      >
                        <span className="truncate">{opt.label}</span>
                        {active ? <span className="text-xs opacity-80">✓</span> : null}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </Portal>
        ) : null}
      </div>
    </FormField>
  );
};

/* ---------------------------------- */
/* SearchableSelect (Smart)             */
/* ---------------------------------- */

export interface SearchableSelectItem {
  value: string;
  label: string;
  description?: string;
}

interface SearchableSelectProps extends BaseInputProps {
  value: string | null;
  onSelect: (val: string | null) => void;
  items: SearchableSelectItem[];
  placeholder?: string;
  onCreate?: () => void;
  onEdit?: (val: string) => void;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  value,
  onSelect,
  items,
  placeholder,
  onCreate,
  onEdit,
  error,
  warning,
  required,
  hint,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const anchorRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const position = useDropdownPosition(isOpen, anchorRef);
  const floatStyle = useFloatingStyle(isOpen, anchorRef, position, { widthMode: "anchor" });
  useOutsideClick(isOpen, [anchorRef as any, dropdownRef], () => setIsOpen(false));

  const selected = items.find((i) => i.value === value) || null;

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return items;
    return items.filter((i) => i.label.toLowerCase().includes(s) || (i.description || "").toLowerCase().includes(s));
  }, [items, search]);

  const tone = fieldTone(error, warning);

  const clear = () => {
    onSelect(null);
    setSearch("");
  };

  return (
    <FormField label={label} required={required} error={error} warning={warning} hint={hint}>
      <div className="relative">
        <button
          ref={anchorRef}
          type="button"
          onClick={() => setIsOpen((o) => !o)}
          className={cn(
            baseInputStyles,
            tone.border,
            tone.bg,
            "text-left flex items-center justify-between gap-3 pr-14"
          )}
        >
          <div className="min-w-0">
            <div className={cn("truncate", selected ? "text-zinc-900" : "text-zinc-500")}>
              {selected ? selected.label : placeholder || "Suchen und wählen..."}
            </div>
            {selected?.description ? <div className="text-xs text-zinc-500 truncate mt-0.5">{selected.description}</div> : null}
          </div>
        </button>

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                clear();
              }}
              className="w-8 h-8 rounded-lg hover:bg-zinc-100 text-zinc-600 flex items-center justify-center transition"
              aria-label="Auswahl entfernen"
            >
              ✕
            </button>
          ) : null}
        </div>

        {isOpen && floatStyle ? (
          <Portal>
            <div
              ref={dropdownRef}
              className="z-[9999] rounded-2xl border border-zinc-200 bg-white shadow-xl overflow-hidden"
              style={floatStyle}
            >
              <div className="p-2 border-b border-zinc-100 space-y-2">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Suchen..."
                  className="w-full h-10 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                  autoFocus
                />

                {(onCreate || (selected && onEdit)) ? (
                  <div className="flex gap-2">
                    {onCreate ? (
                      <button
                        type="button"
                        onClick={() => {
                          setIsOpen(false);
                          setSearch("");
                          onCreate();
                        }}
                        className="flex-1 h-10 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-800 transition flex items-center justify-center gap-2"
                      >
                        <span>＋</span> Neu
                      </button>
                    ) : null}

                    {selected && onEdit ? (
                      <button
                        type="button"
                        onClick={() => {
                          setIsOpen(false);
                          setSearch("");
                          onEdit(selected.value);
                        }}
                        className="flex-1 h-10 rounded-xl bg-white border border-zinc-200 text-sm font-semibold hover:bg-zinc-50 transition flex items-center justify-center gap-2"
                      >
                        <span>✏️</span> Bearbeiten
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="max-h-64 overflow-auto py-1">
                {filtered.length === 0 ? (
                  <div className="px-3 py-3 text-sm text-zinc-500">Keine Treffer</div>
                ) : (
                  filtered.map((it) => {
                    const active = it.value === value;
                    return (
                      <button
                        key={it.value}
                        type="button"
                        onClick={() => {
                          onSelect(it.value);
                          setIsOpen(false);
                          setSearch("");
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2.5 text-sm hover:bg-zinc-50 flex items-start justify-between gap-3",
                          active ? "bg-zinc-900 text-white hover:bg-zinc-900" : "text-zinc-900"
                        )}
                      >
                        <div className="min-w-0">
                          <div className="truncate">{it.label}</div>
                          {it.description ? (
                            <div className={cn("text-xs truncate mt-0.5", active ? "text-white/80" : "text-zinc-500")}>
                              {it.description}
                            </div>
                          ) : null}
                        </div>
                        {active ? <span className="text-xs opacity-80">✓</span> : null}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </Portal>
        ) : null}
      </div>
    </FormField>
  );
};

/* ---------------------------------- */
/* PhoneInput (Country + Number)        */
/* ---------------------------------- */

type Country = { code: string; dial: string; name: string; flag: string };

const COUNTRIES: Country[] = [
  { code: "CH", dial: "+41", name: "Schweiz", flag: "🇨🇭" },
  { code: "DE", dial: "+49", name: "Deutschland", flag: "🇩🇪" },
  { code: "AT", dial: "+43", name: "Österreich", flag: "🇦🇹" },
  { code: "FR", dial: "+33", name: "Frankreich", flag: "🇫🇷" },
  { code: "IT", dial: "+39", name: "Italien", flag: "🇮🇹" },
  { code: "GB", dial: "+44", name: "Vereinigtes Königreich", flag: "🇬🇧" },
  { code: "US", dial: "+1", name: "USA", flag: "🇺🇸" },
];

interface PhoneInputProps extends BaseInputProps {
  value: string;
  onChange: (val: string) => void;
  defaultCountryCode?: string;
  placeholder?: string;
  onCall?: (e164: string) => void;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  label,
  value,
  onChange,
  defaultCountryCode = "CH",
  placeholder,
  error,
  warning,
  required,
  hint,
  onCall,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const countryBtnRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const position = useDropdownPosition(isOpen, countryBtnRef);
  const floatStyle = useFloatingStyle(isOpen, countryBtnRef, position, { widthMode: "fixed", fixedWidth: 340 });
  useOutsideClick(isOpen, [countryBtnRef as any, dropdownRef], () => setIsOpen(false));

  const initial = COUNTRIES.find((c) => c.code === defaultCountryCode) || COUNTRIES[0];
  const [country, setCountry] = useState<Country>(initial);

  useEffect(() => {
    if (!value?.startsWith("+")) return;
    const match = COUNTRIES.find((c) => value.startsWith(c.dial + " "));
    if (match && match.code !== country.code) setCountry(match);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const tone = fieldTone(error, warning);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return COUNTRIES;
    return COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(s) || c.code.toLowerCase().includes(s) || c.dial.includes(s)
    );
  }, [search]);

  const numberOnly = useMemo(() => {
    const prefix = country.dial + " ";
    if (value.startsWith(prefix)) return value.slice(prefix.length);
    return value.startsWith(country.dial) ? value.slice(country.dial.length).trimStart() : value;
  }, [value, country]);

  const setNumber = (num: string) => {
    const next = `${country.dial} ${num}`.trim();
    onChange(next);
  };

  const toE164 = (val: string) => val.replace(/[^\d+]/g, "");
  const canCall = Boolean(toE164(value).replace("+", "").length >= 6);

  return (
    <FormField label={label} required={required} error={error} warning={warning} hint={hint}>
      <div className="relative w-full">
        <div className="flex gap-0">
          <button
            ref={countryBtnRef}
            type="button"
            onClick={() => setIsOpen((o) => !o)}
            className={cn(
              "min-h-[48px] px-3 rounded-l-xl border border-r-0 bg-zinc-50 shadow-sm flex items-center gap-2 text-sm",
              tone.border,
              "focus:outline-none focus:ring-2",
              "hover:bg-zinc-100 transition"
            )}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
          >
            <span className="text-zinc-700 font-semibold">{country.dial}</span>
            <span className="text-zinc-500 text-lg">{isOpen ? "▴" : "▾"}</span>
          </button>

          <div className="relative flex-1">
            <input
              value={numberOnly}
              onChange={(e) => setNumber(e.target.value)}
              placeholder={placeholder || "79 123 45 67"}
              className={cn(
                "w-full min-h-[48px] rounded-r-xl border bg-zinc-50 px-4 py-3 text-sm shadow-sm transition focus:outline-none focus:ring-2",
                canCall ? "pr-14" : "pr-4",
                tone.border,
                tone.bg
              )}
            />

            {numberOnly && canCall && (
                <div className="absolute right-0 top-0 bottom-0 flex items-center border-l border-zinc-200">
                    <button
                        type="button"
                        onClick={() => {
                            const e164 = toE164(value);
                            if (!e164) return;
                            if (onCall) onCall(e164);
                            else window.location.href = `tel:${e164}`;
                        }}
                        className="w-12 h-full flex items-center justify-center text-zinc-500 hover:text-black hover:bg-zinc-100 transition-colors rounded-r-xl"
                        aria-label="Anrufen"
                        title="Anrufen"
                    >
                        📞
                    </button>
                </div>
            )}
          </div>
        </div>

        {isOpen && floatStyle ? (
          <Portal>
            <div
              ref={dropdownRef}
              className="z-[9999] rounded-2xl border border-zinc-200 bg-white shadow-xl overflow-hidden"
              style={floatStyle}
            >
              <div className="p-2 border-b border-zinc-100">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Land suchen..."
                  className="w-full h-10 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                  autoFocus
                />
              </div>

              <div className="max-h-64 overflow-auto py-1">
                {filtered.map((c) => {
                  const active = c.code === country.code;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => {
                        setCountry(c);
                        setIsOpen(false);
                        setSearch("");
                        const num = numberOnly;
                        onChange(`${c.dial} ${num}`.trim());
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2.5 text-sm flex items-center justify-between gap-3",
                        active ? "bg-zinc-900 text-white" : "hover:bg-zinc-50 text-zinc-900"
                      )}
                      role="option"
                      aria-selected={active}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold w-10">{c.dial}</span>
                        <span className="text-zinc-300">|</span>
                        <span className={cn("truncate font-medium", active ? "text-white/90" : "text-zinc-700")}>{c.name}</span>
                        <span className={cn("text-xs", active ? "text-white/70" : "text-zinc-400")}>({c.code})</span>
                      </div>
                      {active ? <span className="text-xs opacity-80">✓</span> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </Portal>
        ) : null}
      </div>
    </FormField>
  );
};

/* ---------------------------------- */
/* RadioGroup                           */
/* ---------------------------------- */

interface RadioOption {
  value: string;
  label: string;
  description?: string;
}

interface RadioGroupProps extends BaseInputProps {
  value: string;
  onChange: (val: string) => void;
  options: RadioOption[];
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  label,
  value,
  onChange,
  options,
  error,
  warning,
  required,
  hint,
}) => {
  return (
    <FormField label={label} required={required} error={error} warning={warning} hint={hint}>
      <div className="space-y-2">
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                "w-full text-left rounded-xl border border-zinc-200 px-4 py-3 transition shadow-sm bg-zinc-50 hover:bg-zinc-100",
                // No border color change on active, only the radio dot
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-5 h-5 rounded-full border flex items-center justify-center flex-none",
                    active ? "border-zinc-900" : "border-zinc-300"
                  )}
                >
                  {active ? <div className="w-2.5 h-2.5 rounded-full bg-zinc-900" /> : null}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-zinc-900 text-sm">{opt.label}</div>
                  {opt.description ? <div className="text-xs mt-0.5 text-zinc-500">{opt.description}</div> : null}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </FormField>
  );
};

/* ---------------------------------- */
/* SegmentedControl                     */
/* ---------------------------------- */

interface SegmentOption {
  value: string;
  label: string;
}

interface SegmentedControlProps extends BaseInputProps {
  value: string;
  onChange: (val: string) => void;
  options: SegmentOption[];
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({ label, value, onChange, options, hint }) => {
  return (
    <FormField label={label} hint={hint}>
      <div className="w-full">
        <div className="inline-flex rounded-2xl border border-zinc-200 bg-white p-1 shadow-sm justify-start">
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange(opt.value)}
                className={cn(
                  "h-9 px-3 rounded-xl text-sm font-semibold transition text-left",
                  active ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-50"
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </FormField>
  );
};

/* ---------------------------------- */
/* MultiSelect (Tags)                   */
/* ---------------------------------- */

interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps extends BaseInputProps {
  value: string[];
  onChange: (vals: string[]) => void;
  options: MultiSelectOption[];
  placeholder?: string;
  maxBadgesInField?: number;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
  warning,
  required,
  hint,
  maxBadgesInField = 2,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const anchorRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const position = useDropdownPosition(isOpen, anchorRef);
  const floatStyle = useFloatingStyle(isOpen, anchorRef, position, { widthMode: "anchor" });
  useOutsideClick(isOpen, [anchorRef as any, dropdownRef], () => setIsOpen(false));

  const tone = fieldTone(error, warning);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return options;
    return options.filter((o) => o.label.toLowerCase().includes(s));
  }, [options, search]);

  const toggle = (v: string) => {
    if (value.includes(v)) onChange(value.filter((x) => x !== v));
    else onChange([...value, v]);
  };

  const selectedLabels = useMemo(
    () => value.map((v) => ({ v, label: options.find((o) => o.value === v)?.label || v })),
    [value, options]
  );

  const shown = selectedLabels.slice(0, maxBadgesInField);
  const rest = Math.max(0, selectedLabels.length - shown.length);

  return (
    <FormField label={label} required={required} error={error} warning={warning} hint={hint}>
      <div className="relative">
        <button
          ref={anchorRef}
          type="button"
          onClick={() => setIsOpen((o) => !o)}
          className={cn(baseInputStyles, tone.border, tone.bg, "text-left flex items-center justify-between gap-3")}
        >
          <div className="min-w-0 flex-1 flex items-center gap-2 overflow-hidden">
            {value.length === 0 ? (
              <span className="text-zinc-500 truncate">{placeholder || "Auswahl..."}</span>
            ) : (
              <>
                {shown.map((it) => (
                  <span
                    key={it.v}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 text-zinc-800 text-sm flex-none"
                    title={it.label}
                  >
                    <span className="truncate max-w-[160px]">{it.label}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggle(it.v);
                      }}
                      className="w-5 h-5 rounded-full hover:bg-zinc-200 flex items-center justify-center"
                      aria-label="Entfernen"
                    >
                      ✕
                    </button>
                  </span>
                ))}
                {rest > 0 ? (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-zinc-100 text-zinc-800 text-sm flex-none">
                    + {rest}
                  </span>
                ) : null}
              </>
            )}
          </div>
          <span className="text-zinc-500 text-lg flex-none">{isOpen ? "▴" : "▾"}</span>
        </button>

        {isOpen && floatStyle ? (
          <Portal>
            <div
              ref={dropdownRef}
              className="z-[9999] rounded-2xl border border-zinc-200 bg-white shadow-xl overflow-hidden"
              style={floatStyle}
            >
              <div className="p-2 border-b border-zinc-100">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Suchen..."
                  className="w-full h-10 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                  autoFocus
                />
              </div>

              <div className="max-h-64 overflow-auto py-1">
                {filtered.length === 0 ? (
                  <div className="px-3 py-3 text-sm text-zinc-500">Keine Treffer</div>
                ) : (
                  filtered.map((opt) => {
                    const active = value.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggle(opt.value)}
                        className={cn(
                          "w-full text-left px-3 py-2.5 text-sm flex items-center justify-between gap-3",
                          active ? "bg-zinc-900 text-white" : "hover:bg-zinc-50 text-zinc-900"
                        )}
                      >
                        <span className="truncate">{opt.label}</span>
                        <span className="text-xs opacity-80">{active ? "✓" : ""}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </Portal>
        ) : null}
      </div>
    </FormField>
  );
};

/* ---------------------------------- */
/* FileUploadZone                       */
/* ---------------------------------- */

interface FileUploadZoneProps extends BaseInputProps {
  onFileSelect: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  label,
  onFileSelect,
  accept,
  multiple = true,
  hint,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const pickFiles = () => inputRef.current?.click();
  const pickCamera = () => cameraInputRef.current?.click();

  const handleFiles = (list: FileList | null) => {
    if (!list) return;
    onFileSelect(Array.from(list));
  };

  return (
    <FormField label={label} hint={hint}>
      {/* Desktop / Standard View */}
      <div
        className={cn(
          "hidden md:block relative border-2 border-dashed rounded-2xl p-6 text-center transition cursor-pointer",
          isDragging ? "border-zinc-900 bg-zinc-50" : "border-zinc-300 bg-white hover:bg-zinc-50"
        )}
        onClick={pickFiles}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <div className="text-3xl mb-2 text-zinc-400">☁️</div>
        <div className="font-semibold text-zinc-900">Dateien hier ablegen</div>
        <div className="text-sm text-zinc-500 mt-1">oder klicken zum Auswählen</div>
        {accept && <div className="text-[10px] uppercase font-bold text-zinc-400 mt-3 tracking-wider">Erlaubt: {accept}</div>}
      </div>

      {/* Mobile / Abstract View (Updated Style) */}
      <div className="md:hidden relative border-2 border-dashed border-zinc-300 bg-zinc-50 rounded-2xl p-6 text-center">
          <div className="mb-4">
              <div className="font-semibold text-zinc-900 text-sm">Datei hier ablegen</div>
              {accept && <div className="text-[10px] uppercase font-bold text-zinc-400 mt-1 tracking-wider">{accept}</div>}
          </div>
          <div className="flex justify-center gap-4">
              <button 
                type="button"
                onClick={pickFiles} 
                className="w-14 h-14 rounded-full bg-white border border-zinc-200 shadow-sm flex items-center justify-center text-xl text-zinc-600 active:scale-95 transition-transform"
              >
                  📂
              </button>
              <button 
                type="button"
                onClick={pickCamera} 
                className="w-14 h-14 rounded-full bg-white border border-zinc-200 shadow-sm flex items-center justify-center text-xl text-zinc-600 active:scale-95 transition-transform"
              >
                  📷
              </button>
          </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </FormField>
  );
};
