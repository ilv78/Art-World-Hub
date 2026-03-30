import { useTheme, ACCENT_COLORS, type Accent } from "@/components/theme-provider";

const accents: { id: Accent; label: string }[] = [
  { id: "orange", label: "Orange accent" },
  { id: "amber", label: "Amber accent" },
];

export function PaletteSwitcher() {
  const { accent, setAccent } = useTheme();

  return (
    <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Accent color">
      {accents.map(({ id, label }) => (
        <button
          key={id}
          role="radio"
          aria-checked={accent === id}
          aria-label={label}
          title={label}
          onClick={() => setAccent(id)}
          className="relative rounded-full transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span
            className="block h-4 w-4 rounded-full"
            style={{ backgroundColor: ACCENT_COLORS[id] }}
          />
          {accent === id && (
            <span
              className="absolute inset-[-3px] rounded-full border-2"
              style={{ borderColor: ACCENT_COLORS[id] }}
            />
          )}
        </button>
      ))}
    </div>
  );
}
