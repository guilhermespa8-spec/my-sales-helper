import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
  wrapperClassName?: string;
}

export const SearchInput = ({ className, onClear, wrapperClassName, ...props }: SearchInputProps) => {
  return (
    <div className={cn("relative flex items-center", wrapperClassName)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <Input
        className={cn("pl-9 pr-9 h-10 bg-background", className)}
        {...props}
      />
      {props.value && onClear && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
          onClick={onClear}
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
};
