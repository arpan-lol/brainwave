import { useState } from "react";
import { fabric } from "fabric";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Send } from "lucide-react";
import { useDesignRequest } from "@/features/ai/api/use-design";
import { designAPI, Platform } from "@/services/designAPI";
import { OptionSelector } from "@/components/option-selector";
import { toast } from "sonner";

interface DesignChatProps {
  canvas: fabric.Canvas | null;
  platform: Platform;
  onPlatformChange?: (platform: Platform) => void;
}

export function DesignChat({ canvas, platform, onPlatformChange }: DesignChatProps) {
  const [input, setInput] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const [designOptions, setDesignOptions] = useState<any[]>([]);
  const [loadingStage, setLoadingStage] = useState<string | null>(null);

  const designMutation = useDesignRequest();

  const handleSubmit = async () => {
    if (!input.trim() || !canvas) {
      toast.error("Please enter a request");
      return;
    }

    const canvasState = designAPI.fabricCanvasToState(canvas);

    setLoadingStage("Analyzing request...");
    
    try {
      const response = await designMutation.mutateAsync({
        canvasState,
        userRequest: input,
        platform,
      });

      if (response.success) {
        if (response.data.creative) {
          setLoadingStage("Creating design options...");
          
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          if (response.data.creative.requiresHITL) {
            setDesignOptions(response.data.creative.designOptions);
            setShowOptions(true);
            setLoadingStage(null);
          } else {
            setLoadingStage("Applying design...");
            const bestOption = response.data.creative.designOptions[0];
            if (bestOption) {
              designAPI.applyElementsToCanvas(canvas, bestOption.elements);
              toast.success("Design applied successfully!");
            }
            setLoadingStage(null);
          }
        } else if (response.data.validation) {
          setLoadingStage(null);
        }
      }
      
      setInput("");
    } catch (error) {
      setLoadingStage(null);
      console.error("Design request failed:", error);
    }
  };

  const handleSelectOption = (optionIndex: number) => {
    const selectedOption = designOptions[optionIndex];
    if (selectedOption && canvas) {
      designAPI.applyElementsToCanvas(canvas, selectedOption.elements);
      toast.success("Design option applied!");
    }
    setShowOptions(false);
    setDesignOptions([]);
  };

  const exampleRequests = [
    "Add a 50% OFF badge in the top right corner",
    "Generate a compelling headline for this product",
    "Validate this design for Amazon compliance",
    "Remove the background from the product image",
    "Fix all compliance issues",
    "Add a promotional banner at the bottom",
  ];

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Design Assistant
              </CardTitle>
              <CardDescription>
                Describe what you want to do in natural language
              </CardDescription>
            </div>
            <Select value={platform} onValueChange={onPlatformChange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="amazon">Amazon</SelectItem>
                <SelectItem value="walmart">Walmart</SelectItem>
                <SelectItem value="flipkart">Flipkart</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Textarea
              placeholder="Tell me what you want to do... (e.g., 'Add a 50% OFF badge in the top right')"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              className="min-h-[100px] resize-none"
              disabled={designMutation.isPending}
            />
            
            <div className="flex items-center justify-between">
              <div className="flex-1">
                {loadingStage && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {loadingStage}
                  </div>
                )}
              </div>
              
              <Button
                onClick={handleSubmit}
                disabled={!input.trim() || designMutation.isPending}
                size="sm"
              >
                {designMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">
              Example requests:
            </div>
            <div className="flex flex-wrap gap-2">
              {exampleRequests.map((example, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="text-xs h-auto py-1 px-2"
                  onClick={() => setInput(example)}
                  disabled={designMutation.isPending}
                >
                  {example}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <OptionSelector
        options={designOptions}
        onSelect={handleSelectOption}
        onCancel={() => {
          setShowOptions(false);
          setDesignOptions([]);
        }}
        isOpen={showOptions}
        canvas={canvas || undefined}
      />
    </>
  );
}
