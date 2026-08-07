"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Settings2 } from "lucide-react";
import { PipelineStepsDetail } from "./pipeline-indicator";
import type { PipelineStep } from "@/types/extractor";

const SUPPORTED_SITES = [
  "shadcn/ui",
  "Vercel",
  "Ant Design",
  "Linear",
  "Pinterest",
  "GitHub",
  "Stripe",
];

export function ExtractSidebar({ steps }: { steps: PipelineStep[] }) {
  return (
    <div className="space-y-4">
      <Card className="bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Settings2 className="text-muted-foreground h-4 w-4" />
            <CardTitle className="text-sm">Pipeline Progress</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <PipelineStepsDetail steps={steps} />
        </CardContent>
      </Card>

      <Card className="bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Supported Sites</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5">
            {SUPPORTED_SITES.map((site) => (
              <Badge key={site} variant="secondary" className="text-[10px]">
                {site}
              </Badge>
            ))}
          </div>
          <p className="text-muted-foreground mt-3 text-[11px]">
            Public sites work out of the box. Auth-required sites show login walls.
          </p>
        </CardContent>
      </Card>

      <Card className="from-primary/5 to-primary/10 border-primary/20 bg-gradient-to-br">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
              <ArrowRight className="text-primary h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium">MCP Integration</p>
              <p className="text-muted-foreground mt-0.5 text-[11px]">
                Connect to Cursor, Claude, or Windsurf via MCP server for AI agent integration.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
