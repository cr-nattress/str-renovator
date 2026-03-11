import { useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Props {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
  badge?: ReactNode;
  action?: ReactNode;
}

export function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
  badge,
  action,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="flex items-center justify-between">
        <CollapsibleTrigger className="flex items-center gap-2 py-2 hover:text-gray-900 transition-colors text-sm font-medium text-gray-700 group">
          <ChevronRight
            className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
              open ? "rotate-90" : ""
            }`}
          />
          {title}
          {badge}
        </CollapsibleTrigger>
        {action}
      </div>
      <CollapsibleContent className="pl-6 pb-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
