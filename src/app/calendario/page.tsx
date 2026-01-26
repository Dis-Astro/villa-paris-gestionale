'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function CalendarioPage() {
  const router = useRouter();
  const [dataSelezionata, setDataSelezionata] = useState("");
  const [eventi, setEventi] = useState<any[]>([]);
  const [eventiDelGiorno, setEventiDelGiorno] = useState<any[]>([]);
  const [calendarKey, setCalendarKey] = useState(0);
  const [dateNascoste, setDateNascoste] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/eventi")
      .then((res) => res.json())
      .then((data) => {
        const parsed = data.map((evento: any) => {
          // Forza sempre array
          if (!Array.isArray(evento.dateProposte)) {
            evento.dateProposte = []
          }
          return {
            ...evento,
            dataConfermata: evento.dataConfermata?.split("T")[0] || null,
          }
        });
        setEventi(parsed);
      });
  }, [calendarKey]);

  const handleDateClick = (arg: any) => {
    const data = arg.dateStr;
    setDataSelezionata(data);
    setCalendarKey((prev) => prev + 1);
    filtraEventiPerData(data);
  };

  const filtraEventiPerData = (data: string) => {
    const eventiConfermati = eventi.filter((e) => e.dataConfermata === data);
    const eventiOpzionati = eventi.filter((e) => Array.isArray(e.dateProposte) && e.dateProposte.includes(data));
    const combinati = [...eventiConfermati, ...eventiOpzionati.filter(e => !eventiConfermati.includes(e))];
    setEventiDelGiorno(combinati);
  };

  const colorePerTipo = (tipo: string) => {
    switch (tipo) {
      case "Matrimonio": return "#32a852";
      case "Compleanno": return "#f59e0b";
      case "Comunione": return "#3b82f6";
      case "Festa Privata/Aziendale": return "#e11d48";
      default: return "#6b7280";
    }
  };

  const statoEmoji = (stato: string) => {
    switch (stato) {
      case "confermato": return "🟢";
      case "annullato": return "🔴";
      default: return "🟡";
    }
  };

  const eventiCalendario = eventi.flatMap((evento) => {
    if (evento.stato === 'annullato') return []
    const colore = colorePerTipo(evento.tipo);
    const result: any[] = []
    if (evento.dataConfermata && !dateNascoste.includes(evento.dataConfermata)) {
      result.push({ title: evento.titolo, date: evento.dataConfermata, color: colore });
    }
    if (Array.isArray(evento.dateProposte)) {
      result.push(...evento.dateProposte.filter((d: string) => !dateNascoste.includes(d)).map((d: string) => ({
        title: evento.titolo,
        date: d,
        color: colore,
      })));
    }
    return result;
  });

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">📅 Calendario Eventi</h1>

      <div className="flex items-center gap-4">
        <label className="font-medium">Vai a data:</label>
        <input
          type="date"
          className="border rounded px-3 py-1"
          value={dataSelezionata}
          onChange={(e) => {
            const nuovaData = e.target.value;
            setDataSelezionata(nuovaData);
            setCalendarKey((prev) => prev + 1);
            filtraEventiPerData(nuovaData);
          }}
        />
      </div>

      <FullCalendar
        key={calendarKey}
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        initialDate={dataSelezionata || undefined}
        dateClick={handleDateClick}
        locale="it"
        height="auto"
        events={eventiCalendario}
      />

      <Button
        onClick={() => {
          if (!dataSelezionata) return alert("Seleziona una data prima!");
          router.push(`/nuovo-evento?data=${dataSelezionata}`);
        }}
      >
        ➕ Crea Nuovo Evento
      </Button>

      {dataSelezionata && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">
            📋 Eventi del {dataSelezionata}
          </h2>
          {eventiDelGiorno.length > 0 ? (
            <ul className="space-y-2">
              {eventiDelGiorno.map((e, idx) => (
                <li key={idx} className="border p-3 rounded space-y-1">
                  <p className="font-bold text-base flex items-center gap-2">
                    <span>{statoEmoji(e.stato)}</span>
                    {e.titolo} — <span className="text-sm text-muted-foreground">{e.tipo}</span>
                  </p>
                  <p className="text-sm">Cliente: {e.clienti?.[0]?.cliente?.nome ?? '-'}</p>
                  <div className="flex gap-2 mt-2">
                    <Link
                      href={`/modifica-evento/${e.id}`}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      ✏️ Modifica
                    </Link>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDateNascoste(prev => [...prev, dataSelezionata])}
                      >
                        🗓️ Rimuovi Data
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={async () => {
                          await fetch(`/api/eventi?id=${e.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ stato: 'annullato' })
                          });
                          setCalendarKey(prev => prev + 1);
                        }}
                      >
                        🗑️ Annulla Evento
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nessun evento registrato.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
