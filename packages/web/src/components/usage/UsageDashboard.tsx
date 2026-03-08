import { useUsageStats } from "../../api/usage";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export function UsageDashboard() {
  const { data: stats, isLoading } = useUsageStats();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const summaryCards = [
    { label: "Total Tokens", value: formatNumber(stats.totalTokens) },
    { label: "Analyses", value: formatNumber(stats.totalAnalyses) },
    { label: "Renovations", value: formatNumber(stats.totalRenovations) },
    { label: "Journey Images", value: formatNumber(stats.totalJourneyImages) },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className="text-2xl font-bold mt-1">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {stats.byModel.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Usage by Model</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">API Calls</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.byModel
                  .sort((a, b) => b.tokens - a.tokens)
                  .map((row) => (
                    <TableRow key={row.model}>
                      <TableCell className="font-mono text-sm">
                        {row.model}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(row.count)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(row.tokens)}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
