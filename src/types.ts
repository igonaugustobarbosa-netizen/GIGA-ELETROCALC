/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Room {
  id: string;
  name: string;
  area: number; // m2
  perimeter: number; // m
  type: 'kitchen' | 'living' | 'bedroom' | 'bathroom' | 'laundry' | 'hallway' | 'other';
  lights: number; // VA
  lightsLength?: number; // m
  lightsGauge?: number; // mm2
  tugs: number; // General Purpose Outlets
  tugsLength?: number; // m
  tugsGauge?: number; // mm2
  tues: TUE[]; // Specific Purpose Outlets
}

export interface TUE {
  id: string;
  description: string;
  power: number; // Watts
  voltage: 127 | 220;
  cableLength?: number; // m
  cableGauge?: number; // mm2
}

export interface MaterialItem {
  id: string; // Add ID for better tracking in catalog
  name: string;
  quantity: number;
  unit: string;
  category: 'cable' | 'conduit' | 'box' | 'breaker' | 'device';
  unitPrice?: number;
}

export interface EntryPoleModel {
  id: string;
  name: string;
  items: {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    category: 'cable' | 'conduit' | 'box' | 'breaker' | 'device';
  }[];
}

export interface TechnicianInfo {
  id: string;
  name: string;
  license: string; // CREA, CFT, etc.
  phone: string;
}

export interface Project {
  id: string;
  name: string;
  rooms: Room[];
  customMaterials: ProjectMaterial[];
  selectedPoleModelId: string | null;
  serviceEntranceLength?: number; // m
  serviceEntranceGauge?: number; // mm2
  calculateOnlyPole: boolean;
  floorPlanImage?: string;
  unifilarDiagramImage?: string;
  electricalDiagramImage?: string;
  technician?: TechnicianInfo;
  createdAt: number;
}

export interface ProjectMaterial {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}
