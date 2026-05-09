import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Box, Frame } from "lucide-react";

export type ViewMode = "3d" | "classic";

interface ViewModeToggleProps {
  value: ViewMode;
  onValueChange: (value: ViewMode) => void;
  className?: string;
}

export function ViewModeToggle({ value, onValueChange, className }: ViewModeToggleProps) {
  return (
    <Tabs value={value} onValueChange={(v) => onValueChange(v as ViewMode)} className={className}>
      <TabsList>
        <TabsTrigger value="classic" className="gap-1" data-testid="tab-2d-view">
          <Frame className="h-4 w-4" />
          2D
        </TabsTrigger>
        <TabsTrigger value="3d" className="gap-1" data-testid="tab-3d-view">
          <Box className="h-4 w-4" />
          3D
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
