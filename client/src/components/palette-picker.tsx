import { Palette as PaletteIcon, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTheme, palettes } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

export function PalettePicker() {
  const { palette, setPalette } = useTheme();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          data-testid="button-palette-picker"
        >
          <PaletteIcon className="h-5 w-5" />
          <span className="sr-only">Choose color palette</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="end">
        <p className="text-sm font-medium px-2 py-1.5 text-muted-foreground">Color Palette</p>
        <div className="max-h-72 overflow-y-auto">
          {palettes.map((p) => (
            <button
              key={p.id}
              onClick={() => setPalette(p.id)}
              className={cn(
                "flex items-center gap-3 w-full px-2 py-1.5 rounded-md text-sm transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                palette === p.id && "bg-accent text-accent-foreground"
              )}
            >
              <span
                className="w-5 h-5 rounded-full shrink-0 border border-border"
                style={{ backgroundColor: p.color }}
              />
              <span className="flex-1 text-left">{p.label}</span>
              {palette === p.id && (
                <Check className="h-4 w-4 shrink-0" />
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
