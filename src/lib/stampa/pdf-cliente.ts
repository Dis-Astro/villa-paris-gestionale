/**
 * VILLA PARIS - PDF CLIENTE
 * Genera il pacchetto PDF per il cliente (contrattuale)
 * Include: Copertina, Piantina pulita, Menu, Pagina firme
 */

// @ts-ignore - pdfmake types don't match runtime
import pdfMake from 'pdfmake/build/pdfmake'
// @ts-ignore - pdfmake types don't match runtime
import pdfFonts from 'pdfmake/build/vfs_fonts'
import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces'
import type { Evento, MenuEvento, DisposizioneSala } from '@/lib/types'
import {
  PDFMetadata,
  StampaOptions,
  WatermarkType,
  buildMetadata,
  createWatermark,
  createHeader,
  createFooter,
  PDF_STYLES,
  PDF_COLORS,
  getTipoEventoLabel,
  formatDataEvento
} from './pdf-utils'

// Inizializza i font
// @ts-ignore - pdfmake runtime initialization
pdfMake.vfs = pdfFonts.vfs

// ============================================
// PAGINA COPERTINA
// ============================================

function buildCopertina(metadata: PDFMetadata): Content[] {
  return [
    { text: '', margin: [0, 100, 0, 0] },
    {
      text: 'VILLA PARIS',
      style: 'titoloPrincipale',
      fontSize: 36,
      color: PDF_COLORS.accent
    },
    { text: '', margin: [0, 10, 0, 0] },
    {
      canvas: [
        {
          type: 'line',
          x1: 150, y1: 0,
          x2: 350, y2: 0,
          lineWidth: 2,
          lineColor: PDF_COLORS.accent
        }
      ],
      alignment: 'center'
    },
    { text: '', margin: [0, 30, 0, 0] },
    {
      text: metadata.tipoEvento.toUpperCase(),
      style: 'sottotitolo',
      fontSize: 14,
      color: PDF_COLORS.secondary
    },
    { text: '', margin: [0, 20, 0, 0] },
    {
      text: metadata.titoloEvento,
      style: 'titoloPrincipale',
      fontSize: 24
    },
    { text: '', margin: [0, 40, 0, 0] },
    {
      text: metadata.dataEvento,
      style: 'sottotitolo',
      fontSize: 16,
      bold: true,
      color: PDF_COLORS.primary
    },
    { text: '', margin: [0, 10, 0, 0] },
    {
      text: `${metadata.personePreviste} ospiti previsti`,
      style: 'sottotitolo',
      fontSize: 12
    },
    { text: '', margin: [0, 60, 0, 0] },
    {
      text: `Cliente: ${metadata.cliente}`,
      style: 'testoNormale',
      alignment: 'center'
    },
    { text: '', pageBreak: 'after' }
  ]
}

// ============================================
// PAGINA MENU
// ============================================

function buildMenuPage(menu: MenuEvento | undefined, metadata: PDFMetadata): Content[] {
  const content: Content[] = [
    {
      text: 'MENU',
      style: 'titoloSezione',
      alignment: 'center',
      fontSize: 24,
      margin: [0, 0, 0, 30]
    }
  ]

  if (!menu?.portate || menu.portate.length === 0) {
    content.push({
      text: 'Menu da definire',
      style: 'testoNormale',
      alignment: 'center',
      italics: true,
      color: PDF_COLORS.secondary
    })
  } else {
    // Ordina portate
    const portateOrdinate = [...menu.portate].sort((a, b) => a.ordine - b.ordine)
    
    for (const portata of portateOrdinate) {
      content.push({
        text: portata.nome.toUpperCase(),
        style: 'titoloPortata',
        alignment: 'center',
        margin: [0, 20, 0, 5]
      })
      
      if (portata.descrizione) {
        content.push({
          text: portata.descrizione,
          style: 'testoNormale',
          alignment: 'center',
          margin: [40, 0, 40, 15]
        })
      }
      
      // Linea decorativa
      content.push({
        canvas: [
          {
            type: 'line',
            x1: 200, y1: 0,
            x2: 300, y2: 0,
            lineWidth: 0.5,
            lineColor: PDF_COLORS.accent
          }
        ],
        alignment: 'center',
        margin: [0, 5, 0, 10]
      })
    }
  }

  // Note menu
  if (menu?.note) {
    content.push({
      text: '',
      margin: [0, 30, 0, 0]
    })
    content.push({
      text: 'Note:',
      style: 'testoSmall',
      bold: true
    })
    content.push({
      text: menu.note,
      style: 'testoSmall',
      italics: true
    })
  }

  content.push({ text: '', pageBreak: 'after' })
  return content
}

// ============================================
// PAGINA PIANTINA (PULITA)
// ============================================

function buildPiantinaPage(disposizione: DisposizioneSala | undefined): Content[] {
  const content: Content[] = [
    {
      text: 'DISPOSIZIONE SALA',
      style: 'titoloSezione',
      alignment: 'center',
      fontSize: 20,
      margin: [0, 0, 0, 20]
    }
  ]

  if (!disposizione?.tavoli || disposizione.tavoli.length === 0) {
    content.push({
      text: 'Disposizione sala da definire',
      style: 'testoNormale',
      alignment: 'center',
      italics: true,
      color: PDF_COLORS.secondary
    })
  } else {
    // Tabella riepilogativa tavoli
    const tableBody: any[][] = [
      [
        { text: 'Tavolo', style: 'tableHeader', fillColor: PDF_COLORS.primary, color: 'white' },
        { text: 'Posti', style: 'tableHeader', fillColor: PDF_COLORS.primary, color: 'white' }
      ]
    ]

    let totalePosti = 0
    for (const tavolo of disposizione.tavoli) {
      tableBody.push([
        { text: tavolo.numero, style: 'testoNormale' },
        { text: tavolo.posti.toString(), style: 'testoNormale', alignment: 'center' }
      ])
      totalePosti += tavolo.posti
    }

    // Riga totale
    tableBody.push([
      { text: 'TOTALE', bold: true, fillColor: PDF_COLORS.lightGray },
      { text: totalePosti.toString(), bold: true, alignment: 'center', fillColor: PDF_COLORS.lightGray }
    ])

    content.push({
      table: {
        headerRows: 1,
        widths: ['*', 80],
        body: tableBody
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => PDF_COLORS.border,
        vLineColor: () => PDF_COLORS.border
      },
      margin: [50, 0, 50, 0]
    })

    content.push({
      text: `Totale tavoli: ${disposizione.tavoli.length}`,
      style: 'testoSmall',
      alignment: 'center',
      margin: [0, 15, 0, 0]
    })
  }

  content.push({ text: '', pageBreak: 'after' })
  return content
}

// ============================================
// PAGINA FIRME
// ============================================

function buildFirmePage(metadata: PDFMetadata): Content[] {
  return [
    {
      text: 'CONFERMA ACCORDI',
      style: 'titoloSezione',
      alignment: 'center',
      fontSize: 20,
      margin: [0, 0, 0, 30]
    },
    {
      text: `Il presente documento rappresenta l'accordo relativo all'evento "${metadata.titoloEvento}" previsto per il giorno ${metadata.dataEvento}.`,
      style: 'testoNormale',
      margin: [0, 0, 0, 20]
    },
    {
      text: 'Le parti confermano quanto segue:',
      style: 'testoNormale',
      margin: [0, 0, 0, 10]
    },
    {
      ul: [
        'Il menu come descritto nelle pagine precedenti',
        'La disposizione sala indicata',
        `Il numero di ospiti previsti: ${metadata.personePreviste}`,
        'Le eventuali varianti alimentari comunicate'
      ],
      style: 'testoNormale',
      margin: [20, 0, 0, 30]
    },
    {
      text: 'Note aggiuntive:',
      style: 'testoNormale',
      bold: true,
      margin: [0, 20, 0, 5]
    },
    {
      canvas: [
        { type: 'rect', x: 0, y: 0, w: 500, h: 80, lineWidth: 0.5, lineColor: PDF_COLORS.border }
      ],
      margin: [0, 0, 0, 40]
    },
    {
      columns: [
        {
          width: '45%',
          stack: [
            { text: 'Per Villa Paris', style: 'testoNormale', bold: true },
            { text: '', margin: [0, 40, 0, 0] },
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 0.5 }] },
            { text: 'Firma', style: 'testoSmall', margin: [0, 5, 0, 0] },
            { text: '', margin: [0, 20, 0, 0] },
            { text: 'Data: _______________', style: 'testoSmall' }
          ]
        },
        { width: '10%', text: '' },
        {
          width: '45%',
          stack: [
            { text: `Per il Cliente (${metadata.cliente})`, style: 'testoNormale', bold: true },
            { text: '', margin: [0, 40, 0, 0] },
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 0.5 }] },
            { text: 'Firma', style: 'testoSmall', margin: [0, 5, 0, 0] },
            { text: '', margin: [0, 20, 0, 0] },
            { text: 'Data: _______________', style: 'testoSmall' }
          ]
        }
      ]
    },
    { text: '', margin: [0, 40, 0, 0] },
    {
      text: `Documento generato il ${metadata.dataOraStampa} - Revisione ${metadata.versione}`,
      style: 'testoSmall',
      alignment: 'center'
    }
  ]
}

// ============================================
// GENERATORE PRINCIPALE
// ============================================

export function generaPDFCliente(
  evento: Evento,
  options: StampaOptions
): void {
  const metadata = buildMetadata(evento, options)
  
  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60],
    
    watermark: createWatermark(options.watermark),
    
    header: createHeader(metadata),
    footer: createFooter(metadata),
    
    content: [
      ...buildCopertina(metadata),
      ...buildMenuPage(evento.menu, metadata),
      ...buildPiantinaPage(evento.disposizioneSala),
      ...buildFirmePage(metadata)
    ],
    
    styles: PDF_STYLES as any,
    
    defaultStyle: {
      font: 'Roboto'
    },
    
    info: {
      title: `${metadata.titoloEvento} - Pacchetto Cliente`,
      author: 'Villa Paris',
      subject: metadata.tipoEvento,
      creator: 'Villa Paris Gestionale'
    }
  }

  // Genera e scarica il PDF
  const fileName = `VillaParis_${evento.titolo.replace(/\s+/g, '_')}_Cliente_v${metadata.versione}.pdf`
  pdfMake.createPdf(docDefinition).download(fileName)
}
