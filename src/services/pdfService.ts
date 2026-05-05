/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Room, MaterialItem, ProjectMaterial, TechnicianInfo } from '../types';
import { UnitaryDiagramData } from './electricalLogic';

export function generateElectricalPDF(
  projectName: string,
  rooms: Room[], 
  materials: MaterialItem[], 
  customMaterials: ProjectMaterial[],
  totalPower: number, 
  catalog: Record<string, number>, 
  totalBudget: number,
  poleModelName?: string,
  floorPlanImage?: string,
  technician?: { name: string; license: string; phone: string }
) {
  const doc = new jsPDF();
  const date = new Date().toLocaleDateString('pt-BR');

  // Header
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 42, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text('GIGA ELETROCALC PRO', 14, 18);
  
  doc.setFontSize(10);
  doc.text(`Projeto: ${projectName}`, 14, 26);
  doc.text('Relatório Técnico de Orçamento Elétrico (NBR 5410)', 14, 32);

  if (technician && technician.name) {
    const techText = `Responsável: ${technician.name}${technician.license ? ` (${technician.license})` : ''}${technician.phone ? ` - ${technician.phone}` : ''}`;
    doc.setFontSize(9);
    doc.text(techText, 14, 38);
  }

  doc.setFontSize(10);
  doc.text(`Data: ${date}`, 170, 32);

  // Summary
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.text('Resumo do Projeto', 14, 55);
  
  const totalArea = rooms.reduce((acc, r) => acc + r.area, 0);
  const summaryBody = [
    ['Nome do Projeto', projectName],
    ['Total de Cômodos', rooms.length.toString()],
    ['Área Total da Residência', `${totalArea.toFixed(2)} m²`],
    ['Potência Total Instalada', `${totalPower} VA`],
    ['Potência Total Estimada (kW)', `${(totalPower / 1000).toFixed(2)} kW`],
    ['Custo Total Estimado (Materiais)', `R$ ${totalBudget.toFixed(2)}`],
  ];

  if (poleModelName) {
    summaryBody.push(['Padrão de Entrada', poleModelName]);
  }

  autoTable(doc, {
    startY: 60,
    head: [['Indicador', 'Valor']],
    body: summaryBody,
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42] }
  });

  // Rooms Table
  const lastY1 = (doc as any).lastAutoTable.finalY;
  doc.text('Detalhamento por Cômodo', 14, lastY1 + 15);
  
  autoTable(doc, {
    startY: lastY1 + 20,
    head: [['Cômodo', 'Área', 'Perímetro', 'Ilum. (VA)', 'TUGs', 'TUEs']],
    body: rooms.map(r => [
      r.name,
      `${r.area}m2`,
      `${r.perimeter}m`,
      `${r.lights} VA`,
      r.tugs.toString(),
      r.tues.map(t => `${t.description} (${t.power}W - ${t.voltage}V)`).join('\n')
    ]),
    theme: 'grid'
  });

  // Materials Table
  const lastY2 = (doc as any).lastAutoTable.finalY;
  doc.text('Lista de Materiais e Preços Estimados', 14, lastY2 + 15);
  
  const generatedRows = materials.map(m => {
    const unitPrice = catalog[m.id] || 0;
    return [
      m.name,
      m.quantity.toString(),
      m.unit,
      `R$ ${unitPrice.toFixed(2)}`,
      `R$ ${(m.quantity * unitPrice).toFixed(2)}`
    ];
  });

  const customRows = customMaterials.map(m => [
    m.name,
    m.quantity.toString(),
    m.unit,
    `R$ ${m.unitPrice.toFixed(2)}`,
    `R$ ${(m.quantity * m.unitPrice).toFixed(2)}`
  ]);

  autoTable(doc, {
    startY: lastY2 + 20,
    head: [['Material', 'Quant.', 'Unid.', 'V. Unit.', 'Subtotal']],
    body: [...generatedRows, ...customRows],
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42] }
  });

  // Footer note
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Observação: Este orçamento é uma estimativa baseada na NBR 5410. Consulte sempre um engenheiro eletricista.', 14, finalY);
  doc.text('Gerado por Giga EletroCalc Pro.', 14, finalY + 5);

  // Add Floor Plan page if exists and is an image
  if (floorPlanImage && !floorPlanImage.startsWith('data:application/pdf')) {
    doc.addPage();
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text('Anexo: Planta Baixa', 14, 20);
    
    try {
      // Calculate dimensions to fit in page
      const imgWidth = 180;
      const imgHeight = 160;
      doc.addImage(floorPlanImage, 'JPEG', 15, 30, imgWidth, imgHeight, undefined, 'FAST');
    } catch (e) {
      console.error('Error adding image to PDF:', e);
      doc.text('Erro ao carregar imagem da planta.', 14, 40);
    }
  }

  // Footer on all pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    const footerText = 'Desenvolvedor: Giga Elétrica | Fone: 43 996118806 | Joaquim Távora - PR';
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.text(footerText, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
  }

  doc.save(`Orcamento_${projectName.replace(/\s+/g, '_')}_${date.replace(/\//g, '-')}.pdf`);
}

async function svgToDataURL(svgString: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const svg = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svg);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1200;
        canvas.height = 1200;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          URL.revokeObjectURL(url);
          resolve(dataUrl);
        } else {
          reject(new Error('Não foi possível obter o contexto do canvas'));
        }
      };
      img.onerror = () => reject(new Error('Erro ao carregar imagem SVG'));
      img.src = url;
    } catch (e) {
      reject(e);
    }
  });
}

export async function generateSingleLineDiagramPDF(
  projectName: string, 
  diagramData: UnitaryDiagramData,
  technician?: TechnicianInfo
) {
  // Use Landscape for diagrams if there are many circuits
  const isLandscape = diagramData.circuits.length > 4;
  const doc = new jsPDF({
    orientation: isLandscape ? 'l' : 'p',
    unit: 'mm',
    format: 'a4'
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const date = new Date().toLocaleDateString('pt-BR');

  // Colors
  const darkSlate = [15, 23, 42];
  const accentYellow = [250, 204, 21];

  // Header background
  doc.setFillColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.rect(0, 0, pageWidth, 35, 'F');

  // Header Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('DIAGRAMA UNIFILAR TÉCNICO', 14, 20);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Projeto: ${projectName} | Data de Emissão: ${date}`, 14, 28);
  
  if (technician && technician.name) {
    const techInfo = `Responsável Técnico: ${technician.name} ${technician.license ? `(${technician.license})` : ''}`;
    doc.text(techInfo, pageWidth - 14, 28, { align: 'right' });
  }

  doc.setTextColor(0, 0, 0);

  // Layout Constants
  const startY = 80;
  const marginX = 20;
  const availableWidth = pageWidth - (marginX * 2);
  const circuitCount = diagramData.circuits.length;
  
  // Calculate spacing - limit to 60mm max, then scale down
  const maxSpacing = 60;
  const spacing = Math.min(maxSpacing, availableWidth / Math.max(1, circuitCount - 0.5));
  const totalDiagramWidth = (circuitCount - 1) * spacing;
  const startX = marginX + (availableWidth - totalDiagramWidth) / 2;

  // 1. MAIN FEEDER SECTION
  // Draw Main Feeder lines
  doc.setDrawColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.setLineWidth(1.0);
  
  const midX = pageWidth / 2;
  const feedTopY = 45;
  const mainBusY = 100; // Lowered to make room for DR/DPS
  
  // Vertical line from top to main breaker
  doc.line(midX, feedTopY, midX, feedTopY + 10);

  // Main Breaker Symbol
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.setFillColor(255, 255, 255);
  doc.rect(midX - 4, feedTopY + 10, 8, 10, 'FD');
  doc.line(midX - 4, feedTopY + 13, midX + 4, feedTopY + 17); // Slant line for breaker
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(`${diagramData.mainBreaker}A`, midX + 6, feedTopY + 16);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('GERAL', midX - 6, feedTopY + 8);

  // Line from Breaker to DR
  let currentY = feedTopY + 20;
  doc.line(midX, currentY, midX, currentY + 10);
  currentY += 10;

  // DR Symbol (Residual Current Device)
  if (diagramData.hasDR) {
    doc.rect(midX - 5, currentY, 10, 12, 'FD');
    doc.setFontSize(7);
    doc.text('DR', midX, currentY + 6, { align: 'center' });
    doc.text(`${diagramData.drValue}A`, midX + 7, currentY + 7);
    doc.text('30mA', midX + 7, currentY + 11);
    
    // DR specific squiggle/symbol
    doc.setLineWidth(0.3);
    doc.line(midX - 2, currentY + 8, midX + 2, currentY + 8);
    currentY += 12;
    doc.line(midX, currentY, midX, currentY + 8);
    currentY += 8;
  }

  // DPS symbols (Surge Protection) - Branched to the side
  if (diagramData.hasDPS) {
    const dpsX = midX - 25;
    doc.line(midX, currentY - 4, dpsX, currentY - 4);
    doc.line(dpsX, currentY - 4, dpsX, currentY + 2);
    
    // DPS Box
    doc.rect(dpsX - 5, currentY + 2, 10, 10, 'FD');
    doc.setFontSize(6);
    doc.text('DPS', dpsX, currentY + 7, { align: 'center' });
    doc.text('20kA', dpsX, currentY + 11, { align: 'center' });
    
    // Earth symbol for DPS
    doc.line(dpsX, currentY + 12, dpsX, currentY + 15);
    doc.line(dpsX - 3, currentY + 15, dpsX + 3, currentY + 15);
    doc.line(dpsX - 1.5, currentY + 16.5, dpsX + 1.5, currentY + 16.5);
  }

  // Final line to main busbar
  doc.line(midX, currentY, midX, mainBusY);

  // Main Cable info
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.text(`${diagramData.mainGauge}mm²`, midX + 3, currentY - 15);

  // 2. MAIN BUSBAR (F+N+PE)
  doc.setLineWidth(1.5);
  doc.setDrawColor(30, 41, 59);
  doc.line(marginX, mainBusY, pageWidth - marginX, mainBusY);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('BARRAMENTO DE DISTRIBUIÇÃO QDC', marginX, mainBusY - 5);

  // 3. INDIVIDUAL CIRCUITS
  diagramData.circuits.forEach((circuit, i) => {
    const x = startX + (i * spacing);
    const yBus = mainBusY;
    const yBreaker = yBus + 20;
    const yCable = yBreaker + 12;
    const yLoadBase = yCable + 20;

    // Vertical feed line
    doc.setLineWidth(0.6);
    doc.setDrawColor(50, 50, 50);
    doc.line(x, yBus, x, yLoadBase);

    // Connection point (Busbar Dot)
    doc.setFillColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.circle(x, yBus, 1.2, 'F');

    // Circuit Breaker Symbol
    doc.setFillColor(255, 255, 255);
    doc.rect(x - 3, yBreaker, 6, 8, 'FD');
    doc.line(x - 3, yBreaker + 2, x + 3, yBreaker + 6);
    
    // Circuit ID and Breaker Info
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(circuit.id, x - 5, yBreaker - 2);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`${circuit.breaker}A`, x + 5, yBreaker + 5);

    // Cable Section indicator
    doc.setLineWidth(0.3);
    doc.line(x - 2, yCable, x + 2, yCable - 2);
    doc.line(x - 1, yCable + 1, x + 3, yCable - 1);
    doc.text(`${circuit.gauge}mm²`, x + 4, yCable);

    // Dynamic Font Sizing based on spacing
    const adaptiveBaseFontSize = spacing < 25 ? 6 : 7;
    const adaptiveSmallFontSize = spacing < 25 ? 5 : 6;
    const adaptivePowerFontSize = spacing < 25 ? 7 : 8;

    // LOAD REPRESENTATION (Box with details)
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.rect(x - (spacing/2) + 2, yLoadBase, spacing - 4, 30, 'FD');
    
    doc.setDrawColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(adaptiveBaseFontSize);
    doc.setFont('helvetica', 'bold');
    
    // Split name to fit and calculate height
    const nameLines = doc.splitTextToSize(circuit.name, spacing - 6);
    const nameHeight = nameLines.length * (adaptiveBaseFontSize * 0.4);
    doc.text(nameLines, x, yLoadBase + 6, { align: 'center' });
    
    // Adjust next positions based on name height to avoid overlap
    const typeY = yLoadBase + 8 + nameHeight;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(adaptiveSmallFontSize);
    const typeLabel = 
      circuit.type === 'lighting' ? 'ILUMINAÇÃO' :
      circuit.type === 'tug' ? 'TOMADAS GERAIS' :
      circuit.type === 'tue' ? 'CARGA DEDICADA' : 'MISTO';
    doc.text(typeLabel, x, typeY, { align: 'center' });
    
    const powerY = typeY + 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(adaptivePowerFontSize);
    doc.setTextColor(15, 23, 42);
    doc.text(`${circuit.powerVA} VA`, x, powerY, { align: 'center' });
  });

  // Footer Legend
  const legendY = pageHeight - 35;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.setFillColor(252, 252, 253);
  doc.rect(14, legendY, pageWidth - 28, 25, 'F');
  doc.rect(14, legendY, pageWidth - 28, 25);

  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('NOTAS E LEGENDA:', 20, legendY + 7);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('1. Dimensionamento conforme NBR 5410 | 2. Todos os circuitos possuem condutor de proteção (PE) dedicado.', 20, legendY + 12);
  doc.text('3. O QDC deve ser instalado em local acessível e sinalizado | 4. Cabos conforme bitola indicada na norma.', 20, legendY + 16);
  doc.text('5. Disjuntores termomagnéticos padrão DIN com curva B ou C dependendo da carga.', 20, legendY + 20);

  // Developer info
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  const footerStr = 'Giga EletroCalc Pro | Software de Dimensionamento Elétrico Residencial';
  doc.text(footerStr, pageWidth / 2, pageHeight - 5, { align: 'center' });

  doc.save(`${projectName}_Diagrama_Unifilar.pdf`);
}

export async function generateDetailedElectricalPDF(
  projectName: string,
  detailedList: any, // DetailedMaterialList from electricalLogic
  customMaterials: ProjectMaterial[],
  catalog: Record<string, number>,
  technician?: { name: string; license: string; phone: string },
  floorPlanImage?: string
) {
  const doc = new jsPDF();
  const date = new Date().toLocaleDateString('pt-BR');

  // Header
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 42, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text('GIGA ELETROCALC PRO', 14, 18);
  
  doc.setFontSize(10);
  doc.text(`Projeto: ${projectName}`, 14, 26);
  doc.text('Orçamento Detalhado por Grupos/Cômodos', 14, 32);
  doc.text(`Área Total da Residência: ${detailedList.totalArea.toFixed(2)} m²`, 14, 38);

  if (technician && technician.name) {
    const techText = `Responsável: ${technician.name}${technician.license ? ` (${technician.license})` : ''}${technician.phone ? ` - ${technician.phone}` : ''}`;
    doc.setFontSize(9);
    doc.text(techText, 14, 44);
  }

  doc.setFontSize(10);
  doc.text(`Data: ${date}`, 170, 32);

  let currentY = 60;
  let totalProjectSum = 0;

  // Function to add a table for a group
  const addGroupTable = (title: string, materials: MaterialItem[], startY: number) => {
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, startY);
    doc.setFont('helvetica', 'normal');

    const body = materials.map(m => {
      const unitPrice = catalog[m.id] || 0;
      const subtotal = m.quantity * unitPrice;
      totalProjectSum += subtotal;
      return [
        m.name,
        m.quantity.toString(),
        m.unit,
        `R$ ${unitPrice.toFixed(2)}`,
        `R$ ${subtotal.toFixed(2)}`
      ];
    });

    autoTable(doc, {
      startY: startY + 5,
      head: [['Material', 'Quant.', 'Unid.', 'V. Unit.', 'Subtotal']],
      body: body,
      theme: 'grid',
      headStyles: { fillColor: [51, 65, 85] },
      styles: { fontSize: 8 },
      margin: { left: 14, right: 14 }
    });

    return (doc as any).lastAutoTable.finalY + 10;
  };

  // 1. Service Entrance
  if (detailedList.serviceEntrance.length > 0) {
    currentY = addGroupTable('Padrão de Entrada de Serviço', detailedList.serviceEntrance, currentY);
  }

  // 2. Common Items
  if (detailedList.commonItems.length > 0) {
    if (currentY > 250) { doc.addPage(); currentY = 20; }
    currentY = addGroupTable('Quadro de Distribuição e Proteção', detailedList.commonItems, currentY);
  }

  // 3. By Room
  detailedList.byRoom.forEach((roomGroup: any) => {
    if (currentY > 230) { doc.addPage(); currentY = 20; }
    currentY = addGroupTable(`Materiais: ${roomGroup.roomName} (${roomGroup.roomArea.toFixed(2)} m²)`, roomGroup.materials, currentY);
  });

  // 4. Custom Materials
  if (customMaterials.length > 0) {
    if (currentY > 230) { doc.addPage(); currentY = 20; }
    
    const body = customMaterials.map(m => {
      const subtotal = m.quantity * m.unitPrice;
      totalProjectSum += subtotal;
      return [
        m.name,
        m.quantity.toString(),
        m.unit,
        `R$ ${m.unitPrice.toFixed(2)}`,
        `R$ ${subtotal.toFixed(2)}`
      ];
    });

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Materiais Adicionais / Personalizados', 14, currentY);

    autoTable(doc, {
      startY: currentY + 5,
      head: [['Material', 'Quant.', 'Unid.', 'V. Unit.', 'Subtotal']],
      body: body,
      theme: 'grid',
      headStyles: { fillColor: [51, 65, 85] },
      styles: { fontSize: 8 }
    });
    currentY = (doc as any).lastAutoTable.finalY + 15;
  }

  // Total Summary
  if (currentY > 260) { doc.addPage(); currentY = 20; }
  doc.setFillColor(248, 250, 252);
  doc.rect(14, currentY, 182, 15, 'F');
  doc.setDrawColor(15, 23, 42);
  doc.rect(14, currentY, 182, 15);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('VALOR TOTAL ESTIMADO DO ORÇAMENTO:', 20, currentY + 10);
  doc.text(`R$ ${totalProjectSum.toFixed(2)}`, 190, currentY + 10, { align: 'right' });

  // Add Floor Plan
  if (floorPlanImage && !floorPlanImage.startsWith('data:application/pdf')) {
    doc.addPage();
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text('Anexo: Planta Baixa', 14, 20);
    try {
      doc.addImage(floorPlanImage, 'JPEG', 15, 30, 180, 160, undefined, 'FAST');
    } catch (e) {
      console.error(e);
    }
  }

  // Footers
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    const footerText = 'Desenvolvedor: Giga Elétrica | Fone: 43 996118806 | Joaquim Távora - PR';
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.text(footerText, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
  }

  doc.save(`Orcamento_Detalhado_${projectName.replace(/\s+/g, '_')}_${date.replace(/\//g, '-')}.pdf`);
}

export function generateFloorPlanPDF(
  projectName: string,
  floorPlanImage: string,
  technician?: TechnicianInfo
) {
  if (!floorPlanImage) return;

  const doc = new jsPDF({
    orientation: 'l',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const date = new Date().toLocaleDateString('pt-BR');

  // Header background (slate-900)
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 25, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('PLANTA BAIXA ELÉTRICA / LAYOUT', 14, 15);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Projeto: ${projectName} | Emitido em: ${date}`, 14, 21);

  if (technician && technician.name) {
    doc.text(`Responsável: ${technician.name} ${technician.license ? `(${technician.license})` : ''}`, pageWidth - 14, 21, { align: 'right' });
  }

  // Draw the image
  try {
    // Add border to image area
    doc.setDrawColor(200, 200, 200);
    doc.rect(10, 30, pageWidth - 20, pageHeight - 45);

    // Use auto-detection for format if possible, or just don't force JPEG
    doc.addImage(floorPlanImage, 12, 32, pageWidth - 24, pageHeight - 49, undefined, 'FAST');
  } catch (e) {
    console.error('Error adding floor plan to PDF:', e);
    doc.setTextColor(200, 0, 0);
    doc.text('Erro ao processar imagem da planta baixa para o PDF.', pageWidth / 2, pageHeight / 2, { align: 'center' });
  }

  // Footer
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(7);
  const footerStr = 'Giga EletroCalc Pro | Dimensionamento e Projeto Elétrico';
  doc.text(footerStr, pageWidth / 2, pageHeight - 8, { align: 'center' });

  doc.save(`Planta_Baixa_${projectName.replace(/\s+/g, '_')}.pdf`);
}
