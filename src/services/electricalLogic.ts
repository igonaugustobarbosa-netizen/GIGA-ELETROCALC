/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Room, MaterialItem, EntryPoleModel } from '../types';
import { STANDARDS } from '../constants';

export function calculateRoomRequirements(room: Partial<Room>): Room {
  const { area = 0, perimeter = 0, type = 'living' } = room;

  // 1. Lighting Calculation (NBR 5410)
  let lightsVA = 0;
  if (area > 0) {
    lightsVA = STANDARDS.LIGHTING.INITIAL_VA;
    if (area > STANDARDS.LIGHTING.INITIAL_AREA) {
      const extraArea = area - STANDARDS.LIGHTING.INITIAL_AREA;
      const steps = Math.floor(extraArea / STANDARDS.LIGHTING.STEP_AREA);
      lightsVA += steps * STANDARDS.LIGHTING.STEP_VA;
    }
  }

  // 2. TUG Calculation
  let tugCount = 0;
  if (perimeter > 0) {
    const step = (type === 'kitchen' || type === 'laundry') 
      ? STANDARDS.TUG.KITCHEN_PERIMETER_STEP 
      : STANDARDS.TUG.SOCIAL_PERIMETER_STEP;
    
    tugCount = Math.ceil(perimeter / step);
    
    // Bathroom rule: at least 1 near washbasin
    if (type === 'bathroom' && tugCount < 1) tugCount = 1;
  }

  return {
    id: room.id || Math.random().toString(36).substr(2, 9),
    name: room.name || 'Nova Peça',
    area,
    perimeter,
    type: type as any,
    lights: lightsVA,
    tugs: tugCount,
    tues: room.tues || [],
  };
}

export function generateMaterialList(rooms: Room[], poleModel: EntryPoleModel | null = null, onlyPoleModel: boolean = false): MaterialItem[] {
  if (rooms.length === 0 && !poleModel) return [];

  if (onlyPoleModel && poleModel) {
    return poleModel.items.map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category
    }));
  }

  let conduit20 = 0;
  let conduit25 = 0;
  let total4x2Boxes = 0;
  let totalOctagonalBoxes = 0;
  let lightingCable = 0;
  let tugCable = 0;
  let totalSwitches = 0;
  let totalSockets10A = 0;
  let totalSockets20A = 0;
  const materials: MaterialItem[] = [];

  rooms.forEach(room => {
    // 1. Boxes and Devices
    totalOctagonalBoxes += 1;
    totalSwitches += 1; 
    totalSockets10A += room.tugs;
    
    const tuesWithSockets = room.tues.filter(t => t.power < 5000);
    totalSockets20A += tuesWithSockets.length;
    total4x2Boxes += room.tugs + tuesWithSockets.length + 1; 

    // 2. Conduit Calculation (Optimized)
    // Distance from Board (QD) to Room center (approximation)
    const distQD = Math.sqrt(room.area) + 6; 
    
    // Internal drops/paths from ceiling box to devices
    const drops = (1 + room.tugs + room.tues.length) * 3.2; // 3.2m per point
    
    const roomConduitTotal = distQD + drops;

    // Occupancy logic based on wire estimation in the main conduit
    // Average wires: Lighting(2) + TUG Circuit(3) + TUEs(3 per equipment)
    const estimatedWires = 5 + (room.tues.length * 3);
    
    // NBR 5410 40% occupancy for 3+ conductors
    // 20mm (3/4"): fits ~6 wires of 2.5mm2
    // 25mm (1"): fits ~12 wires of 2.5mm2
    if (estimatedWires > 6) {
      conduit25 += roomConduitTotal;
    } else {
      conduit20 += roomConduitTotal;
    }

    // 3. Cables calculation (Refined for Phase, Neutral, and Ground)
    // Distance from QD + coverage factor. NBR 5410 requires Ground for all circuits.
    
    // Voltage drop factor: Increase cable length for longer runs (safety margin)
    const vdFactor = 1 + (distQD * 0.02); // 2% linear increase per meter of distance
    
    // Lighting: 3 conductors (P + N + G) 1.5mm²
    const roomLightingLength = (distQD + room.perimeter + 4) * 3 * vdFactor;
    lightingCable += roomLightingLength;
    
    // TUGs: 3 conductors (P + N + G) 2.5mm²
    const roomTugLength = (distQD + room.perimeter + 6) * 3 * vdFactor;
    tugCable += roomTugLength;
    
    // TUE dedicated cables
    room.tues.forEach(tue => {
      const tueVD = 1 + (distQD * 0.03); // TUEs are more sensitive to voltage drop
      const cableMultiplier = 3; // Phase + Neutral + Ground
      const tueLength = (distQD + 5) * cableMultiplier * tueVD;
      
      if (tue.power >= 5000) {
        // High power (Showers, etc.) use 6.0mm²
        // In some regions 220V 2 phases + Ground = 3 wires
        materials.find(m => m.id === 'cable-6.0') 
          ? (materials.find(m => m.id === 'cable-6.0')!.quantity += Math.ceil(tueLength))
          : materials.push({ id: 'cable-6.0', name: 'Cabo Flexível 6.0mm² (TUE Pesado)', quantity: Math.ceil(tueLength), unit: 'm', category: 'cable' });
      } else {
        // Standard TUEs (AC, Microwave) use 4.0mm² or 2.5mm²
        // We'll group them for now or use 4.0mm² for safety
        materials.find(m => m.id === 'cable-4.0')
          ? (materials.find(m => m.id === 'cable-4.0')!.quantity += Math.ceil(tueLength))
          : materials.push({ id: 'cable-4.0', name: 'Cabo Flexível 4.0mm² (TUE Ar/Micro)', quantity: Math.ceil(tueLength), unit: 'm', category: 'cable' });
      }
    });
  });

  // Entrada de Serviço (Opcional - Baseado no modelo selecionado)
  if (poleModel) {
    poleModel.items.forEach(item => {
      materials.push({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category
      });
    });
  }
    
  if (rooms.length > 0) {
    // Quadro e Proteção
    materials.push(
      { id: 'quadro-12', name: 'Quadro de Distribuição (12 disjuntores)', quantity: 1, unit: 'un', category: 'box' },
      { id: 'dr-40a', name: 'Dispositivo DR 40A 30mA (Geral)', quantity: 1, unit: 'un', category: 'breaker' },
      { id: 'dps-20ka', name: 'Dispositivo DPS 20kA', quantity: 3, unit: 'un', category: 'breaker' },
      { id: 'busbar-pente', name: 'Barramento Pente Bifásico', quantity: 1, unit: 'un', category: 'breaker' }
    );
      
    // Condutores e Infra
    materials.push(
      { id: 'cable-1.5', name: 'Cabo Flexível 1.5mm² (Iluminação)', quantity: Math.ceil(lightingCable), unit: 'm', category: 'cable' },
      { id: 'cable-2.5', name: 'Cabo Flexível 2.5mm² (Tomadas)', quantity: Math.ceil(tugCable), unit: 'm', category: 'cable' },
      { id: 'conduit-20', name: 'Eletroduto Flexível 20mm (3/4")', quantity: Math.ceil(conduit20), unit: 'm', category: 'conduit' },
      { id: 'conduit-25', name: 'Eletroduto Flexível 25mm (1")', quantity: Math.ceil(conduit25), unit: 'm', category: 'conduit' },
      { id: 'box-4x2', name: 'Caixa de Passagem 4x2', quantity: total4x2Boxes, unit: 'pç', category: 'box' },
      { id: 'box-octo', name: 'Caixa Octogonal de Teto', quantity: totalOctagonalBoxes, unit: 'pç', category: 'box' }
    );
      
    // Acabamentos
    materials.push(
      { id: 'switch-simple', name: 'Interruptor Simples (Teclas)', quantity: totalSwitches, unit: 'un', category: 'device' },
      { id: 'socket-10a', name: 'Tomada 2P+T 10A (TUG)', quantity: totalSockets10A, unit: 'un', category: 'device' },
      { id: 'socket-20a', name: 'Tomada 2P+T 20A (TUE)', quantity: totalSockets20A, unit: 'un', category: 'device' }
    );
      
    // Disjuntores
    materials.push(
      { id: 'breaker-10', name: 'Disjuntor Termomagnético 10A (Ilum.)', quantity: 1, unit: 'un', category: 'breaker' },
      { id: 'breaker-20', name: 'Disjuntor Termomagnético 20A (Tomadas)', quantity: Math.max(1, Math.ceil(rooms.length / 3)), unit: 'un', category: 'breaker' }
    );

    // Adiciona disjuntores de maior corrente se houver TUEs pesados
    const hasStrongTue = rooms.some(r => r.tues.some(t => t.power >= 5000));
    if (hasStrongTue) {
      materials.push({ id: 'breaker-40', name: 'Disjuntor Termomagnético 40A', quantity: 1, unit: 'un', category: 'breaker' });
    }
  }

  return materials.filter(m => m.quantity > 0);
}

export interface GroupedMaterials {
  roomName: string;
  roomArea: number;
  materials: MaterialItem[];
}

export interface DetailedMaterialList {
  byRoom: GroupedMaterials[];
  serviceEntrance: MaterialItem[];
  commonItems: MaterialItem[];
  totalArea: number;
}

export function generateDetailedMaterialList(rooms: Room[], poleModel: EntryPoleModel | null = null): DetailedMaterialList {
  const result: DetailedMaterialList = {
    byRoom: [],
    serviceEntrance: [],
    commonItems: [],
    totalArea: rooms.reduce((acc, r) => acc + r.area, 0)
  };

  // 1. Service Entrance (Padrão de Entrada)
  if (poleModel) {
    result.serviceEntrance = poleModel.items.map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category
    }));
  }

  // 2. By Room
  rooms.forEach(room => {
    const roomMaterials: MaterialItem[] = [];
    
    // Boxes and Devices
    roomMaterials.push({ id: 'box-octo', name: 'Caixa Octogonal de Teto', quantity: 1, unit: 'pç', category: 'box' });
    roomMaterials.push({ id: 'switch-simple', name: 'Interruptor Simples', quantity: 1, unit: 'un', category: 'device' });
    roomMaterials.push({ id: 'socket-10a', name: 'Tomada 10A (TUG)', quantity: room.tugs, unit: 'un', category: 'device' });
    
    const tuesWithSockets = room.tues.filter(t => t.power < 5000);
    if (tuesWithSockets.length > 0) {
      roomMaterials.push({ id: 'socket-20a', name: 'Tomada 20A (TUE)', quantity: tuesWithSockets.length, unit: 'un', category: 'device' });
    }
    
    roomMaterials.push({ id: 'box-4x2', name: 'Caixa de Passagem 4x2', quantity: room.tugs + tuesWithSockets.length + 1, unit: 'pç', category: 'box' });

    // Conduit and Cables (simplified for room view)
    const distQD = Math.sqrt(room.area) + 6;
    const roomConduit = distQD + (1 + room.tugs + room.tues.length) * 3.2;
    roomMaterials.push({ 
      id: 'conduit', 
      name: `Eletroduto estimado p/ ${room.name}`, 
      quantity: Math.ceil(roomConduit), 
      unit: 'm', 
      category: 'conduit' 
    });

    const lightingLength = (distQD + room.perimeter + 4) * 3 * (1 + distQD * 0.02);
    roomMaterials.push({ 
      id: 'cable-1.5', 
      name: 'Cabo 1.5mm² (Circuito Ilum.)', 
      quantity: Math.ceil(lightingLength), 
      unit: 'm', 
      category: 'cable' 
    });

    const tugLength = (distQD + room.perimeter + 6) * 3 * (1 + distQD * 0.02);
    roomMaterials.push({ 
      id: 'cable-2.5', 
      name: 'Cabo 2.5mm² (Circuito Tomadas)', 
      quantity: Math.ceil(tugLength), 
      unit: 'm', 
      category: 'cable' 
    });

    // TUE dedicated cables
    room.tues.forEach(tue => {
      const tueVD = 1 + (distQD * 0.03);
      const tueLength = (distQD + 5) * 3 * tueVD;
      const gauge = tue.power >= 5000 ? '6.0mm²' : '4.0mm²';
      roomMaterials.push({ 
        id: `cable-${gauge}`, 
        name: `Cabo ${gauge} (Circuito ${tue.description})`, 
        quantity: Math.ceil(tueLength), 
        unit: 'm', 
        category: 'cable' 
      });
    });

    result.byRoom.push({
      roomName: room.name,
      roomArea: room.area,
      materials: roomMaterials
    });
  });

  // 3. Common Items (Quadro, Proteção, etc.)
  if (rooms.length > 0) {
    result.commonItems.push(
      { id: 'quadro-12', name: 'Quadro de Distribuição (Geral)', quantity: 1, unit: 'un', category: 'box' },
      { id: 'dr-40a', name: 'Dispositivo DR 40A (Geral)', quantity: 1, unit: 'un', category: 'breaker' },
      { id: 'dps-20ka', name: 'Dispositivo DPS 20kA', quantity: 3, unit: 'un', category: 'breaker' },
      { id: 'breaker-10', name: 'Disjuntor 10A (Iluminação)', quantity: 1, unit: 'un', category: 'breaker' },
      { id: 'breaker-20', name: 'Disjuntor 20A (Tomadas)', quantity: Math.max(1, Math.ceil(rooms.length / 3)), unit: 'un', category: 'breaker' }
    );

    const hasStrongTue = rooms.some(r => r.tues.some(t => t.power >= 5000));
    if (hasStrongTue) {
      result.commonItems.push({ id: 'breaker-40', name: 'Disjuntor 40A (TUEs Chirveiro/Ar)', quantity: 1, unit: 'un', category: 'breaker' });
    }
  }

  return result;
}
