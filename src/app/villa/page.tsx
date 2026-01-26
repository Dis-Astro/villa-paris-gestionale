"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CalendarDays, User, ClipboardList, FileText, Star } from "lucide-react";

export default function MenuVillaParisApp() {
  const cards = [
    {
      icon: <CalendarDays className="w-6 h-6" />,
      title: "Calendario Eventi",
      href: "/calendario",
      description: "Visualizza gli eventi confermati e le date occupate."
    },
    {
      icon: <ClipboardList className="w-6 h-6" />,
      title: "Nuovo Evento",
      href: "/nuovo-evento",
      description: "Crea un nuovo evento e inserisci i dettagli del cliente."
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: "Carica Menù",
      href: "/admin/menu",
      description: "Carica il file Excel con portate e servizi personalizzati."
    },
    {
      icon: <Star className="w-6 h-6" />,
      title: "Gestione Menù",
      href: "/gestione-menu",
      description: "Gestisci e richiama i tuoi menù preferiti."
    },
    {
      icon: <User className="w-6 h-6" />,
      title: "Clienti",
      href: "/clienti",
      description: "Consulta l'elenco clienti e i relativi eventi."
    }
  ];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">🎯 Villa Paris — Pannello Operativo</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {cards.map((card, i) => (
          <Link key={i} href={card.href} className="hover:shadow-lg transition">
            <Card className="h-full">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-3">
                  {card.icon}
                  <h2 className="font-bold text-lg">{card.title}</h2>
                </div>
                <p className="text-sm text-muted-foreground">{card.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
