'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import MenuSelezione from "@/components/MenuSelezione";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import Link from "next/link";

const tipiEvento = [
  "Matrimonio",
  "Compleanno 18 Anni",
  "Compleanno",
  "Comunione",
  "Festa Privata/Aziendale",
  "Anniversario",
  "Evento Culturale",
  "Battesimo"
];

const statiEvento = [
  { label: "🟡 In attesa", value: "in_attesa" },
  { label: "🟢 Confermato", value: "confermato" },
  { label: "🔴 Annullato", value: "annullato" }
];

export default function NuovoEventoPage() {
  const router = useRouter();
  const [clienti, setClienti] = useState<any[]>([{
    visibile: true,
    nome: "",
    cognome: "",
    email: "",
    telefono: "",
    indirizzo: ""
  }]);
  const [tuttiClienti, setTuttiClienti] = useState<any[]>([]);

  const [evento, setEvento] = useState({
    tipo: "",
    titolo: "",
    dateProposte: [],
    dataConfermata: "",
    fascia: "pranzo",
    personePreviste: "",
    note: "",
    stato: "in_attesa"
  });

  useEffect(() => {
    fetch("/api/clienti")
      .then(res => res.json())
      .then(setTuttiClienti);
  }, []);

  const aggiornaCliente = (campo: string, valore: string) => {
    const nuovo = { ...clienti[0], [campo]: valore };
    setClienti([{ ...nuovo }]);
  };

  const aggiungiDataProposta = () => {
    const nuova = prompt("Inserisci data proposta (YYYY-MM-DD)");
    if (nuova && !evento.dateProposte.includes(nuova)) {
      setEvento({ ...evento, dateProposte: [...evento.dateProposte, nuova] });
    }
  };

  const toggleDataDaCalendario = (arg: any) => {
    const data = arg.dateStr;
    const nuove = evento.dateProposte.includes(data)
      ? evento.dateProposte.filter(d => d !== data)
      : [...evento.dateProposte, data];
    setEvento({ ...evento, dateProposte: nuove });
  };

  const rimuoviData = (data: string) => {
    setEvento({
      ...evento,
      dateProposte: evento.dateProposte.filter(d => d !== data),
      dataConfermata: evento.dataConfermata === data ? "" : evento.dataConfermata
    });
  };

  const confermaEvento = async () => {
    const cliente = clienti[0];
    if (!cliente?.email || !cliente?.nome) {
      alert("⚠️ Inserisci almeno nome ed email del cliente.");
      return;
    }
    const payload = {
      ...evento,
      clienti: [{
        nome: cliente.nome,
        cognome: cliente.cognome,
        email: cliente.email,
        telefono: cliente.telefono,
        indirizzo: cliente.indirizzo
      }],
      personePreviste: parseInt(evento.personePreviste || "0")
    };
    await fetch("/api/eventi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    alert("✅ Evento salvato!");
    router.push("/calendario");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">➕ Nuovo Evento</h1>
        <Button variant="outline" onClick={() => router.push('/calendario')}>← Torna al Calendario</Button>
      </div>

      <Card>
        <CardContent className="space-y-6 p-4">
          <h2 className="text-xl font-bold">👥 Cliente</h2>
          <div className="space-y-2 border rounded p-4">
            <Input placeholder="Nome" value={clienti[0].nome} onChange={(e) => aggiornaCliente("nome", e.target.value)} />
            <Input placeholder="Cognome" value={clienti[0].cognome} onChange={(e) => aggiornaCliente("cognome", e.target.value)} />
            <Input placeholder="Email" value={clienti[0].email} onChange={(e) => aggiornaCliente("email", e.target.value)} />
            <Input placeholder="Telefono" value={clienti[0].telefono} onChange={(e) => aggiornaCliente("telefono", e.target.value)} />
            <Input placeholder="Indirizzo" value={clienti[0].indirizzo} onChange={(e) => aggiornaCliente("indirizzo", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-4">
          <h2 className="text-xl font-bold">📋 Dati Evento</h2>
          <Input placeholder="Titolo evento" value={evento.titolo} onChange={(e) => setEvento({ ...evento, titolo: e.target.value })} />
          <select className="border px-3 py-1 rounded w-full" value={evento.tipo} onChange={(e) => setEvento({ ...evento, tipo: e.target.value })}>
            <option value="">-- Seleziona tipo evento --</option>
            {tipiEvento.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <select className="border px-3 py-1 rounded w-full" value={evento.fascia} onChange={(e) => setEvento({ ...evento, fascia: e.target.value })}>
            <option value="pranzo">🍽️ Pranzo</option>
            <option value="cena">🌙 Cena</option>
          </select>

          <Input placeholder="Numero di invitati" type="number" value={evento.personePreviste} onChange={(e) => setEvento({ ...evento, personePreviste: e.target.value })} />

          <div className="space-y-2">
            <label className="font-medium">Date proposte</label>
            <ul className="list-disc pl-5">
              {evento.dateProposte.map((d, i) => (
                <li key={i} className="flex justify-between items-center">
                  <span>{d}</span>
                  <Button variant="ghost" size="sm" onClick={() => rimuoviData(d)}>❌</Button>
                </li>
              ))}
            </ul>
            <div className="flex gap-4 items-center">
              <Button onClick={aggiungiDataProposta}>+ Aggiungi manualmente</Button>
              <span className="text-sm text-gray-600">oppure clicca sul calendario</span>
            </div>
            <FullCalendar
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              locale="it"
              dateClick={toggleDataDaCalendario}
              height="auto"
              events={evento.dateProposte.map(d => ({ date: d, title: "Data proposta" }))}
            />
          </div>

          <div className="space-y-2">
            <label className="font-medium">Data confermata</label>
            <select className="border px-3 py-1 rounded w-full" value={evento.dataConfermata} onChange={(e) => setEvento({ ...evento, dataConfermata: e.target.value })}>
              <option value="">-- Nessuna --</option>
              {evento.dateProposte.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="font-medium">Stato Evento</label>
            <select className="border px-3 py-1 rounded w-full" value={evento.stato} onChange={(e) => setEvento({ ...evento, stato: e.target.value })}>
              {statiEvento.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          <Textarea placeholder="Note sull'evento" value={evento.note} onChange={(e) => setEvento({ ...evento, note: e.target.value })} />

          <div className="flex gap-2">
            <Button onClick={confermaEvento}>💾 Salva</Button>
            {evento.dataConfermata && <Button variant="outline">🍽 Vai al menù</Button>}
          </div>
        </CardContent>
      </Card>

      {evento.dataConfermata && <MenuSelezione onBack={() => {}} onSubmit={confermaEvento} />}
    </div>
  );
}
