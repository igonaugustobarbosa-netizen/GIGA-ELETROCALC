/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Room, MaterialItem, ProjectMaterial } from '../types';

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
  
  const summaryBody = [
    ['Nome do Projeto', projectName],
    ['Total de Cômodos', rooms.length.toString()],
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

  if (technician && technician.name) {
    const techText = `Responsável: ${technician.name}${technician.license ? ` (${technician.license})` : ''}${technician.phone ? ` - ${technician.phone}` : ''}`;
    doc.setFontSize(9);
    doc.text(techText, 14, 38);
  }

  doc.setFontSize(10);
  doc.text(`Data: ${date}`, 170, 32);

  let currentY = 55;
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
    currentY = addGroupTable(`Materiais: ${roomGroup.roomName}`, roomGroup.materials, currentY);
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
