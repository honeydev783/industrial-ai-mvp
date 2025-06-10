import { Card, CardContent } from "@/components/ui/card";
import { Rocket } from "lucide-react";

export default function Phase3() {
  return (
    <div className="space-y-8">
      <Card className="p-12 text-center">
        <CardContent className="pt-6">
          <Rocket className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Phase 3 Coming Soon</h2>
          <p className="text-muted-foreground">
            Advanced analytics and reporting features will be available here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
