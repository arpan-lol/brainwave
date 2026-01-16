import { useState } from "react";
import { fabric } from "fabric";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Sparkles } from "lucide-react";
import { DesignOption } from "@/services/designAPI";
import { ScrollArea } from "@/components/ui/scroll-area";

interface OptionSelectorProps {
  options: DesignOption[];
  onSelect: (optionIndex: number) => void;
  onCancel?: () => void;
  isOpen: boolean;
  canvas?: fabric.Canvas;
}

export function OptionSelector({ options, onSelect, onCancel, isOpen }: OptionSelectorProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleSelect = (index: number) => {
    setSelectedIndex(index);
  };

  const handleConfirm = () => {
    if (selectedIndex !== null) {
      onSelect(selectedIndex);
      setSelectedIndex(null);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "bg-green-500";
    if (confidence >= 0.6) return "bg-yellow-500";
    return "bg-orange-500";
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return "High Confidence";
    if (confidence >= 0.6) return "Medium Confidence";
    return "Low Confidence";
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel?.()}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Select a Design Option
          </DialogTitle>
          <DialogDescription>
            The AI has generated {options.length} design options. Review each option and select the one that best fits your needs.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-200px)] pr-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
            {options.map((option, index) => (
              <Card
                key={option.id}
                className={`cursor-pointer transition-all ${
                  selectedIndex === index
                    ? "ring-2 ring-primary shadow-lg"
                    : "hover:shadow-md"
                }`}
                onClick={() => handleSelect(index)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">
                      Option {index + 1}
                    </CardTitle>
                    {selectedIndex === index && (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <div className={`h-2 w-2 rounded-full ${getConfidenceColor(option.confidence)}`} />
                    <span className="text-xs text-muted-foreground">
                      {getConfidenceLabel(option.confidence)}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="bg-muted rounded-lg p-4 min-h-[150px] flex items-center justify-center">
                    <div className="text-xs text-center text-muted-foreground">
                      <div className="font-medium mb-1">
                        {option.elements.length} elements
                      </div>
                      <div className="space-y-1">
                        {option.modifications.slice(0, 3).map((mod, i) => (
                          <div key={i} className="truncate">• {mod}</div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-medium">Compliance Notes:</div>
                    <p className="text-xs text-muted-foreground line-clamp-3">
                      {option.complianceReasoning}
                    </p>
                  </div>

                  {option.modifications.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {option.modifications.slice(0, 2).map((mod, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {mod.split(' ').slice(0, 3).join(' ')}
                        </Badge>
                      ))}
                      {option.modifications.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{option.modifications.length - 2} more
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>

                <CardFooter className="pt-3">
                  <div className="w-full">
                    <div className="text-xs text-muted-foreground mb-2">
                      Confidence Score
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${getConfidenceColor(option.confidence)}`}
                        style={{ width: `${option.confidence * 100}%` }}
                      />
                    </div>
                    <div className="text-xs text-right mt-1 text-muted-foreground">
                      {Math.round(option.confidence * 100)}%
                    </div>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedIndex === null}
          >
            Apply Selected Option
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
