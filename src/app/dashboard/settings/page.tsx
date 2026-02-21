"use client";

import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Settings, Store, Shield, Database } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  return (
    <div>
      <Header title="Paramètres" />
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Paramètres</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configuration du dashboard
          </p>
        </div>

        {/* Store info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Store className="h-4 w-4" />
              Boutique
            </CardTitle>
            <CardDescription>Informations de votre boutique</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                URL de la boutique
              </label>
              <Input
                defaultValue="https://oldastudio.up.railway.app"
                readOnly
                className="font-mono text-sm bg-muted/50"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Nom de la boutique
              </label>
              <Input defaultValue="OLDA Studio" />
            </div>
            <Button
              size="sm"
              onClick={() => toast.success("Paramètres sauvegardés")}
            >
              Enregistrer
            </Button>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Sécurité Webhook
            </CardTitle>
            <CardDescription>
              Secret partagé pour authentifier les requêtes entrantes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                WEBHOOK_SECRET (variable d&apos;environnement)
              </label>
              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder="Défini via Railway Environment Variables"
                  readOnly
                  className="bg-muted/50"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Définissez cette variable dans Railway → Service → Variables
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Database */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4" />
              Base de données
            </CardTitle>
            <CardDescription>
              PostgreSQL géré via Railway
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl bg-muted/50 p-4 font-mono text-xs space-y-2">
              <p className="text-muted-foreground"># Variable d&apos;environnement requise</p>
              <p>DATABASE_URL=postgresql://user:pass@host:5432/db</p>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Railway génère automatiquement cette URL quand vous ajoutez un service PostgreSQL.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
