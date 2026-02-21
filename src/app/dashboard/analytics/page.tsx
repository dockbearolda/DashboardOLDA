import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { subDays, startOfDay, format } from "date-fns";
import { fr } from "date-fns/locale";
import { TrendingUp, ShoppingBag, Euro, Users, Package } from "lucide-react";

type PrismaOrderRow = {
  total: number;
  paymentStatus: string;
  customerEmail: string;
  items: { name: string; quantity: number; price: number }[];
};

async function getAnalytics() {
  const now = new Date();

  const [rawOrders, chartData] = await Promise.all([
    prisma.order.findMany({ include: { items: true } }),
    Promise.all(
      Array.from({ length: 30 }, (_, i) => {
        const date = subDays(now, 29 - i);
        return prisma.order.aggregate({
          where: {
            createdAt: { gte: startOfDay(date), lt: startOfDay(subDays(date, -1)) },
          },
          _sum: { total: true },
          _count: true,
        }).then((r: { _sum: { total: number | null }; _count: number }) => ({
          date: format(date, "d MMM", { locale: fr }),
          revenue: r._sum.total ?? 0,
          orders: r._count,
        }));
      })
    ),
  ]);

  const allOrders = rawOrders as unknown as PrismaOrderRow[];

  const totalRevenue = allOrders
    .filter((o: PrismaOrderRow) => o.paymentStatus === "PAID")
    .reduce((sum: number, o: PrismaOrderRow) => sum + o.total, 0);

  const avgOrderValue = allOrders.length > 0 ? totalRevenue / allOrders.length : 0;

  const uniqueCustomers = new Set(allOrders.map((o: PrismaOrderRow) => o.customerEmail)).size;

  const topProducts = allOrders
    .flatMap((o: PrismaOrderRow) => o.items)
    .reduce(
      (acc: { name: string; count: number; revenue: number }[], item: { name: string; quantity: number; price: number }) => {
        const existing = acc.find((p: { name: string }) => p.name === item.name);
        if (existing) {
          existing.count += item.quantity;
          existing.revenue += item.price * item.quantity;
        } else {
          acc.push({ name: item.name, count: item.quantity, revenue: item.price * item.quantity });
        }
        return acc;
      },
      []
    )
    .sort((a: { revenue: number }, b: { revenue: number }) => b.revenue - a.revenue)
    .slice(0, 5);

  return { allOrders, chartData, totalRevenue, avgOrderValue, uniqueCustomers, topProducts };
}

export default async function AnalyticsPage() {
  let data;
  try {
    data = await getAnalytics();
  } catch {
    data = { allOrders: [], chartData: [], totalRevenue: 0, avgOrderValue: 0, uniqueCustomers: 0, topProducts: [] };
  }

  return (
    <div>
      <Header title="Analytiques" />
      <div className="p-6 space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytiques</h1>
          <p className="text-sm text-muted-foreground mt-1">Performance et statistiques détaillées</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard title="Revenu total" value={formatCurrency(data.totalRevenue)} icon={Euro} delay={0} />
          <StatsCard title="Commandes" value={data.allOrders.length.toString()} icon={ShoppingBag} delay={0.05} />
          <StatsCard title="Panier moyen" value={formatCurrency(data.avgOrderValue)} icon={TrendingUp} delay={0.1} />
          <StatsCard title="Clients uniques" value={data.uniqueCustomers.toString()} icon={Users} delay={0.15} />
        </div>

        <RevenueChart data={data.chartData} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Produits les plus vendus
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Aucune donnée disponible</p>
            ) : (
              <div className="space-y-4">
                {data.topProducts.map((product: { name: string; count: number; revenue: number }, i: number) => {
                  const maxRevenue = data.topProducts[0]?.revenue || 1;
                  const pct = Math.round((product.revenue / maxRevenue) * 100);
                  return (
                    <div key={product.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}.</span>
                          <span className="font-medium truncate max-w-[240px]">{product.name}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{product.count} vendu{product.count > 1 ? "s" : ""}</span>
                          <span className="font-semibold text-foreground tabular-nums">
                            {formatCurrency(product.revenue)}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-foreground transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
