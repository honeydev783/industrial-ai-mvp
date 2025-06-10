import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

export default function Phase2() {
  return (
    <div className="space-y-8">
      <Card className="p-12 text-center">
        <CardContent className="pt-6">
          <Construction className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Phase 2 Coming Soon</h2>
          <p className="text-muted-foreground">
            Advanced features will be available in the next phase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
