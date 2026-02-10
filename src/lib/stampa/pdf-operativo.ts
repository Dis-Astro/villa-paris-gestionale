/**
 * VILLA PARIS - PDF OPERATIVO
 * Genera il pacchetto PDF per lo staff operativo
 * Include: Piantina con varianti evidenziate, Fogli servizio per portata
 */

// @ts-ignore - pdfmake types don't match runtime
import pdfMake from 'pdfmake/build/pdfmake'
// @ts-ignore - pdfmake types don't match runtime
import pdfFonts from 'pdfmake/build/vfs_fonts'
import type { Evento, MenuEvento, DisposizioneSala, Portata, VariantId } from '@/lib/types'
import { VARIANTI_DEFAULT } from '@/lib/types'
import {
  PDFMetadata,
  StampaOptions,
  buildMetadata,
  createWatermark,
  createHeader,
  createFooter,
  PDF_STYLES,
  PDF_COLORS,
  calcolaTotaliVarianti
} from './pdf-utils'

// Inizializza i font
// @ts-ignore - pdfmake runtime initialization
pdfMake.vfs = pdfFonts.vfs

// ============================================
// PAGINA INTESTAZIONE OPERATIVA
// ============================================

function buildIntestazioneOperativa(metadata: PDFMetadata): Content[] {
  return [
    {
      text: 'DOCUMENTO OPERATIVO',
      style: 'titoloPrincipale',
      fontSize: 24,
      color: PDF_COLORS.primary,
      alignment: 'center'
    },
    { text: '', margin: [0, 5, 0, 0] },
    {
      text: 'USO INTERNO - NON CONSEGNARE AL CLIENTE',
      fontSize: 10,
      color: PDF_COLORS.watermarkBozza,
      bold: true,
      alignment: 'center'
    },
    { text: '', margin: [0, 15, 0, 0] },
    {
      columns: [
        {
          width: '50%',
          stack: [
            { text: 'Evento:', style: 'testoSmall', bold: true },
            { text: metadata.titoloEvento, style: 'testoNormale', bold: true }
          ]
        },
        {
          width: '50%',
          stack: [
            { text: 'Data Evento:', style: 'testoSmall', bold: true },
            { text: metadata.dataEvento, style: 'testoNormale', bold: true }
          ],
          alignment: 'right'
        }
      ]
    },
    {
      columns: [
        {
          width: '50%',
          stack: [
            { text: 'Tipo:', style: 'testoSmall' },
            { text: metadata.tipoEvento, style: 'testoNormale' }
          ]
        },
        {
          width: '50%',
          stack: [
            { text: 'Ospiti previsti:', style: 'testoSmall' },
            { text: metadata.personePreviste.toString(), style: 'testoNormale', bold: true }
          ],
          alignment: 'right'
        }
      ],
      margin: [0, 10, 0, 0]
    },
    {
      canvas: [
        { type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: PDF_COLORS.primary }
      ],
      margin: [0, 15, 0, 0]
    },
    { text: '', pageBreak: 'after' }
  ]
}

// ============================================
// PAGINA RIEPILOGO VARIANTI
// ============================================

function buildRiepilogoVarianti(disposizione: DisposizioneSala | undefined): Content[] {
  const content: Content[] = [
    {
      text: 'RIEPILOGO VARIANTI ALIMENTARI',
      style: 'titoloSezione',
      alignment: 'center',
      fontSize: 18,
      margin: [0, 0, 0, 20]
    }
  ]

  const totali = calcolaTotaliVarianti(disposizione, VARIANTI_DEFAULT)
  const variantiPresenti = Object.entries(totali).filter(([_, data]) => data.totale > 0)

  if (variantiPresenti.length === 0) {
    content.push({
      text: 'Nessuna variante alimentare registrata',
      style: 'testoNormale',
      alignment: 'center',
      italics: true,
      color: PDF_COLORS.secondary
    })
  } else {
    // Tabella riepilogo totali
    const tableBody: any[][] = [
      [
        { text: 'VARIANTE', style: 'tableHeader', fillColor: PDF_COLORS.primary, color: 'white', bold: true },
        { text: 'TOTALE', style: 'tableHeader', fillColor: PDF_COLORS.primary, color: 'white', bold: true, alignment: 'center' },
        { text: 'TAVOLI', style: 'tableHeader', fillColor: PDF_COLORS.primary, color: 'white', bold: true }
      ]
    ]

    for (const [variantId, data] of variantiPresenti) {
      const variante = VARIANTI_DEFAULT[variantId as VariantId]
      const tavoliStr = data.tavoli.map(t => `${t.numero}(${t.quantita})`).join(', ')
      
      tableBody.push([
        { 
          text: [
            { text: '● ', color: variante?.colore || PDF_COLORS.secondary },
            { text: `${data.nome} `, bold: true },
            { text: `(${variante?.nomeStampa || variantId})`, fontSize: 9, color: PDF_COLORS.secondary }
          ]
        },
        { text: data.totale.toString(), alignment: 'center', bold: true, fontSize: 14 },
        { text: tavoliStr, fontSize: 9 }
      ])
    }

    // Riga totale generale
    const totaleVarianti = variantiPresenti.reduce((sum, [_, data]) => sum + data.totale, 0)
    tableBody.push([
      { text: 'TOTALE VARIANTI', bold: true, fillColor: PDF_COLORS.lightGray },
      { text: totaleVarianti.toString(), bold: true, alignment: 'center', fontSize: 16, fillColor: PDF_COLORS.lightGray },
      { text: '', fillColor: PDF_COLORS.lightGray }
    ])

    content.push({
      table: {
        headerRows: 1,
        widths: ['35%', 60, '*'],
        body: tableBody
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => PDF_COLORS.border,
        vLineColor: () => PDF_COLORS.border,
        paddingTop: () => 8,
        paddingBottom: () => 8
      }
    })
  }

  content.push({ text: '', pageBreak: 'after' })
  return content
}

// ============================================
// PAGINA PIANTINA CON VARIANTI
// ============================================

function buildPiantinaOperativa(disposizione: DisposizioneSala | undefined): Content[] {
  const content: Content[] = [
    {
      text: 'PIANTINA CON VARIANTI',
      style: 'titoloSezione',
      alignment: 'center',
      fontSize: 18,
      margin: [0, 0, 0, 15]
    }
  ]

  if (!disposizione?.tavoli || disposizione.tavoli.length === 0) {
    content.push({
      text: 'Nessun tavolo configurato',
      style: 'testoNormale',
      alignment: 'center',
      italics: true
    })
  } else {
    // Griglia tavoli con dettaglio varianti
    const tableBody: any[][] = [
      [
        { text: 'TAVOLO', fillColor: PDF_COLORS.primary, color: 'white', bold: true },
        { text: 'POSTI', fillColor: PDF_COLORS.primary, color: 'white', bold: true, alignment: 'center' },
        { text: 'VARIANTI', fillColor: PDF_COLORS.primary, color: 'white', bold: true }
      ]
    ]

    for (const tavolo of disposizione.tavoli) {
      const variantiList: any[] = []
      
      if (tavolo.varianti && Object.keys(tavolo.varianti).length > 0) {
        for (const [variantId, qty] of Object.entries(tavolo.varianti)) {
          if (qty && qty > 0) {
            const variante = VARIANTI_DEFAULT[variantId as VariantId]
            variantiList.push({
              text: [
                { text: '● ', color: variante?.colore || '#666' },
                { text: `${variante?.nomeStampa || variantId}: `, bold: true },
                { text: qty.toString() }
              ],
              fontSize: 10,
              margin: [0, 2, 0, 2]
            })
          }
        }
      }

      const hasVarianti = variantiList.length > 0
      
      tableBody.push([
        { 
          text: tavolo.numero, 
          bold: true, 
          fontSize: 14,
          fillColor: hasVarianti ? '#fef3c7' : undefined
        },
        { 
          text: tavolo.posti.toString(), 
          alignment: 'center',
          fillColor: hasVarianti ? '#fef3c7' : undefined
        },
        { 
          stack: variantiList.length > 0 ? variantiList : [{ text: '-', color: PDF_COLORS.secondary }],
          fillColor: hasVarianti ? '#fef3c7' : undefined
        }
      ])
    }

    content.push({
      table: {
        headerRows: 1,
        widths: [60, 50, '*'],
        body: tableBody
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => PDF_COLORS.border,
        vLineColor: () => PDF_COLORS.border,
        paddingTop: () => 6,
        paddingBottom: () => 6
      }
    })

    // Legenda
    content.push({
      text: '',
      margin: [0, 15, 0, 0]
    })
    content.push({
      text: 'Legenda: righe gialle = tavoli con varianti',
      style: 'testoSmall',
      italics: true
    })
  }

  content.push({ text: '', pageBreak: 'after' })
  return content
}

// ============================================
// FOGLI SERVIZIO PER PORTATA
// ============================================

function buildFogliServizio(
  menu: MenuEvento | undefined, 
  disposizione: DisposizioneSala | undefined
): Content[] {
  const content: Content[] = []

  if (!menu?.portate || menu.portate.length === 0) {
    content.push({
      text: 'FOGLI SERVIZIO',
      style: 'titoloSezione',
      alignment: 'center'
    })
    content.push({
      text: 'Menu non configurato',
      style: 'testoNormale',
      alignment: 'center',
      italics: true
    })
    return content
  }

  const totaliVarianti = calcolaTotaliVarianti(disposizione, VARIANTI_DEFAULT)
  const portateOrdinate = [...menu.portate].sort((a, b) => a.ordine - b.ordine)

  for (let i = 0; i < portateOrdinate.length; i++) {
    const portata = portateOrdinate[i]
    
    // Intestazione portata
    content.push({
      text: `SERVIZIO PORTATA ${portata.ordine}`,
      style: 'titoloSezione',
      alignment: 'center',
      fontSize: 16,
      margin: [0, 0, 0, 5]
    })
    content.push({
      text: portata.nome.toUpperCase(),
      style: 'titoloPrincipale',
      fontSize: 22,
      alignment: 'center',
      margin: [0, 0, 0, 10]
    })
    
    if (portata.descrizione) {
      content.push({
        text: portata.descrizione,
        style: 'testoNormale',
        alignment: 'center',
        italics: true,
        margin: [20, 0, 20, 15]
      })
    }

    // Conteggio totale
    const totalePosti = disposizione?.tavoli?.reduce((sum, t) => sum + t.posti, 0) || 0
    content.push({
      columns: [
        {
          width: '50%',
          stack: [
            { text: 'PIATTI STANDARD', bold: true, fontSize: 12 },
            { 
              text: (totalePosti - Object.values(totaliVarianti).reduce((s, v) => s + v.totale, 0)).toString(), 
              fontSize: 28, 
              bold: true,
              color: PDF_COLORS.primary
            }
          ],
          alignment: 'center'
        },
        {
          width: '50%',
          stack: [
            { text: 'TOTALE COPERTI', bold: true, fontSize: 12 },
            { text: totalePosti.toString(), fontSize: 28, bold: true, color: PDF_COLORS.secondary }
          ],
          alignment: 'center'
        }
      ],
      margin: [0, 10, 0, 20]
    })

    // Box varianti per questa portata
    const variantiPresenti = Object.entries(totaliVarianti).filter(([_, data]) => data.totale > 0)
    
    if (variantiPresenti.length > 0) {
      content.push({
        text: 'VARIANTI DA PREPARARE:',
        bold: true,
        fontSize: 12,
        margin: [0, 10, 0, 10]
      })

      const variantiTable: any[][] = []
      
      for (const [variantId, data] of variantiPresenti) {
        const variante = VARIANTI_DEFAULT[variantId as VariantId]
        variantiTable.push([
          {
            columns: [
              { text: '■', color: variante?.colore || '#666', width: 15, fontSize: 14 },
              { text: variante?.nomeStampa || variantId, bold: true, width: '*' }
            ]
          },
          { text: data.totale.toString(), bold: true, fontSize: 16, alignment: 'center' },
          { text: data.tavoli.map(t => t.numero).join(', '), fontSize: 10 }
        ])
      }

      content.push({
        table: {
          widths: [120, 50, '*'],
          body: variantiTable
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          paddingTop: () => 8,
          paddingBottom: () => 8
        },
        margin: [0, 0, 0, 20]
      })
    }

    // Checkbox conferma
    content.push({
      columns: [
        { text: '☐', fontSize: 18, width: 25 },
        { text: 'Portata completata', style: 'testoNormale' },
        { text: 'Ora: __________', style: 'testoSmall', alignment: 'right' }
      ],
      margin: [0, 20, 0, 0]
    })

    // Page break tranne ultima portata
    if (i < portateOrdinate.length - 1) {
      content.push({ text: '', pageBreak: 'after' })
    }
  }

  return content
}

// ============================================
// GENERATORE PRINCIPALE
// ============================================

export function generaPDFOperativo(
  evento: Evento,
  options: StampaOptions
): void {
  const metadata = buildMetadata(evento, options)
  
  const docDefinition: any = {
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60],
    
    watermark: createWatermark(options.watermark),
    
    header: createHeader(metadata),
    footer: createFooter(metadata),
    
    content: [
      ...buildIntestazioneOperativa(metadata),
      ...buildRiepilogoVarianti(evento.disposizioneSala),
      ...buildPiantinaOperativa(evento.disposizioneSala),
      ...buildFogliServizio(evento.menu, evento.disposizioneSala)
    ],
    
    styles: PDF_STYLES,
    
    defaultStyle: {
      font: 'Roboto'
    },
    
    info: {
      title: `${metadata.titoloEvento} - Operativo`,
      author: 'Villa Paris',
      subject: 'Documento Operativo',
      creator: 'Villa Paris Gestionale'
    }
  }

  // Genera e scarica il PDF
  const fileName = `VillaParis_${evento.titolo.replace(/\s+/g, '_')}_Operativo_v${metadata.versione}.pdf`
  pdfMake.createPdf(docDefinition).download(fileName)
}
