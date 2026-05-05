/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Zap, 
  Info, 
  Edit2,
  ChevronRight, 
  X, 
  Save, 
  FileText,
  Calculator,
  LayoutDashboard,
  Box,
  Cable,
  Home,
  Sofa,
  Bed,
  Utensils,
  Bath,
  WashingMachine,
  Layout,
  FileSpreadsheet,
  Settings,
  FileDown,
  Upload,
  Camera,
  Menu,
  ChevronLeft,
  Loader2,
  User,
  RotateCw,
  Ruler,
  Maximize2,
  Square,
  Check,
  MousePointer2,
  Undo2,
  ZoomIn,
  ZoomOut,
  MessageSquare,
  GitCommit,
  GitMerge,
  Edit
} from 'lucide-react';
import { Area } from "react-easy-crop";
import { ImageCropper } from "./components/ImageCropper";
import { getCroppedImg } from "./lib/imageUtils";
import { motion, AnimatePresence } from 'motion/react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RecharsTooltip } from 'recharts';
import { cn } from './lib/utils';
import { Room, MaterialItem, TUE, Project, ProjectMaterial, EntryPoleModel, TechnicianInfo } from './types';
import { calculateRoomRequirements, generateMaterialList, generateDetailedMaterialList, prepareDiagramData } from './services/electricalLogic';
import { generateElectricalPDF, generateDetailedElectricalPDF, generateSingleLineDiagramPDF, generateFloorPlanPDF } from './services/pdfService';
import { ROOM_TYPES, DEFAULT_CATALOG, CATALOG_NAMES } from './constants';
import { calculateVoltageDrop } from './services/voltageDrop';

const RoomIcon = ({ type, className }: { type: string; className?: string }) => {
  switch (type) {
    case 'living': return <Sofa className={className} />;
    case 'bedroom': return <Bed className={className} />;
    case 'kitchen': return <Utensils className={className} />;
    case 'bathroom': return <Bath className={className} />;
    case 'laundry': return <WashingMachine className={className} />;
    case 'hallway': return <ChevronRight className={className} />;
    default: return <Layout className={className} />;
  }
};

export default function App() {
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('eletrocalc_projects') : null;
    if (saved === null) {
      const firstProject: Project = {
        id: Math.random().toString(36).substr(2, 9),
        name: `Projeto 001`,
        rooms: [],
        customMaterials: [],
        selectedPoleModelId: 'default-trifasico',
        serviceEntranceLength: 10,
        serviceEntranceGauge: 16,
        calculateOnlyPole: false,
        createdAt: Date.now(),
        updatedAt: new Date().toISOString()
      };
      return [firstProject];
    }
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Erro ao carregar projetos:", e);
      return [];
    }
  });
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [customMaterials, setCustomMaterials] = useState<ProjectMaterial[]>([]);
  const [isAddingRoom, setIsAddingRoom] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [isAddingTechnician, setIsAddingTechnician] = useState(false);
  const [editingTechId, setEditingTechId] = useState<string | null>(null);
  const [currentTech, setCurrentTech] = useState<TechnicianInfo>({ id: '', name: '', license: '', phone: '' });

  const handleTechDataChange = (field: keyof TechnicianInfo, value: any) => {
    setCurrentTech(prev => ({ ...prev, [field]: value }));
  };

  const saveTechnician = () => {
    if (!currentTech.name) {
      alert('Por favor, informe o nome do técnico.');
      return;
    }

    if (editingTechId) {
      const updatedTech = { ...currentTech, id: editingTechId };
      setTechnicians(prev => {
        const updated = prev.map(t => t.id === editingTechId ? updatedTech : t);
        return updated;
      });
      if (technician.id === editingTechId || !technician.id) {
        setTechnician(updatedTech);
        saveProject(undefined, undefined, undefined, undefined, undefined, undefined, updatedTech);
      }
    } else {
      const newTech = { ...currentTech, id: `tech-${Date.now()}` };
      setTechnicians(prev => [...prev, newTech]);
      setTechnician(newTech);
      saveProject(undefined, undefined, undefined, undefined, undefined, undefined, newTech);
    }

    setIsAddingTechnician(false);
    setEditingTechId(null);
    setCurrentTech({ id: '', name: '', license: '', phone: '' });
  };
  const [technician, setTechnician] = useState<TechnicianInfo>({ id: '', name: '', license: '', phone: '' });
  const [technicians, setTechnicians] = useState<TechnicianInfo[]>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('eletrocalc_technicians') : null;
    return saved ? JSON.parse(saved) : [];
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'rooms' | 'materials' | 'catalog' | 'technicians'>('rooms');
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [techToDelete, setTechToDelete] = useState<TechnicianInfo | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState("");
  const [catalog, setCatalog] = useState<Record<string, number>>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('eletrocalc_catalog') : null;
    return saved ? { ...DEFAULT_CATALOG, ...JSON.parse(saved) } : DEFAULT_CATALOG;
  });
  const [selectedPoleModelId, setSelectedPoleModelId] = useState<string | null>(null);
  const [floorPlanImage, setFloorPlanImage] = useState<string | undefined>(undefined);
  const [calibrationRatio, setCalibrationRatio] = useState<number | undefined>(undefined);
  const [calibrationInput, setCalibrationInput] = useState<string>("5");
  const [showCalibrationInput, setShowCalibrationInput] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [isMeasuringArea, setIsMeasuringArea] = useState(false);
  const [activePoints, setActivePoints] = useState<{x: number, y: number}[]>([]);
  const [measurementResult, setMeasurementResult] = useState<{ area: number; perimeter: number } | null>(null);

  const [serviceEntranceLength, setServiceEntranceLength] = useState<number>(10);
  const [serviceEntranceGauge, setServiceEntranceGauge] = useState<number>(16);
  const [isAddingCatalogItem, setIsAddingCatalogItem] = useState(false);
  const [newCatalogItem, setNewCatalogItem] = useState({ name: '', category: 'cable', price: 0 });
  const [calculateOnlyPole, setCalculateOnlyPole] = useState(false);
  const [poleModels, setPoleModels] = useState<EntryPoleModel[]>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('eletrocalc_pole_models') : null;
    return saved ? JSON.parse(saved) : [
    {
      id: 'trifasico-127-220v-100a-subterraneo',
      name: 'Trifásico 127/220V 100A Subterrâneo',
      items: [
        { id: 'caixa-copel-trifasica-sub', name: 'Caixa de Medição Trifásica Padrão Copel (Subterrânea)', quantity: 1, unit: 'un', category: 'box' },
        { id: 'breaker-tripolar-100', name: 'Disjuntor Tripolar 100A', quantity: 1, unit: 'un', category: 'breaker' },
        { id: 'cabo-cobre-50', name: 'Cabo Cobre 50 mm² (3 Fases + Neutro)', quantity: 20, unit: 'm', category: 'cable' },
        { id: 'caixa-passagem-copel', name: 'Caixa de Passagem (Calçada/Padrão Copel)', quantity: 1, unit: 'un', category: 'box' },
        { id: 'conector-emenda', name: 'Conectores de Emenda', quantity: 4, unit: 'un', category: 'device' },
        { id: 'haste-copel-2.4', name: 'Haste de Aterramento 2,4 m', quantity: 1, unit: 'un', category: 'device' },
        { id: 'cabo-aterro-16', name: 'Cabo Verde 16 mm²', quantity: 10, unit: 'm', category: 'cable' },
        { id: 'conector-grampo-u', name: 'Conector de Aterramento (Grampo)', quantity: 1, unit: 'un', category: 'device' },
        { id: 'eletroduto-pvc-rigid-2', name: 'Eletroduto PVC Rígido 2"', quantity: 2, unit: 'un', category: 'conduit' },
        { id: 'curva-pvc-longa-2', name: 'Curvas Longas 90° 2"', quantity: 2, unit: 'un', category: 'conduit' },
        { id: 'luva-eletroduto-2', name: 'Luvas 2"', quantity: 2, unit: 'un', category: 'conduit' },
        { id: 'bucha-arruela-kit', name: 'Bucha + Arruela', quantity: 2, unit: 'un', category: 'device' },
        { id: 'tampa-reforcada', name: 'Tampa Reforçada para Caixa de Passagem', quantity: 1, unit: 'un', category: 'device' },
        { id: 'areia-media', name: 'Areia Média (Base e Proteção)', quantity: 1, unit: 'un', category: 'device' },
        { id: 'fita-advertencia', name: 'Fita de Advertência Elétrica', quantity: 1, unit: 'un', category: 'device' }
      ]
    },
    {
      id: 'trifasico-127-220v-80a-subterraneo',
      name: 'Trifásico 127/220V 80A Subterrâneo',
      items: [
        { id: 'caixa-copel-trifasica-sub', name: 'Caixa de Medição Trifásica Padrão Copel (Subterrânea)', quantity: 1, unit: 'un', category: 'box' },
        { id: 'breaker-tripolar-80', name: 'Disjuntor Tripolar 80A', quantity: 1, unit: 'un', category: 'breaker' },
        { id: 'cabo-cobre-35', name: 'Cabo Cobre 35 mm² (3 Fases + Neutro)', quantity: 20, unit: 'm', category: 'cable' },
        { id: 'caixa-passagem-copel', name: 'Caixa de Passagem (Calçada/Padrão Copel)', quantity: 1, unit: 'un', category: 'box' },
        { id: 'conector-emenda', name: 'Conectores de Emenda', quantity: 4, unit: 'un', category: 'device' },
        { id: 'haste-copel-2.4', name: 'Haste de Aterramento 2,4 m', quantity: 1, unit: 'un', category: 'device' },
        { id: 'cabo-aterro-16', name: 'Cabo Verde 16 mm²', quantity: 10, unit: 'm', category: 'cable' },
        { id: 'conector-grampo-u', name: 'Conector de Aterramento (Grampo)', quantity: 1, unit: 'un', category: 'device' },
        { id: 'eletroduto-pvc-rigid-2', name: 'Eletroduto PVC Rígido 2"', quantity: 2, unit: 'un', category: 'conduit' },
        { id: 'curva-pvc-longa-2', name: 'Curvas Longas 90° 2"', quantity: 2, unit: 'un', category: 'conduit' },
        { id: 'luva-eletroduto-2', name: 'Luvas 2"', quantity: 2, unit: 'un', category: 'conduit' },
        { id: 'bucha-arruela-kit', name: 'Bucha + Arruela', quantity: 2, unit: 'un', category: 'device' },
        { id: 'tampa-reforcada', name: 'Tampa Reforçada para Caixa de Passagem', quantity: 1, unit: 'un', category: 'device' },
        { id: 'areia-media', name: 'Areia Média (Base e Proteção)', quantity: 1, unit: 'un', category: 'device' },
        { id: 'fita-advertencia', name: 'Fita de Advertência Elétrica', quantity: 1, unit: 'un', category: 'device' }
      ]
    },
    {
      id: 'trifasico-127-220v-63a-subterraneo',
      name: 'Trifásico 127/220V 63A Subterrâneo',
      items: [
        { id: 'caixa-copel-trifasica-sub', name: 'Caixa de Medição Trifásica Padrão Copel (Subterrânea)', quantity: 1, unit: 'un', category: 'box' },
        { id: 'breaker-tripolar-63', name: 'Disjuntor Tripolar 63A', quantity: 1, unit: 'un', category: 'breaker' },
        { id: 'cabo-cobre-25', name: 'Cabo Cobre 25 mm² (3 Fases + Neutro)', quantity: 20, unit: 'm', category: 'cable' },
        { id: 'caixa-passagem-copel', name: 'Caixa de Passagem (Calçada/Padrão Copel)', quantity: 1, unit: 'un', category: 'box' },
        { id: 'conector-emenda', name: 'Conectores de Emenda', quantity: 4, unit: 'un', category: 'device' },
        { id: 'haste-copel-2.4', name: 'Haste de Aterramento 2,4 m', quantity: 1, unit: 'un', category: 'device' },
        { id: 'cabo-aterro-16', name: 'Cabo Verde 16 mm²', quantity: 10, unit: 'm', category: 'cable' },
        { id: 'conector-grampo-u', name: 'Conector de Aterramento (Grampo)', quantity: 1, unit: 'un', category: 'device' },
        { id: 'eletroduto-pvc-rigid-2', name: 'Eletroduto PVC Rígido 2"', quantity: 2, unit: 'un', category: 'conduit' },
        { id: 'curva-pvc-longa-2', name: 'Curvas Longas 90° 2"', quantity: 2, unit: 'un', category: 'conduit' },
        { id: 'luva-eletroduto-2', name: 'Luvas 2"', quantity: 2, unit: 'un', category: 'conduit' },
        { id: 'bucha-arruela-kit', name: 'Bucha + Arruela', quantity: 2, unit: 'un', category: 'device' },
        { id: 'tampa-reforcada', name: 'Tampa Reforçada para Caixa de Passagem', quantity: 1, unit: 'un', category: 'device' },
        { id: 'areia-media', name: 'Areia Média (Base e Proteção)', quantity: 1, unit: 'un', category: 'device' },
        { id: 'fita-advertencia', name: 'Fita de Advertência Elétrica', quantity: 1, unit: 'un', category: 'device' }
      ]
    },
    {
      id: 'trifasico-127-220v-50a-subterraneo',
      name: 'Trifásico 127/220V 50A Subterrâneo',
      items: [
        { id: 'caixa-copel-trifasica-sub', name: 'Caixa de Medição Trifásica Padrão Copel (Subterrânea)', quantity: 1, unit: 'un', category: 'box' },
        { id: 'breaker-tripolar-50', name: 'Disjuntor Tripolar 50A', quantity: 1, unit: 'un', category: 'breaker' },
        { id: 'cabo-cobre-16', name: 'Cabo Cobre 16 mm² (3 Fases + Neutro)', quantity: 20, unit: 'm', category: 'cable' },
        { id: 'caixa-passagem-copel', name: 'Caixa de Passagem (Calçada/Padrão Copel)', quantity: 1, unit: 'un', category: 'box' },
        { id: 'conector-emenda', name: 'Conectores de Emenda', quantity: 4, unit: 'un', category: 'device' },
        { id: 'haste-copel-2.4', name: 'Haste de Aterramento 2,4 m', quantity: 1, unit: 'un', category: 'device' },
        { id: 'cabo-aterro-16', name: 'Cabo Verde 16 mm²', quantity: 10, unit: 'm', category: 'cable' },
        { id: 'conector-grampo-u', name: 'Conector de Aterramento (Grampo)', quantity: 1, unit: 'un', category: 'device' },
        { id: 'eletroduto-pvc-rigid-2', name: 'Eletroduto PVC Rígido 2"', quantity: 2, unit: 'un', category: 'conduit' },
        { id: 'curva-pvc-longa-2', name: 'Curvas Longas 90° 2"', quantity: 2, unit: 'un', category: 'conduit' },
        { id: 'luva-eletroduto-2', name: 'Luvas 2"', quantity: 2, unit: 'un', category: 'conduit' },
        { id: 'bucha-arruela-kit', name: 'Bucha + Arruela', quantity: 2, unit: 'un', category: 'device' },
        { id: 'tampa-reforcada', name: 'Tampa Reforçada para Caixa de Passagem', quantity: 1, unit: 'un', category: 'device' },
        { id: 'areia-media', name: 'Areia Média (Base e Proteção)', quantity: 1, unit: 'un', category: 'device' },
        { id: 'fita-advertencia', name: 'Fita de Advertência Elétrica', quantity: 1, unit: 'un', category: 'device' }
      ]
    },
    {
      id: 'bifasico-127-220v-63a-subterraneo',
      name: 'Bifásico 127/220V 63A Subterrâneo',
      items: [
        { id: 'caixa-copel-monofasica-sub', name: 'Caixa de Medição Bifásica Padrão Copel (Subterrânea)', quantity: 1, unit: 'un', category: 'box' },
        { id: 'breaker-bipolar-63', name: 'Disjuntor Bipolar 63A', quantity: 1, unit: 'un', category: 'breaker' },
        { id: 'cabo-cobre-25', name: 'Cabo Cobre 25 mm² (2 Fases + Neutro)', quantity: 20, unit: 'm', category: 'cable' },
        { id: 'caixa-passagem-copel', name: 'Caixa de Passagem (Calçada/Padrão Copel)', quantity: 1, unit: 'un', category: 'box' },
        { id: 'conector-emenda', name: 'Conectores de Emenda', quantity: 3, unit: 'un', category: 'device' },
        { id: 'haste-copel-2.4', name: 'Haste de Aterramento 2,4 m', quantity: 1, unit: 'un', category: 'device' },
        { id: 'cabo-aterro-16', name: 'Cabo Verde 16 mm²', quantity: 10, unit: 'm', category: 'cable' },
        { id: 'conector-grampo-u', name: 'Conector de Aterramento (Grampo)', quantity: 1, unit: 'un', category: 'device' },
        { id: 'eletroduto-pvc-rigid-2', name: 'Eletroduto PVC Rígido 2"', quantity: 2, unit: 'un', category: 'conduit' },
        { id: 'curva-pvc-longa-2', name: 'Curvas Longas 90° 2"', quantity: 2, unit: 'un', category: 'conduit' },
        { id: 'luva-eletroduto-2', name: 'Luvas 2"', quantity: 2, unit: 'un', category: 'conduit' },
        { id: 'bucha-arruela-kit', name: 'Bucha + Arruela', quantity: 2, unit: 'un', category: 'device' },
        { id: 'tampa-reforcada', name: 'Tampa Reforçada para Caixa de Passagem', quantity: 1, unit: 'un', category: 'device' },
        { id: 'areia-media', name: 'Areia Média (Base e Proteção)', quantity: 1, unit: 'un', category: 'device' },
        { id: 'fita-advertencia', name: 'Fita de Advertência Elétrica', quantity: 1, unit: 'un', category: 'device' }
      ]
    },
    {
      id: 'bifasico-127-220v-40a-subterraneo',
      name: 'Bifásico 127/220V 40A Subterrâneo',
      items: [
        { id: 'caixa-copel-monofasica-sub', name: 'Caixa de Medição Bifásica Padrão Copel (Subterrânea)', quantity: 1, unit: 'un', category: 'box' },
        { id: 'breaker-bipolar-40', name: 'Disjuntor Bipolar 40A', quantity: 1, unit: 'un', category: 'breaker' },
        { id: 'cabo-cobre-10', name: 'Cabo Cobre 10 mm² (Fases + Neutro)', quantity: 20, unit: 'm', category: 'cable' },
        { id: 'caixa-passagem-copel', name: 'Caixa de Passagem (Calçada/Padrão Copel)', quantity: 1, unit: 'un', category: 'box' },
        { id: 'conector-emenda', name: 'Conectores de Emenda', quantity: 3, unit: 'un', category: 'device' },
        { id: 'haste-copel-2.4', name: 'Haste de Aterramento 2,4 m', quantity: 1, unit: 'un', category: 'device' },
        { id: 'cabo-aterro-10', name: 'Cabo Verde 10 mm²', quantity: 10, unit: 'm', category: 'cable' },
        { id: 'conector-grampo-u', name: 'Conector de Aterramento (Grampo)', quantity: 1, unit: 'un', category: 'device' },
        { id: 'eletroduto-pvc-rigid-1.5', name: 'Eletroduto PVC Rígido 1 1/2"', quantity: 2, unit: 'un', category: 'conduit' },
        { id: 'curva-pvc-longa-1.5', name: 'Curvas Longas 90° 1 1/2"', quantity: 2, unit: 'un', category: 'conduit' },
        { id: 'luva-eletroduto-1.5', name: 'Luvas 1 1/2"', quantity: 2, unit: 'un', category: 'conduit' },
        { id: 'bucha-arruela-kit', name: 'Bucha + Arruela', quantity: 2, unit: 'un', category: 'device' },
        { id: 'tampa-reforcada', name: 'Tampa Reforçada para Caixa de Passagem', quantity: 1, unit: 'un', category: 'device' },
        { id: 'areia-media', name: 'Areia Média (Base e Proteção)', quantity: 1, unit: 'un', category: 'device' },
        { id: 'fita-advertencia', name: 'Fita de Advertência Elétrica', quantity: 1, unit: 'un', category: 'device' }
      ]
    },
    {
      id: 'monofasico-127v-50a-subterraneo',
      name: 'Monofásico 127V 50A Subterrâneo',
      items: [
        { id: 'caixa-copel-monofasica-sub', name: 'Caixa de Medição Monofásica Padrão Copel (Subterrânea)', quantity: 1, unit: 'un', category: 'box' },
        { id: 'breaker-monopolar-50', name: 'Disjuntor Monopolar 50A', quantity: 1, unit: 'un', category: 'breaker' },
        { id: 'cabo-cobre-16', name: 'Cabo Cobre 16 mm² (Fase + Neutro)', quantity: 20, unit: 'm', category: 'cable' },
        { id: 'caixa-passagem-copel', name: 'Caixa de Passagem (Calçada/Padrão Copel)', quantity: 1, unit: 'un', category: 'box' },
        { id: 'conector-emenda', name: 'Conectores de Emenda', quantity: 2, unit: 'un', category: 'device' },
        { id: 'haste-copel-2.4', name: 'Haste de Aterramento 2,4 m', quantity: 1, unit: 'un', category: 'device' },
        { id: 'cabo-aterro-10', name: 'Cabo Verde 10 mm²', quantity: 10, unit: 'm', category: 'cable' },
        { id: 'conector-grampo-u', name: 'Conector de Aterramento (Grampo)', quantity: 1, unit: 'un', category: 'device' },
        { id: 'eletroduto-pvc-rigid-1.5', name: 'Eletroduto PVC Rígido 1 1/2"', quantity: 2, unit: 'un', category: 'conduit' },
        { id: 'curva-pvc-longa-1.5', name: 'Curvas Longas 90° 1 1/2"', quantity: 2, unit: 'un', category: 'conduit' },
        { id: 'luva-eletroduto-1.5', name: 'Luvas 1 1/2"', quantity: 2, unit: 'un', category: 'conduit' },
        { id: 'bucha-arruela-kit', name: 'Bucha + Arruela', quantity: 2, unit: 'un', category: 'device' },
        { id: 'tampa-reforcada', name: 'Tampa Reforçada para Caixa de Passagem', quantity: 1, unit: 'un', category: 'device' },
        { id: 'areia-media', name: 'Areia Média (Base e Proteção)', quantity: 1, unit: 'un', category: 'device' },
        { id: 'fita-advertencia', name: 'Fita de Advertência Elétrica', quantity: 1, unit: 'un', category: 'device' }
      ]
    },
    {
      id: 'monofasico-127v-30a-subterraneo',
      name: 'Monofásico 127V 30A Subterrâneo',
      items: [
        { id: 'caixa-copel-monofasica-sub', name: 'Caixa de Medição Monofásica Padrão Copel (Subterrânea)', quantity: 1, unit: 'un', category: 'box' },
        { id: 'breaker-monopolar-30', name: 'Disjuntor Monopolar 30A', quantity: 1, unit: 'un', category: 'breaker' },
        { id: 'cabo-cobre-10', name: 'Cabo Cobre 10 mm² (Fase + Neutro)', quantity: 20, unit: 'm', category: 'cable' },
        { id: 'caixa-passagem-copel', name: 'Caixa de Passagem (Calçada/Padrão Copel)', quantity: 1, unit: 'un', category: 'box' },
        { id: 'conector-emenda', name: 'Conectores de Emenda', quantity: 2, unit: 'un', category: 'device' },
        { id: 'haste-copel-2.4', name: 'Haste de Aterramento 2,4 m', quantity: 1, unit: 'un', category: 'device' },
        { id: 'cabo-aterro-10', name: 'Cabo Verde 10 mm²', quantity: 10, unit: 'm', category: 'cable' },
        { id: 'conector-grampo-u', name: 'Conector de Aterramento (Grampo)', quantity: 1, unit: 'un', category: 'device' },
        { id: 'eletroduto-pvc-rigid-1.5', name: 'Eletroduto PVC Rígido 1 1/2"', quantity: 2, unit: 'un', category: 'conduit' },
        { id: 'curva-pvc-longa-1.5', name: 'Curvas Longas 90° 1 1/2"', quantity: 2, unit: 'un', category: 'conduit' },
        { id: 'luva-eletroduto-1.5', name: 'Luvas 1 1/2"', quantity: 2, unit: 'un', category: 'conduit' },
        { id: 'bucha-arruela-kit', name: 'Bucha + Arruela', quantity: 2, unit: 'un', category: 'device' },
        { id: 'tampa-reforcada', name: 'Tampa Reforçada para Caixa de Passagem', quantity: 1, unit: 'un', category: 'device' },
        { id: 'areia-media', name: 'Areia Média (Base e Proteção)', quantity: 1, unit: 'un', category: 'device' },
        { id: 'fita-advertencia', name: 'Fita de Advertência Elétrica', quantity: 1, unit: 'un', category: 'device' }
      ]
    },
    {
      id: 'monofasico-127v-aereo',
      name: 'Monofásico 127V 30A Aéreo',
      items: [
        { id: 'caixa-copel-monofasica', name: 'Caixa de Medição Monofásica Padrão Copel', quantity: 1, unit: 'un', category: 'box' },
        { id: 'breaker-monopolar-30', name: 'Disjuntor Monopolar 30A', quantity: 1, unit: 'un', category: 'breaker' },
        { id: 'cabo-multiplex-2x10', name: 'Cabo Multiplexado Alumínio 2x10 mm²', quantity: 20, unit: 'm', category: 'cable' },
        { id: 'conector-ipc', name: 'Conectores Perfurantes (IPC)', quantity: 2, unit: 'un', category: 'device' },
        { id: 'parafuso-olhal', name: 'Parafuso Olhal (Ancoragem)', quantity: 1, unit: 'un', category: 'device' },
        { id: 'roldana-isolador', name: 'Roldanas', quantity: 2, unit: 'un', category: 'device' },
        { id: 'cordoalha-aco', name: 'Cordoalha de Aço Galvanizado', quantity: 5, unit: 'm', category: 'cable' },
        { id: 'haste-copel-2.4', name: 'Haste de Aterramento 2,4 m', quantity: 1, unit: 'un', category: 'device' },
        { id: 'cabo-aterro-10', name: 'Cabo Verde 10 mm²', quantity: 10, unit: 'm', category: 'cable' },
        { id: 'conector-grampo-u', name: 'Conector de Aterramento (Grampo)', quantity: 1, unit: 'un', category: 'device' },
        { id: 'eletroduto-pvc-rigid-1.5', name: 'Eletroduto PVC Rígido 1 1/2" (Barras)', quantity: 3, unit: 'un', category: 'conduit' },
        { id: 'curva-pvc-90-2', name: 'Curvas 90°', quantity: 2, unit: 'un', category: 'conduit' },
        { id: 'luva-eletroduto-2', name: 'Luvas', quantity: 3, unit: 'un', category: 'conduit' },
        { id: 'bucha-arruela-kit', name: 'Bucha + Arruela', quantity: 2, unit: 'un', category: 'device' },
        { id: 'abracadeira-tipo-d', name: 'Abraçadeiras', quantity: 6, unit: 'un', category: 'device' },
        { id: 'parafuso-bucha-kit', name: 'Parafusos com Bucha', quantity: 6, unit: 'un', category: 'device' },
        { id: 'poste-concreto-8m', name: 'Poste de Concreto 7 a 9 m', quantity: 1, unit: 'un', category: 'device' }
      ]
    },
    {
      id: 'monofasico-127v-40a-aereo',
      name: 'Monofásico 127V 40A Aéreo',
      items: [
        { id: 'caixa-copel-monofasica', name: 'Caixa de Medição Monofásica Padrão Copel', quantity: 1, unit: 'un', category: 'box' },
        { id: 'breaker-monopolar-40', name: 'Disjuntor Monopolar 40A', quantity: 1, unit: 'un', category: 'breaker' },
        { id: 'cabo-multiplex-2x16', name: 'Cabo Multiplexado Alumínio 2x16 mm²', quantity: 20, unit: 'm', category: 'cable' },
        { id: 'conector-ipc', name: 'Conectores Perfurantes (IPC)', quantity: 2, unit: 'un', category: 'device' },
        { id: 'parafuso-olhal', name: 'Parafuso Olhal (Ancoragem)', quantity: 1, unit: 'un', category: 'device' },
        { id: 'roldana-isolador', name: 'Roldanas', quantity: 2, unit: 'un', category: 'device' },
        { id: 'cordoalha-aco', name: 'Cordoalha de Aço Galvanizado', quantity: 5, unit: 'm', category: 'cable' },
        { id: 'haste-copel-2.4', name: 'Haste de Aterramento 2,4 m', quantity: 1, unit: 'un', category: 'device' },
        { id: 'cabo-aterro-10', name: 'Cabo Verde 10 mm²', quantity: 10, unit: 'm', category: 'cable' },
        { id: 'conector-grampo-u', name: 'Conector de Aterramento (Grampo)', quantity: 1, unit: 'un', category: 'device' },
        { id: 'eletroduto-pvc-rigid-1.5', name: 'Eletroduto PVC Rígido 1 1/2" (Barras)', quantity: 3, unit: 'un', category: 'conduit' },
        { id: 'curva-pvc-90-2', name: 'Curvas 90°', quantity: 2, unit: 'un', category: 'conduit' },
        { id: 'luva-eletroduto-2', name: 'Luvas', quantity: 3, unit: 'un', category: 'conduit' },
        { id: 'bucha-arruela-kit', name: 'Bucha + Arruela', quantity: 2, unit: 'un', category: 'device' },
        { id: 'abracadeira-tipo-d', name: 'Abraçadeiras', quantity: 6, unit: 'un', category: 'device' },
        { id: 'parafuso-bucha-kit', name: 'Parafusos com Bucha', quantity: 6, unit: 'un', category: 'device' },
        { id: 'poste-concreto-8m', name: 'Poste de Concreto 7 a 9 m', quantity: 1, unit: 'un', category: 'device' }
      ]
    },
    {
      id: 'monofasico-127v-50a-aereo',
      name: 'Monofásico 127V 50A Aéreo',
      items: [
        { id: 'caixa-copel-monofasica', name: 'Caixa de Medição Monofásica Padrão Copel', quantity: 1, unit: 'un', category: 'box' },
        { id: 'breaker-monopolar-50', name: 'Disjuntor Monopolar 50A', quantity: 1, unit: 'un', category: 'breaker' },
        { id: 'cabo-multiplex-2x16', name: 'Cabo Multiplexado Alumínio 2x16 mm²', quantity: 20, unit: 'm', category: 'cable' },
        { id: 'conector-ipc', name: 'Conectores Perfurantes (IPC)', quantity: 2, unit: 'un', category: 'device' },
        { id: 'parafuso-olhal', name: 'Parafuso Olhal (Ancoragem)', quantity: 1, unit: 'un', category: 'device' },
        { id: 'roldana-isolador', name: 'Roldanas', quantity: 2, unit: 'un', category: 'device' },
        { id: 'cordoalha-aco', name: 'Cordoalha de Aço Galvanizado', quantity: 5, unit: 'm', category: 'cable' },
        { id: 'haste-copel-2.4', name: 'Haste de Aterramento 2,4 m', quantity: 1, unit: 'un', category: 'device' },
        { id: 'cabo-aterro-10', name: 'Cabo Verde 10 mm²', quantity: 10, unit: 'm', category: 'cable' },
        { id: 'conector-grampo-u', name: 'Conector de Aterramento (Grampo)', quantity: 1, unit: 'un', category: 'device' },
        { id: 'eletroduto-pvc-rigid-1.5', name: 'Eletroduto PVC Rígido 1 1/2" (Barras)', quantity: 3, unit: 'un', category: 'conduit' },
        { id: 'curva-pvc-90-2', name: 'Curvas 90°', quantity: 2, unit: 'un', category: 'conduit' },
        { id: 'luva-eletroduto-2', name: 'Luvas', quantity: 3, unit: 'un', category: 'conduit' },
        { id: 'bucha-arruela-kit', name: 'Bucha + Arruela', quantity: 2, unit: 'un', category: 'device' },
        { id: 'abracadeira-tipo-d', name: 'Abraçadeiras', quantity: 6, unit: 'un', category: 'device' },
        { id: 'parafuso-bucha-kit', name: 'Parafusos com Bucha', quantity: 6, unit: 'un', category: 'device' },
        { id: 'poste-concreto-8m', name: 'Poste de Concreto 7 a 9 m', quantity: 1, unit: 'un', category: 'device' }
      ]
    },
    {
      id: 'bifasico-110-220v-40a-aereo',
      name: 'Bifásico 110/220V 40A Aéreo',
      items: [
        { id: 'caixa-copel-bifasica', name: 'Caixa de Medição Bifásica Padrão Copel', quantity: 1, unit: 'un', category: 'box' },
        { id: 'breaker-bipolar-40', name: 'Disjuntor Bipolar 40A', quantity: 1, unit: 'un', category: 'breaker' },
        { id: 'cabo-multiplex-3x16', name: 'Cabo Multiplexado Alumínio 3x16 mm²', quantity: 20, unit: 'm', category: 'cable' },
        { id: 'conector-ipc', name: 'Conectores Perfurantes (IPC)', quantity: 3, unit: 'un', category: 'device' },
        { id: 'parafuso-olhal', name: 'Parafuso Olhal (Ancoragem)', quantity: 1, unit: 'un', category: 'device' },
        { id: 'roldana-isolador', name: 'Roldanas', quantity: 2, unit: 'un', category: 'device' },
        { id: 'cordoalha-aco', name: 'Cordoalha de Aço Galvanizado', quantity: 5, unit: 'm', category: 'cable' },
        { id: 'haste-copel-2.4', name: 'Haste de Aterramento 2,4 m', quantity: 1, unit: 'un', category: 'device' },
        { id: 'cabo-aterro-16', name: 'Cabo Verde 16 mm²', quantity: 10, unit: 'm', category: 'cable' },
        { id: 'conector-grampo-u', name: 'Conector de Aterramento (Grampo)', quantity: 1, unit: 'un', category: 'device' },
        { id: 'eletroduto-pvc-rigid-2', name: 'Eletroduto PVC Rígido 2" (Barras)', quantity: 3, unit: 'un', category: 'conduit' },
        { id: 'curva-pvc-90-2', name: 'Curvas 90° 2"', quantity: 2, unit: 'un', category: 'conduit' },
        { id: 'luva-eletroduto-2', name: 'Luvas para Eletroduto 2"', quantity: 3, unit: 'un', category: 'conduit' },
        { id: 'bucha-arruela-kit', name: 'Bucha + Arruela', quantity: 2, unit: 'un', category: 'device' },
        { id: 'abracadeira-tipo-d', name: 'Abraçadeiras', quantity: 6, unit: 'un', category: 'device' },
        { id: 'parafuso-bucha-kit', name: 'Parafusos com Bucha', quantity: 6, unit: 'un', category: 'device' },
        { id: 'poste-concreto-8m', name: 'Poste de Concreto 7 a 9 m', quantity: 1, unit: 'un', category: 'device' }
      ]
    },
    {
      id: 'bifasico-110-220v-50a-aereo',
      name: 'Bifásico 110/220V 50A Aéreo',
      items: [
        { id: 'caixa-copel-bifasica', name: 'Caixa de Medição Bifásica Padrão Copel', quantity: 1, unit: 'un', category: 'box' },
        { id: 'breaker-bipolar-50', name: 'Disjuntor Bipolar 50A', quantity: 1, unit: 'un', category: 'breaker' },
        { id: 'cabo-multiplex-3x25', name: 'Cabo Multiplexado Alumínio 3x25 mm²', quantity: 20, unit: 'm', category: 'cable' },
        { id: 'conector-ipc', name: 'Conectores Perfurantes (IPC)', quantity: 3, unit: 'un', category: 'device' },
        { id: 'parafuso-olhal', name: 'Parafuso Olhal (Ancoragem)', quantity: 1, unit: 'un', category: 'device' },
        { id: 'roldana-isolador', name: 'Roldanas', quantity: 2, unit: 'un', category: 'device' },
        { id: 'cordoalha-aco', name: 'Cordoalha de Aço Galvanizado', quantity: 5, unit: 'm', category: 'cable' },
        { id: 'haste-copel-2.4', name: 'Haste de Aterramento 2,4 m', quantity: 1, unit: 'un', category: 'device' },
        { id: 'cabo-aterro-16', name: 'Cabo Verde 16 mm²', quantity: 10, unit: 'm', category: 'cable' },
        { id: 'conector-grampo-u', name: 'Conector de Aterramento (Grampo)', quantity: 1, unit: 'un', category: 'device' },
        { id: 'eletroduto-pvc-rigid-2', name: 'Eletroduto PVC Rígido 2" (Barras)', quantity: 3, unit: 'un', category: 'conduit' },
        { id: 'curva-pvc-90-2', name: 'Curvas 90°', quantity: 2, unit: 'un', category: 'conduit' },
        { id: 'luva-eletroduto-2', name: 'Luvas', quantity: 3, unit: 'un', category: 'conduit' },
        { id: 'bucha-arruela-kit', name: 'Bucha + Arruela', quantity: 2, unit: 'un', category: 'device' },
        { id: 'abracadeira-tipo-d', name: 'Abraçadeiras', quantity: 6, unit: 'un', category: 'device' },
        { id: 'parafuso-bucha-kit', name: 'Parafusos com Bucha', quantity: 6, unit: 'un', category: 'device' },
        { id: 'poste-concreto-8m', name: 'Poste de Concreto 7 a 9 m', quantity: 1, unit: 'un', category: 'device' }
      ]
    },
    {
      id: 'bifasico-110-220v-63a-aereo',
      name: 'Bifásico 110/220V 63A Aéreo',
      items: [
        { id: 'caixa-copel-bifasica', name: 'Caixa de Medição Bifásica Padrão Copel', quantity: 1, unit: 'un', category: 'box' },
        { id: 'breaker-bipolar-63', name: 'Disjuntor Bipolar 63A', quantity: 1, unit: 'un', category: 'breaker' },
        { id: 'cabo-multiplex-3x25', name: 'Cabo Multiplexado Alumínio 3x25 mm²', quantity: 20, unit: 'm', category: 'cable' },
        { id: 'conector-ipc', name: 'Conectores Perfurantes (IPC)', quantity: 3, unit: 'un', category: 'device' },
        { id: 'parafuso-olhal', name: 'Parafuso Olhal (Ancoragem)', quantity: 1, unit: 'un', category: 'device' },
        { id: 'roldana-isolador', name: 'Roldanas', quantity: 2, unit: 'un', category: 'device' },
        { id: 'cordoalha-aco', name: 'Cordoalha de Aço Galvanizado', quantity: 5, unit: 'm', category: 'cable' },
        { id: 'haste-copel-2.4', name: 'Haste de Aterramento 2,4 m', quantity: 1, unit: 'un', category: 'device' },
        { id: 'cabo-aterro-16', name: 'Cabo Verde 16 mm²', quantity: 10, unit: 'm', category: 'cable' },
        { id: 'conector-grampo-u', name: 'Conector de Aterramento (Grampo)', quantity: 1, unit: 'un', category: 'device' },
        { id: 'eletroduto-pvc-rigid-2', name: 'Eletroduto PVC Rígido 2" (Barras)', quantity: 3, unit: 'un', category: 'conduit' },
        { id: 'curva-pvc-90-2', name: 'Curvas 90°', quantity: 2, unit: 'un', category: 'conduit' },
        { id: 'luva-eletroduto-2', name: 'Luvas', quantity: 3, unit: 'un', category: 'conduit' },
        { id: 'bucha-arruela-kit', name: 'Bucha + Arruela', quantity: 2, unit: 'un', category: 'device' },
        { id: 'abracadeira-tipo-d', name: 'Abraçadeiras', quantity: 6, unit: 'un', category: 'device' },
        { id: 'parafuso-bucha-kit', name: 'Parafusos com Bucha', quantity: 6, unit: 'un', category: 'device' },
        { id: 'poste-concreto-8m', name: 'Poste de Concreto 7 a 9 m', quantity: 1, unit: 'un', category: 'device' }
      ]
    },
    {
      id: 'bifasico-110-220v-70a-aereo',
      name: 'Bifásico 110/220V 70A Aéreo',
      items: [
        { id: 'caixa-copel-bifasica', name: 'Caixa de Medição Bifásica Padrão Copel', quantity: 1, unit: 'un', category: 'box' },
        { id: 'breaker-bipolar-70', name: 'Disjuntor Bipolar 70A', quantity: 1, unit: 'un', category: 'breaker' },
        { id: 'cabo-multiplex-3x35', name: 'Cabo Multiplexado Alumínio 3x35 mm²', quantity: 20, unit: 'm', category: 'cable' },
        { id: 'conector-ipc', name: 'Conectores Perfurantes (IPC)', quantity: 3, unit: 'un', category: 'device' },
        { id: 'parafuso-olhal', name: 'Parafuso Olhal (Ancoragem)', quantity: 1, unit: 'un', category: 'device' },
        { id: 'roldana-isolador', name: 'Roldanas', quantity: 2, unit: 'un', category: 'device' },
        { id: 'cordoalha-aco', name: 'Cordoalha de Aço Galvanizado', quantity: 5, unit: 'm', category: 'cable' },
        { id: 'haste-copel-2.4', name: 'Haste de Aterramento 2,4 m', quantity: 1, unit: 'un', category: 'device' },
        { id: 'cabo-aterro-16', name: 'Cabo Verde 16 mm²', quantity: 10, unit: 'm', category: 'cable' },
        { id: 'conector-grampo-u', name: 'Conector de Aterramento (Grampo)', quantity: 1, unit: 'un', category: 'device' },
        { id: 'eletroduto-pvc-rigid-2', name: 'Eletroduto PVC Rígido 2" (Barras)', quantity: 3, unit: 'un', category: 'conduit' },
        { id: 'curva-pvc-90-2', name: 'Curvas 90°', quantity: 2, unit: 'un', category: 'conduit' },
        { id: 'luva-eletroduto-2', name: 'Luvas', quantity: 3, unit: 'un', category: 'conduit' },
        { id: 'bucha-arruela-kit', name: 'Bucha + Arruela', quantity: 2, unit: 'un', category: 'device' },
        { id: 'abracadeira-tipo-d', name: 'Abraçadeiras', quantity: 6, unit: 'un', category: 'device' },
        { id: 'parafuso-bucha-kit', name: 'Parafusos com Bucha', quantity: 6, unit: 'un', category: 'device' },
        { id: 'poste-concreto-8m', name: 'Poste de Concreto 7 a 9 m', quantity: 1, unit: 'un', category: 'device' }
      ]
    },
    {
      id: 'trifasico-127-220v-50a-aereo',
      name: 'Trifásico 127/220V 50A Aéreo',
      items: [
        { id: 'caixa-copel-trifasica', name: 'Caixa de Medição Trifásica Padrão Copel', quantity: 1, unit: 'un', category: 'box' },
        { id: 'breaker-tripolar-50', name: 'Disjuntor Tripolar 50A', quantity: 1, unit: 'un', category: 'breaker' },
        { id: 'cabo-multiplex-4x25', name: 'Cabo Multiplexado Alumínio 4x25 mm²', quantity: 20, unit: 'm', category: 'cable' },
        { id: 'conector-ipc', name: 'Conectores Perfurantes (IPC)', quantity: 4, unit: 'un', category: 'device' },
        { id: 'parafuso-olhal', name: 'Parafuso Olhal (Ancoragem)', quantity: 1, unit: 'un', category: 'device' },
        { id: 'roldana-isolador', name: 'Roldanas', quantity: 2, unit: 'un', category: 'device' },
        { id: 'cordoalha-aco', name: 'Cordoalha de Aço Galvanizado', quantity: 5, unit: 'm', category: 'cable' },
        { id: 'haste-copel-2.4', name: 'Haste de Aterramento 2,4 m', quantity: 1, unit: 'un', category: 'device' },
        { id: 'cabo-aterro-16', name: 'Cabo Verde 16 mm²', quantity: 10, unit: 'm', category: 'cable' },
        { id: 'conector-grampo-u', name: 'Conector de Aterramento (Grampo)', quantity: 1, unit: 'un', category: 'device' },
        { id: 'eletroduto-pvc-rigid-2', name: 'Eletroduto PVC Rígido 2" (Barras)', quantity: 3, unit: 'un', category: 'conduit' },
        { id: 'curva-pvc-90-2', name: 'Curvas 90°', quantity: 2, unit: 'un', category: 'conduit' },
        { id: 'luva-eletroduto-2', name: 'Luvas', quantity: 3, unit: 'un', category: 'conduit' },
        { id: 'bucha-arruela-kit', name: 'Bucha + Arruela', quantity: 2, unit: 'un', category: 'device' },
        { id: 'abracadeira-tipo-d', name: 'Abraçadeiras', quantity: 6, unit: 'un', category: 'device' },
        { id: 'parafuso-bucha-kit', name: 'Parafusos com Bucha', quantity: 6, unit: 'un', category: 'device' },
        { id: 'poste-concreto-8m', name: 'Poste de Concreto 7 a 9 m', quantity: 1, unit: 'un', category: 'device' }
      ]
    },
    {
      id: 'trifasico-127-220v-63a-aereo',
      name: 'Trifásico 127/220V 63A Aéreo',
      items: [
        { id: 'caixa-copel-trifasica', name: 'Caixa de Medição Trifásica Padrão Copel', quantity: 1, unit: 'un', category: 'box' },
        { id: 'breaker-tripolar-63', name: 'Disjuntor Tripolar 63A', quantity: 1, unit: 'un', category: 'breaker' },
        { id: 'cabo-multiplex-4x25', name: 'Cabo Multiplexado Alumínio 4x25 mm²', quantity: 20, unit: 'm', category: 'cable' },
        { id: 'conector-ipc', name: 'Conectores Perfurantes (IPC)', quantity: 4, unit: 'un', category: 'device' },
        { id: 'parafuso-olhal', name: 'Parafuso Olhal (Ancoragem)', quantity: 1, unit: 'un', category: 'device' },
        { id: 'roldana-isolador', name: 'Roldanas', quantity: 2, unit: 'un', category: 'device' },
        { id: 'cordoalha-aco', name: 'Cordoalha de Aço Galvanizado', quantity: 5, unit: 'm', category: 'cable' },
        { id: 'haste-copel-2.4', name: 'Haste de Aterramento 2,4 m', quantity: 1, unit: 'un', category: 'device' },
        { id: 'cabo-aterro-16', name: 'Cabo Verde 16 mm²', quantity: 10, unit: 'm', category: 'cable' },
        { id: 'conector-grampo-u', name: 'Conector de Aterramento (Grampo)', quantity: 1, unit: 'un', category: 'device' },
        { id: 'eletroduto-pvc-rigid-2', name: 'Eletroduto PVC Rígido 2" (Barras)', quantity: 3, unit: 'un', category: 'conduit' },
        { id: 'curva-pvc-90-2', name: 'Curvas 90°', quantity: 2, unit: 'un', category: 'conduit' },
        { id: 'luva-eletroduto-2', name: 'Luvas', quantity: 3, unit: 'un', category: 'conduit' },
        { id: 'bucha-arruela-kit', name: 'Bucha + Arruela', quantity: 2, unit: 'un', category: 'device' },
        { id: 'abracadeira-tipo-d', name: 'Abraçadeiras', quantity: 6, unit: 'un', category: 'device' },
        { id: 'parafuso-bucha-kit', name: 'Parafusos com Bucha', quantity: 6, unit: 'un', category: 'device' },
        { id: 'poste-concreto-8m', name: 'Poste de Concreto 7 a 9 m', quantity: 1, unit: 'un', category: 'device' }
      ]
    },
    {
      id: 'trifasico-127-220v-80a-aereo',
      name: 'Trifásico 127/220V 80A Aéreo',
      items: [
        { id: 'caixa-copel-trifasica', name: 'Caixa de Medição Trifásica Padrão Copel', quantity: 1, unit: 'un', category: 'box' },
        { id: 'breaker-tripolar-80', name: 'Disjuntor Tripolar 80A', quantity: 1, unit: 'un', category: 'breaker' },
        { id: 'cabo-multiplex-4x35', name: 'Cabo Multiplexado Alumínio 4x35 mm²', quantity: 20, unit: 'm', category: 'cable' },
        { id: 'conector-ipc', name: 'Conectores Perfurantes (IPC)', quantity: 4, unit: 'un', category: 'device' },
        { id: 'parafuso-olhal', name: 'Parafuso Olhal (Ancoragem)', quantity: 1, unit: 'un', category: 'device' },
        { id: 'roldana-isolador', name: 'Roldanas', quantity: 2, unit: 'un', category: 'device' },
        { id: 'cordoalha-aco', name: 'Cordoalha de Aço Galvanizado', quantity: 5, unit: 'm', category: 'cable' },
        { id: 'haste-copel-2.4', name: 'Haste de Aterramento 2,4 m', quantity: 1, unit: 'un', category: 'device' },
        { id: 'cabo-aterro-16', name: 'Cabo Verde 16 mm²', quantity: 10, unit: 'm', category: 'cable' },
        { id: 'conector-grampo-u', name: 'Conector de Aterramento (Grampo)', quantity: 1, unit: 'un', category: 'device' },
        { id: 'eletroduto-pvc-rigid-2', name: 'Eletroduto PVC Rígido 2" (Barras)', quantity: 3, unit: 'un', category: 'conduit' },
        { id: 'curva-pvc-90-2', name: 'Curvas 90°', quantity: 2, unit: 'un', category: 'conduit' },
        { id: 'luva-eletroduto-2', name: 'Luvas', quantity: 3, unit: 'un', category: 'conduit' },
        { id: 'bucha-arruela-kit', name: 'Bucha + Arruela', quantity: 2, unit: 'un', category: 'device' },
        { id: 'abracadeira-tipo-d', name: 'Abraçadeiras', quantity: 6, unit: 'un', category: 'device' },
        { id: 'parafuso-bucha-kit', name: 'Parafusos com Bucha', quantity: 6, unit: 'un', category: 'device' },
        { id: 'poste-concreto-8m', name: 'Poste de Concreto 7 a 9 m', quantity: 1, unit: 'un', category: 'device' }
      ]
    },
    {
      id: 'trifasico-127-220v-100a-aereo',
      name: 'Trifásico 127/220V 100A Aéreo',
      items: [
        { id: 'caixa-copel-trifasica', name: 'Caixa de Medição Trifásica Padrão Copel', quantity: 1, unit: 'un', category: 'box' },
        { id: 'breaker-tripolar-100', name: 'Disjuntor Tripolar 100A', quantity: 1, unit: 'un', category: 'breaker' },
        { id: 'cabo-multiplex-4x50', name: 'Cabo Multiplexado Alumínio 4x50 mm²', quantity: 20, unit: 'm', category: 'cable' },
        { id: 'conector-ipc', name: 'Conectores Perfurantes (IPC)', quantity: 4, unit: 'un', category: 'device' },
        { id: 'parafuso-olhal', name: 'Parafuso Olhal (Ancoragem)', quantity: 1, unit: 'un', category: 'device' },
        { id: 'roldana-isolador', name: 'Roldanas', quantity: 2, unit: 'un', category: 'device' },
        { id: 'cordoalha-aco', name: 'Cordoalha de Aço Galvanizado', quantity: 5, unit: 'm', category: 'cable' },
        { id: 'haste-copel-2.4', name: 'Haste de Aterramento 2,4 m', quantity: 1, unit: 'un', category: 'device' },
        { id: 'cabo-aterro-16', name: 'Cabo Verde 16 mm²', quantity: 10, unit: 'm', category: 'cable' },
        { id: 'conector-grampo-u', name: 'Conector de Aterramento (Grampo)', quantity: 1, unit: 'un', category: 'device' },
        { id: 'eletroduto-pvc-rigid-2', name: 'Eletroduto PVC Rígido 2" (Barras)', quantity: 3, unit: 'un', category: 'conduit' },
        { id: 'curva-pvc-90-2', name: 'Curvas 90°', quantity: 2, unit: 'un', category: 'conduit' },
        { id: 'luva-eletroduto-2', name: 'Luvas', quantity: 3, unit: 'un', category: 'conduit' },
        { id: 'bucha-arruela-kit', name: 'Bucha + Arruela', quantity: 2, unit: 'un', category: 'device' },
        { id: 'abracadeira-tipo-d', name: 'Abraçadeiras', quantity: 6, unit: 'un', category: 'device' },
        { id: 'parafuso-bucha-kit', name: 'Parafusos com Bucha', quantity: 6, unit: 'un', category: 'device' },
        { id: 'poste-concreto-8m', name: 'Poste de Concreto 7 a 9 m', quantity: 1, unit: 'un', category: 'device' }
      ]
    }
    ];
  });
  const [isManagingCatalog, setIsManagingCatalog] = useState(false);
  const [isManagingPoleModels, setIsManagingPoleModels] = useState(false);

  const categories = [
    { id: 'cable', name: 'Condutores', pattern: 'cable' },
    { id: 'breaker', name: 'Proteção', pattern: 'breaker|dr|dps|busbar' },
    { id: 'conduit', name: 'Infraestrutura', pattern: 'conduit|box|quadro' },
    { id: 'poste', name: 'Entrada e Aterramento', pattern: 'poste|caixa|haste|conector' },
    { id: 'socket', name: 'Dispositivos', pattern: 'socket|switch|lamp|plafon|soquete' },
    { id: 'chuveiro', name: 'Equipamentos e Outros', pattern: 'chuveiro|torneira|fita|bucha' },
    { id: 'other', name: 'Outros / Personalizados', pattern: 'custom' }
  ];

  useEffect(() => {
    localStorage.setItem('eletrocalc_catalog', JSON.stringify(catalog));
  }, [catalog]);

  useEffect(() => {
    localStorage.setItem('eletrocalc_pole_models', JSON.stringify(poleModels));
  }, [poleModels]);

  useEffect(() => {
    localStorage.setItem('eletrocalc_technicians', JSON.stringify(technicians));
  }, [technicians]);

  // Helper to format project number
  const formatProjectNumber = (num: number) => String(num).padStart(5, '0');

  // Handle first project creation
  useEffect(() => {
    // Only run initialization on mount or if there's no current project set
    if (projects.length === 0) {
      // Empty state handled in UI
    } else if (!currentProjectId) {
      setCurrentProjectId(projects[0].id);
      setRooms(projects[0].rooms);
      setCustomMaterials(projects[0].customMaterials || []);
      setSelectedPoleModelId(projects[0].selectedPoleModelId || null);
      setServiceEntranceLength(projects[0].serviceEntranceLength || 10);
      setServiceEntranceGauge(projects[0].serviceEntranceGauge || 16);
      setCalculateOnlyPole(projects[0].calculateOnlyPole || false);
      setFloorPlanImage(projects[0].floorPlanImage);
      setCalibrationRatio(projects[0].calibrationRatio);
      setTechnician(projects[0].technician || { id: '', name: '', license: '', phone: '' });
    }
  }, [projects.length, currentProjectId]);

  // Save specific project
  const saveProject = (
    updatedRooms?: Room[], 
    updatedCustom?: ProjectMaterial[], 
    updatedPoleId?: string | null, 
    updatedOnlyPole?: boolean, 
    updatedFloorPlan?: string,
    updatedCalibration?: number,
    updatedTechnician?: TechnicianInfo, 
    updatedSeLength?: number, 
    updatedSeGauge?: number
  ) => {
    const roomsToSave = updatedRooms || rooms;
    const customToSave = updatedCustom || customMaterials;
    const poleToSave = updatedPoleId !== undefined ? updatedPoleId : selectedPoleModelId;
    const onlyPoleToSave = updatedOnlyPole !== undefined ? updatedOnlyPole : calculateOnlyPole;
    const floorPlanToSave = updatedFloorPlan !== undefined ? updatedFloorPlan : floorPlanImage;
    const calibrationToSave = updatedCalibration !== undefined ? updatedCalibration : calibrationRatio;
    const technicianToSave = updatedTechnician !== undefined ? updatedTechnician : technician;
    const seLengthToSave = updatedSeLength !== undefined ? updatedSeLength : serviceEntranceLength;
    const seGaugeToSave = updatedSeGauge !== undefined ? updatedSeGauge : serviceEntranceGauge;

    try {
      if (currentProjectId) {
        setProjects(prev => {
          const updated = prev.map(p => 
            p.id === currentProjectId ? { 
              ...p, 
              rooms: roomsToSave, 
              customMaterials: customToSave, 
              selectedPoleModelId: poleToSave, 
              calculateOnlyPole: onlyPoleToSave, 
              floorPlanImage: floorPlanToSave,
              calibrationRatio: calibrationToSave,
              technician: technicianToSave,
              serviceEntranceLength: seLengthToSave,
              serviceEntranceGauge: seGaugeToSave
            } : p
          );
          localStorage.setItem('eletrocalc_projects', JSON.stringify(updated));
          return updated;
        });
      }
    } catch (e) {
      console.error("Erro ao salvar projeto:", e);
      if (e instanceof Error && e.name === 'QuotaExceededError') {
        alert("O armazenamento local está cheio. Tente remover arquivos de outros projetos ou usar imagens menores.");
      }
    }
  };

  const createNewProject = () => {
    const nextNumber = projects.length + 1;
    const newProject: Project = {
      id: Math.random().toString(36).substr(2, 9),
      name: `Projeto ${formatProjectNumber(nextNumber)}`,
      rooms: [],
      customMaterials: [],
      selectedPoleModelId: 'default-trifasico',
      serviceEntranceLength: 10,
      serviceEntranceGauge: 16,
      calculateOnlyPole: false,
      floorPlanImage: undefined,
      calibrationRatio: undefined,
      createdAt: Date.now()
    };
    const updatedProjects = [...projects, newProject];
    setProjects(updatedProjects);
    setCurrentProjectId(newProject.id);
    setSelectedPoleModelId('default-trifasico');
    setServiceEntranceLength(10);
    setServiceEntranceGauge(16);
    setCalculateOnlyPole(false);
    setFloorPlanImage(undefined);
    setTechnician({ id: '', name: '', license: '', phone: '' });
    setRooms([]);
    setCustomMaterials([]);
    localStorage.setItem('eletrocalc_projects', JSON.stringify(updatedProjects));
  };

  const renameProject = (id: string, newName: string) => {
    const updated = projects.map(p => p.id === id ? { ...p, name: newName } : p);
    setProjects(updated);
    localStorage.setItem('eletrocalc_projects', JSON.stringify(updated));
  };

  const deleteTechnician = (tech: TechnicianInfo) => {
    setTechnicians(prev => prev.filter(item => item.id !== tech.id));
    if (technician.id === tech.id) {
      const empty = { id: '', name: '', license: '', phone: '' };
      setTechnician(empty);
      saveProject(undefined, undefined, undefined, undefined, undefined, undefined, empty);
    }
    setTechToDelete(null);
  };

  const deleteProject = (id: string) => {
    const updated = projects.filter(p => p.id !== id);
    setProjects(updated);
    setProjectToDelete(null);
    localStorage.setItem('eletrocalc_projects', JSON.stringify(updated));
    
    if (updated.length === 0) {
      setCurrentProjectId(null);
      setRooms([]);
      setCustomMaterials([]);
    } else if (currentProjectId === id) {
      const next = updated[0];
      setCurrentProjectId(next.id);
      setRooms(next.rooms);
      setCustomMaterials(next.customMaterials || []);
      setSelectedPoleModelId(next.selectedPoleModelId);
      setCalculateOnlyPole(next.calculateOnlyPole || false);
      setFloorPlanImage(next.floorPlanImage);
      setCalibrationRatio(next.calibrationRatio);
      setTechnician(next.technician || { id: '', name: '', license: '', phone: '' });
    }
  };

  const startEditingProject = (id: string, name: string) => {
    setEditingProjectId(id);
    setEditingProjectName(name);
  };

  const finishEditingProject = () => {
    if (editingProjectId && editingProjectName.trim()) {
      renameProject(editingProjectId, editingProjectName.trim());
    }
    setEditingProjectId(null);
  };

  const switchProject = (id: string) => {
    const project = projects.find(p => p.id === id);
    if (project) {
      setCurrentProjectId(id);
      setRooms(project.rooms);
      setCustomMaterials(project.customMaterials || []);
      setSelectedPoleModelId(project.selectedPoleModelId || null);
      setServiceEntranceLength(project.serviceEntranceLength || 10);
      setServiceEntranceGauge(project.serviceEntranceGauge || 16);
      setCalculateOnlyPole(project.calculateOnlyPole || false);
      setFloorPlanImage(project.floorPlanImage);
      setCalibrationRatio(project.calibrationRatio);
      setTechnician(project.technician || { id: '', name: '', license: '', phone: '' });
    }
  };

  const groupAllLighting = () => {
    const updatedRooms = rooms.map(r => ({ ...r, lightingCircuitId: 'L1' }));
    setRooms(updatedRooms);
    saveProject(updatedRooms);
  };

  const groupAllTugs = () => {
    const updatedRooms = rooms.map(r => ({ ...r, tugCircuitId: 'T1' }));
    setRooms(updatedRooms);
    saveProject(updatedRooms);
  };

  const resetAllGrouping = () => {
    const updatedRooms = rooms.map(r => ({ ...r, lightingCircuitId: undefined, tugCircuitId: undefined }));
    setRooms(updatedRooms);
    saveProject(updatedRooms);
  };

  const updateCatalogItem = (key: string, price: number) => {
    setCatalog(prev => ({ ...prev, [key]: price }));
  };

  // NBR 5410 Calculation Helpers
  const calculateNBR = (type: string, area: number, perimeter: number) => {
    // 1. Lighting calculation
    let lights = 0;
    if (area > 0) {
      lights = 100;
      if (area > 6) {
        const extraArea = area - 6;
        lights += Math.floor(extraArea / 4) * 60;
      }
    }

    // 2. TUGs calculation
    let tugs = 0;
    if (perimeter > 0) {
      if (['kitchen', 'laundry', 'bathroom'].includes(type)) {
        tugs = Math.ceil(perimeter / 3.5);
      } else if (type === 'hallway') {
        tugs = Math.ceil(perimeter / 5);
        if (tugs === 0) tugs = 1;
      } else {
        tugs = Math.ceil(perimeter / 5);
      }
      if (tugs === 0) tugs = 1; // Minimum 1 per room
    }

    // 3. TUEs suggestions
    const tues: TUE[] = [];
    if (type === 'bathroom') {
      tues.push({ id: Math.random().toString(), description: 'Chuveiro Elétrico', power: 5500, voltage: 220 });
    } else if (type === 'bedroom') {
      tues.push({ id: Math.random().toString(), description: 'Ar Condicionado', power: 1500, voltage: 220 });
    } else if (type === 'kitchen') {
      tues.push({ id: Math.random().toString(), description: 'Forno Elétrico', power: 2500, voltage: 220 });
      tues.push({ id: Math.random().toString(), description: 'Micro-ondas', power: 1200, voltage: 127 });
    } else if (type === 'laundry') {
      tues.push({ id: Math.random().toString(), description: 'Máquina de Lavar', power: 1000, voltage: 127 });
    }

    return { lights, tugs, tues };
  };

  const handleRoomDataChange = (field: string, value: any) => {
    setCurrentRoom(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-assign default lengths and gauges if missing
      if (field === 'lights' && updated.lightsLength === undefined) updated.lightsLength = 10;
      if (field === 'lights' && updated.lightsGauge === undefined) updated.lightsGauge = 1.5;
      if (field === 'tugs' && updated.tugsLength === undefined) updated.tugsLength = 15;
      if (field === 'tugs' && updated.tugsGauge === undefined) updated.tugsGauge = 2.5;

      // Auto-recalculate if type, area, or perimeter changed
      if (['type', 'area', 'perimeter'].includes(field)) {
        const specs = calculateNBR(
          updated.type || 'living',
          Number(updated.area || 0),
          Number(updated.perimeter || 0)
        );
        
        const newRoomData = {
          ...updated,
          lights: specs.lights,
          tugs: specs.tugs,
        };

        // Only update suggestions for TUEs if the TYPE changed
        if (field === 'type') {
          newRoomData.tues = specs.tues;
        }

        return newRoomData;
      }
      return updated;
    });
  };

  // Form State
  const [currentRoom, setCurrentRoom] = useState<Partial<Room>>({
    name: '',
    area: 0,
    perimeter: 0,
    lights: 0,
    tugs: 0,
    type: 'living',
    tues: []
  });

  const selectedPoleModel = useMemo(() => 
    poleModels.find(m => m.id === selectedPoleModelId) || null
  , [poleModels, selectedPoleModelId]);

  const materialList = useMemo(() => generateMaterialList(rooms, selectedPoleModel, calculateOnlyPole), [rooms, selectedPoleModel, calculateOnlyPole]);
  
  const totalBudget = useMemo(() => {
    const generatedTotal = materialList.reduce((acc, item) => {
      const price = catalog[item.id] || 0;
      return acc + (item.quantity * price);
    }, 0);
    const customTotal = customMaterials.reduce((acc, item) => {
      return acc + (item.quantity * item.unitPrice);
    }, 0);
    return generatedTotal + customTotal;
  }, [materialList, catalog, customMaterials]);

  const totalPower = useMemo(() => {
    return rooms.reduce((acc, room) => {
      const tuePower = room.tues.reduce((tAcc, tue) => tAcc + tue.power, 0);
      return acc + room.lights + (room.tugs * 100) + tuePower;
    }, 0);
  }, [rooms]);

  const saveCatalog = (newCatalog: Record<string, number>) => {
    setCatalog(newCatalog);
    localStorage.setItem('eletrocalc_catalog', JSON.stringify(newCatalog));
  };

  const addCatalogItem = () => {
    if (!newCatalogItem.name) return;
    const prefix = newCatalogItem.category === 'other' ? 'custom' : newCatalogItem.category;
    const id = `${prefix}-${Date.now()}`;
    const updated = { ...catalog, [id]: newCatalogItem.price };
    setCatalog(updated);
    localStorage.setItem('eletrocalc_catalog', JSON.stringify(updated));
    setIsAddingCatalogItem(false);
    setNewCatalogItem({ name: '', category: 'cable', price: 0 });
  };

  const addCustomMaterial = () => {
    const newMaterial: ProjectMaterial = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'Novo Item',
      quantity: 1,
      unit: 'un',
      unitPrice: 0
    };
    const updated = [...customMaterials, newMaterial];
    setCustomMaterials(updated);
    saveProject(undefined, updated);
  };

  const updateCustomMaterial = (id: string, field: keyof ProjectMaterial, value: any) => {
    const updated = customMaterials.map(m => m.id === id ? { ...m, [field]: value } : m);
    setCustomMaterials(updated);
    saveProject(undefined, updated);
  };

  const removeCustomMaterial = (id: string) => {
    const updated = customMaterials.filter(m => m.id !== id);
    setCustomMaterials(updated);
    saveProject(undefined, updated);
  };

  const addRoom = () => {
    if (!currentRoom.name || !currentRoom.area || !currentRoom.perimeter) return;
    
    if (editingRoomId) {
      const updatedRooms = rooms.map(r => r.id === editingRoomId ? { ...r, ...currentRoom } as Room : r);
      setRooms(updatedRooms);
      saveProject(updatedRooms);
    } else {
      const newRoom = calculateRoomRequirements(currentRoom);
      const updatedRooms = [...rooms, newRoom];
      setRooms(updatedRooms);
      saveProject(updatedRooms);
    }
    
    setCurrentRoom({ name: '', area: 0, perimeter: 0, type: 'living', tues: [] });
    setEditingRoomId(null);
    setIsAddingRoom(false);
  };

  const removeRoom = (id: string) => {
    const updatedRooms = rooms.filter(r => r.id !== id);
    setRooms(updatedRooms);
    saveProject(updatedRooms);
  };

  const startEditingRoom = (room: Room) => {
    setCurrentRoom(room);
    setEditingRoomId(room.id);
    setIsAddingRoom(true);
  };

  const [isUploadingPlane, setIsUploadingPlane] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);

  const handleFloorPlanUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input?.files?.[0];
    if (!file || !currentProjectId) return;

    setIsUploadingPlane(true);
    try {
      const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
        reader.readAsDataURL(file);
      });

      let finalBase64 = base64;

      // Force PDF mime type if extension matches but browser missed it
      if (file.name.toLowerCase().endsWith('.pdf') && !finalBase64.includes('application/pdf')) {
        finalBase64 = finalBase64.replace(/^data:[^;]+;/, 'data:application/pdf;');
      }

      if (isPDF) {
        setFloorPlanImage(finalBase64);
        saveProject(undefined, undefined, undefined, undefined, finalBase64);
        setIsUploadingPlane(false);
      } else {
        // Para imagens, abrir o editor de corte
        setImageToCrop(finalBase64);
        setIsUploadingPlane(false);
      }
    } catch (error) {
      console.error("Erro no upload da planta:", error);
      alert("Erro ao processar arquivo. Tente uma foto menor ou outro formato.");
      setIsUploadingPlane(false);
    } finally {
      if (input) {
        input.value = '';
      }
    }
  };

  const handleCropDone = async (croppedAreaPixels: Area, rotation: number) => {
    if (!imageToCrop) return;
    
    setIsUploadingPlane(true);
    try {
      const croppedImage = await getCroppedImg(imageToCrop, croppedAreaPixels, rotation);
      
      // Compress it to avoid localStorage limits
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Falha ao carregar imagem para compressão'));
        image.src = croppedImage;
      });

      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Max resolution 1600px for speed and storage
      const MAX_SIZE = 1600;
      if (width > height) {
        if (width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      
      const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);

      setFloorPlanImage(compressedBase64);
      saveProject(
        undefined, 
        undefined, 
        undefined, 
        undefined, 
        compressedBase64
      );
      setImageToCrop(null);
    } catch (error) {
      console.error("Erro ao cortar imagem:", error);
      alert("Erro ao processar o corte da imagem.");
    } finally {
      setIsUploadingPlane(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      {/* Sidebar: Projects & Navigation */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 flex flex-col shrink-0 overflow-hidden transition-transform duration-300 ease-in-out border-r border-slate-800 lg:relative lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center text-slate-900 font-black shadow-lg shadow-yellow-400/20">
                ⚡
              </div>
              <h1 className="text-sm font-black text-white uppercase tracking-tighter leading-none">
                Giga EletroCalc<br/>
                <span className="text-yellow-400 text-[10px] tracking-widest font-bold">PROFESSIONAL</span>
              </h1>
            </div>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-2 text-slate-400 hover:text-white"
            >
              <ChevronLeft size={20} />
            </button>
          </div>

          <nav className="space-y-1 mb-8">
            <button 
              onClick={() => setActiveTab('rooms')}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all",
                activeTab === 'rooms' ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-400 hover:bg-slate-800"
              )}
            >
              <Layout size={16} /> Dimensionamento
            </button>
            <button 
              onClick={() => setActiveTab('materials')}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all",
                activeTab === 'materials' ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" : "text-slate-400 hover:bg-slate-800"
              )}
            >
              <FileSpreadsheet size={16} /> Lista de Materiais
            </button>
            <button 
              onClick={() => setActiveTab('catalog')}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all",
                activeTab === 'catalog' ? "bg-slate-700 text-white" : "text-slate-400 hover:bg-slate-800"
              )}
            >
              <Settings size={16} /> Tabela de Preços
            </button>
          </nav>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-4">Projetos</h2>
              <button 
                onClick={createNewProject}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-yellow-400 rounded-md transition-all border border-slate-700/50"
                title="Novo Projeto"
              >
                <Plus size={14} />
              </button>
            </div>
            
            <div className="space-y-1 max-h-[calc(100vh-320px)] overflow-y-auto pr-2 custom-scrollbar">
              {projects.map(p => (
                <div 
                  key={p.id}
                  className={cn(
                    "group flex items-center justify-between gap-2 w-full p-2.5 rounded-xl transition-all cursor-pointer border border-transparent",
                    currentProjectId === p.id 
                      ? "bg-slate-800 border-slate-700 shadow-xl" 
                      : "text-slate-400 hover:bg-slate-800/50"
                  )}
                  onClick={() => switchProject(p.id)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full shrink-0",
                      currentProjectId === p.id ? "bg-yellow-400" : "bg-slate-700"
                    )} />
                    
                    {editingProjectId === p.id ? (
                      <input 
                        autoFocus
                        className="flex-1 bg-slate-700 text-white text-[11px] px-2 py-0.5 rounded border border-yellow-400/50 focus:outline-none"
                        value={editingProjectName || ''}
                        onChange={(e) => setEditingProjectName(e.target.value)}
                        onBlur={finishEditingProject}
                        onKeyDown={(e) => e.key === 'Enter' && finishEditingProject()}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className={cn(
                        "truncate text-[11px] font-bold tracking-tight",
                        currentProjectId === p.id ? "text-white" : "text-slate-400 group-hover:text-slate-300"
                      )}>{p.name}</span>
                    )}
                  </div>
                  
                  <div className={cn(
                    "flex items-center gap-1 transition-opacity",
                    currentProjectId === p.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditingProject(p.id, p.name);
                      }}
                      className="p-1 rounded-md hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                      title="Renomear"
                    >
                      <Edit2 size={10} /> 
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setProjectToDelete(p.id);
                      }}
                      className="p-1 rounded-md hover:bg-red-500/10 text-red-400/70 hover:text-red-400 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-auto p-4 border-t border-slate-800 bg-slate-900/50 backdrop-blur-xl flex flex-col gap-2">
          <button 
            onClick={() => setActiveTab('technicians')}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
              activeTab === 'technicians' 
                ? "bg-blue-600 border-blue-500 text-white shadow-xl shadow-blue-600/20" 
                : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            )}
          >
            <User size={14} className={activeTab === 'technicians' ? "text-white" : "text-blue-400"} /> Técnicos
          </button>
          <button 
            onClick={() => setActiveTab('catalog')}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
              activeTab === 'catalog' 
                ? "bg-slate-700 border-slate-600 text-white" 
                : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            )}
          >
            <Settings size={14} className="text-yellow-400" /> Ajustes Globais
          </button>
        </div>
      </aside>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-hidden">
        {/* Header fixed at top */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              <Menu size={24} />
            </button>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-0.5">Projeto Ativo</span>
              <h2 className="text-sm lg:text-xl font-black text-slate-900 tracking-tighter truncate max-w-[150px] lg:max-w-none">
                {currentProjectId ? (projects.find(p => p.id === currentProjectId)?.name || 'Carregando...') : 'Nenhum Projeto Ativo'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {currentProjectId && (
              <>
                <div className="flex items-center gap-6 pr-6 border-r border-slate-200 hidden lg:flex">
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Carga Instalada</p>
                    <p className="text-lg font-black text-slate-900 mono-value leading-none">{(totalPower / 1000).toFixed(1)} <span className="text-xs font-normal text-slate-400 uppercase ml-0.5">kW</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Investimento Est.</p>
                    <p className="text-lg font-black text-green-600 mono-value leading-none">R$ {totalBudget.toFixed(2)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      const name = projects.find(p => p.id === currentProjectId)?.name || 'Projeto';
                      const poleModelName = poleModels.find(m => m.id === selectedPoleModelId)?.name;
                      generateElectricalPDF(name, rooms, materialList, customMaterials, totalPower, catalog, totalBudget, poleModelName, floorPlanImage, technician);
                    }}
                    className="bg-yellow-400 hover:bg-yellow-500 text-slate-900 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-yellow-400/20 active:scale-95 flex items-center gap-2"
                    title="Gera lista simplificada de materiais"
                  >
                    <FileDown size={16} /> Orçamento Simples
                  </button>

                  <button 
                    onClick={() => {
                      const name = projects.find(p => p.id === currentProjectId)?.name || 'Projeto';
                      const diagramData = prepareDiagramData(rooms, selectedPoleModel);
                      generateSingleLineDiagramPDF(name, diagramData, technician);
                    }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 border border-slate-200"
                    title="Gera diagrama unifilar técnico dos circuitos"
                  >
                    <GitCommit size={16} /> Diagrama
                  </button>

                  <button 
                    onClick={async () => {
                      const name = projects.find(p => p.id === currentProjectId)?.name || 'Projeto';
                      const detailedList = generateDetailedMaterialList(rooms, selectedPoleModel);
                      await generateDetailedElectricalPDF(name, detailedList, customMaterials, catalog, technician, floorPlanImage);
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-slate-900/20 active:scale-95 flex items-center gap-2 border border-white/10"
                    title="Gera orçamento detalhado agrupado por cômodos"
                  >
                    <FileSpreadsheet size={16} /> Orçamento Detalhado
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto no-scrollbar blueprint-grid">
          <AnimatePresence mode="wait">
            {activeTab === 'rooms' && (
              projects.length === 0 ? (
                <motion.div 
                  key="empty-state"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center"
                >
                  <div className="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center text-slate-200 mb-8 mx-auto shadow-2xl border border-slate-50">
                    <Layout size={48} />
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 mb-4 uppercase tracking-tight">Crie seu primeiro projeto</h3>
                  <p className="text-slate-500 mb-10 text-lg max-w-md mx-auto">
                    Não há projetos ativos no momento. Inicie um novo projeto para começar o dimensionamento elétrico.
                  </p>
                  <button 
                    onClick={createNewProject}
                    className="bg-yellow-400 hover:bg-yellow-500 text-slate-900 px-10 py-5 rounded-3xl font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-yellow-400/20 active:scale-95 flex items-center gap-3 mx-auto"
                  >
                    <Plus size={24} /> Novo Projeto
                  </button>
                </motion.div>
              ) : (
                <motion.div 
                  key="rooms"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-8 max-w-6xl mx-auto"
                >
                {/* Technician Selection Section */}
                <div className="mt-8 pt-8 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      <User size={16} className="text-blue-600" />
                      Responsável Técnico do Laudo
                    </h4>
                    <button 
                      onClick={() => setActiveTab('technicians')}
                      className="text-[9px] font-black uppercase text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-all"
                    >
                      Gerenciar Técnicos
                    </button>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Selecionar Profissional Cadastrado</label>
                        <select 
                          value={technician.id || ''}
                          onChange={(e) => {
                            const tech = technicians.find(t => t.id === e.target.value);
                            if (tech) {
                              setTechnician(tech);
                              saveProject(undefined, undefined, undefined, undefined, undefined, undefined, tech);
                            } else if (e.target.value === '') {
                              const emptyTech = { id: '', name: '', license: '', phone: '' };
                              setTechnician(emptyTech);
                              saveProject(undefined, undefined, undefined, undefined, undefined, undefined, emptyTech);
                            }
                          }}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
                        >
                          <option value="">Nenhum técnico selecionado</option>
                          {technicians.map(t => (
                            <option key={t.id} value={t.id}>{t.name}{t.license ? ` (${t.license})` : ''}</option>
                          ))}
                        </select>
                      </div>

                      {technician.name && (
                        <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 shrink-0">
                            <User size={24} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-black text-slate-900 text-sm truncate">{technician.name}</h5>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">
                              {[technician.license, technician.phone].filter(Boolean).join(' • ')}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col lg:flex-row items-center justify-between gap-6 mb-8 mt-8 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-4 w-full lg:w-auto">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20 shrink-0">
                      <Layout size={24} />
                    </div>
                    <div className="flex flex-col">
                      <h3 className="text-lg font-black text-slate-900 tracking-tighter leading-tight">Dimensionamento</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Planta Baixa e Cômodos</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-center lg:justify-end gap-3 w-full lg:w-auto">
                    {!floorPlanImage ? (
                      <>
                        <label className="cursor-pointer flex items-center gap-3 bg-slate-50 hover:bg-slate-100 text-slate-900 px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 border-slate-200 hover:border-blue-500 shadow-sm active:scale-95 group shrink-0">
                          {isUploadingPlane ? (
                            <><Loader2 className="animate-spin text-blue-600" size={18} /> ...</>
                          ) : (
                            <>
                              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <Upload size={16} />
                              </div>
                              <div className="flex flex-col items-start leading-tight">
                                <span>Arquivo</span>
                                <span className="text-[8px] text-slate-400 normal-case font-bold italic">PDF/IMG</span>
                              </div>
                            </>
                          )}
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*,application/pdf"
                            onChange={handleFloorPlanUpload} 
                            disabled={isUploadingPlane}
                          />
                        </label>

                        <label className="cursor-pointer flex items-center gap-3 bg-slate-50 hover:bg-slate-100 text-slate-900 px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 border-slate-200 hover:border-emerald-500 shadow-sm active:scale-95 group shrink-0">
                          {isUploadingPlane ? (
                            <><Loader2 className="animate-spin text-emerald-600" size={18} /> ...</>
                          ) : (
                            <>
                              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                <Camera size={16} />
                              </div>
                              <div className="flex flex-col items-start leading-tight">
                                <span>Câmera</span>
                                <span className="text-[8px] text-slate-400 normal-case font-bold italic">Tirar Foto</span>
                              </div>
                            </>
                          )}
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            capture="environment"
                            onChange={handleFloorPlanUpload} 
                            disabled={isUploadingPlane}
                          />
                        </label>
                      </>
                    ) : (
                      <div className="flex flex-wrap items-center gap-3">
                        {floorPlanImage && !floorPlanImage.includes('pdf') && (
                          <button 
                            onClick={() => setImageToCrop(floorPlanImage!)}
                            className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-600 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                          >
                            <Edit size={16} /> Editar Planta
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            if (confirm("Deseja remover esta planta do projeto?")) {
                              setFloorPlanImage(undefined);
                              saveProject(undefined, undefined, undefined, undefined, "");
                            }
                          }}
                          className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          <Trash2 size={16} /> Remover Planta
                        </button>
                      </div>
                    )}
                    <button 
                      onClick={() => setIsAddingRoom(true)}
                      className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                    >
                      <Plus size={18} /> Novo Cômodo
                    </button>
                  </div>
                </div>

                {rooms.length > 0 && (
                  <div className="bg-slate-900 rounded-3xl p-6 mb-8 border border-white/10 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -mr-32 -mt-32 blur-3xl transition-all group-hover:bg-blue-500/10" />
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-blue-400 border border-white/10 group-hover:border-blue-500/50 transition-all">
                          <GitMerge size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-white uppercase tracking-widest leading-tight">Agrupamento Global de Circuitos</h4>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Combine cômodos em disjuntores únicos</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <button 
                          onClick={groupAllLighting}
                          className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-white/10 active:scale-95"
                          title="Agrupa toda a iluminação em um único disjuntor"
                        >
                          Toda Ilum. em C1
                        </button>
                        <button 
                          onClick={groupAllTugs}
                          className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-white/10 active:scale-95"
                          title="Agrupa todas as tomadas gerais em um único disjuntor"
                        >
                          Toda TUG em C2
                        </button>
                        <button 
                          onClick={resetAllGrouping}
                          className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-red-500/20 active:scale-95"
                          title="Separa cada cômodo em circuitos individuais novamente"
                        >
                          Circuitos Separados
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {floorPlanImage && (
                  <div className="mb-12">
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="relative bg-white border border-slate-100 rounded-[3rem] overflow-hidden shadow-2xl"
                    >
                      <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                            <Layout size={24} />
                          </div>
                          <div>
                            <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">Cálculo por Planta Baixa</h4>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">
                              {calibrationRatio 
                                ? `Escala: ${(calibrationRatio).toFixed(2)} px/m` 
                                : "Calibre a escala para iniciar as medições"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!calibrationRatio ? (
                            <button 
                              onClick={() => {
                                setIsCalibrating(true);
                                setIsMeasuringArea(false);
                                setActivePoints([]);
                              }}
                              disabled={isCalibrating}
                              className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                isCalibrating ? "bg-amber-100 text-amber-600 border border-amber-200" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              )}
                            >
                              <Ruler size={16} /> Calibrar Escala
                            </button>
                          ) : (
                            <>
                              <button 
                                onClick={() => {
                                  setIsMeasuringArea(!isMeasuringArea);
                                  setIsCalibrating(false);
                                  setActivePoints([]);
                                  setMeasurementResult(null);
                                }}
                                className={cn(
                                  "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                  isMeasuringArea ? "bg-blue-100 text-blue-600 border border-blue-200" : "bg-blue-600 text-white hover:bg-blue-700"
                                )}
                              >
                                {isMeasuringArea ? <MousePointer2 size={16} /> : <Square size={16} />}
                                {isMeasuringArea ? "Finalizar Medição" : "Medir Cômodo"}
                              </button>
                              <button 
                                onClick={() => {
                                  if (confirm("Deseja recalibrar a escala?")) {
                                    setCalibrationRatio(undefined);
                                    setIsCalibrating(true);
                                    setActivePoints([]);
                                  }
                                }}
                                className="bg-slate-100 text-slate-400 hover:text-slate-600 p-2 rounded-xl transition-all"
                                title="Recalibrar"
                              >
                                <RotateCw size={16} />
                              </button>
                              {floorPlanImage && !floorPlanImage.includes('pdf') && (
                                <button 
                                  onClick={() => {
                                    const name = projects.find(p => p.id === currentProjectId)?.name || 'Projeto';
                                    generateFloorPlanPDF(name, floorPlanImage, technician);
                                  }}
                                  className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                                  title="Exportar Planta em PDF"
                                >
                                  <FileDown size={16} /> PDF da Planta
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      <div className="relative bg-slate-50/50 p-4 flex flex-col items-center justify-center min-h-[500px]">
                        {/* Overlay Instructions */}
                        <AnimatePresence>
                          {(isCalibrating || isMeasuringArea) && (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              className="absolute top-8 left-1/2 -translate-x-1/2 z-20 bg-slate-900/90 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl backdrop-blur-md flex items-center gap-3 border border-white/10"
                            >
                              {isCalibrating ? (
                                <>
                                  <Ruler size={14} className="text-amber-400" />
                                  Clique em dois pontos com distância conhecida
                                </>
                              ) : (
                                <>
                                  <Square size={14} className="text-blue-400" />
                                  Marque os cantos do cômodo. Toque no último ponto para conferir a área.
                                </>
                              )}
                              <button onClick={() => { setIsCalibrating(false); setIsMeasuringArea(false); setActivePoints([]); }} className="ml-4 hover:text-red-400 transition-colors">
                                <X size={14} />
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="relative group overflow-hidden rounded-2xl border border-slate-200 bg-white">
                          {floorPlanImage && (floorPlanImage.includes('pdf') || floorPlanImage.includes('application/pdf')) ? (
                            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 w-full">
                              <div className="w-full bg-white rounded-xl shadow-inner overflow-hidden border border-slate-200" style={{ height: '75vh', minHeight: '600px' }}>
                                <iframe 
                                  src={floorPlanImage}
                                  className="w-full h-full border-none"
                                  title="Planta Baixa PDF"
                                />
                              </div>
                              <div className="mt-6 flex flex-col items-center text-center">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                                    <FileText size={18} />
                                  </div>
                                  <h5 className="text-sm font-black text-slate-900 uppercase">PDF Carregado</h5>
                                </div>
                                <p className="text-slate-500 text-[10px] mb-4 max-w-md font-bold uppercase tracking-widest">Visualização habilitada. PDFs não suportam marcação de pontos automática.</p>
                                <a 
                                  href={floorPlanImage} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="bg-slate-900 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 transition-transform"
                                >
                                  Abrir em Tela Cheia
                                </a>
                              </div>
                            </div>
                          ) : (
                            <div className="relative inline-block mx-auto min-w-min">
                              <img 
                                src={floorPlanImage} 
                                alt="Planta Baixa" 
                                className="max-h-[800px] max-w-full block select-none" 
                                draggable={false}
                              />
                              
                              {/* Interaction Overlay */}
                              <div 
                                className={cn(
                                  "absolute inset-0 z-20 touch-none",
                                  (isCalibrating || isMeasuringArea) ? "cursor-crosshair active:scale-[0.99]" : "pointer-events-none"
                                )}
                                onClick={(e) => {
                                  if (!isCalibrating && !isMeasuringArea) return;
                                  
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const x = e.clientX - rect.left;
                                  const y = e.clientY - rect.top;
                                  
                                  if (isCalibrating) {
                                    if (activePoints.length >= 2) return;
                                    const newPoints = [...activePoints, { x, y }];
                                    setActivePoints(newPoints);
                                    
                                    if (newPoints.length === 2) {
                                      setShowCalibrationInput(true);
                                    }
                                  } else if (isMeasuringArea) {
                                    setActivePoints([...activePoints, { x, y }]);
                                  }
                                }}
                              />

                              {/* Calibration Input Modal (Small and focused) */}
                              <AnimatePresence>
                                {showCalibrationInput && (
                                  <motion.div 
                                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                    className="absolute inset-0 z-30 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm"
                                  >
                                    <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-slate-100 max-w-xs w-full">
                                      <h6 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2">
                                        <Ruler size={14} className="text-amber-500" /> Definir Escala
                                      </h6>
                                      <p className="text-sm text-slate-600 font-medium leading-relaxed mb-6">
                                        Informe a distância real (em metros) entre os dois pontos marcados:
                                      </p>
                                      <div className="relative mb-6">
                                        <input 
                                          type="number" 
                                          value={calibrationInput}
                                          onChange={(e) => setCalibrationInput(e.target.value)}
                                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-slate-900 font-black text-xl focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
                                          placeholder="Ex: 5"
                                          autoFocus
                                        />
                                        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 font-black">METROS</span>
                                      </div>
                                      <div className="flex gap-3">
                                        <button 
                                          onClick={() => {
                                            const realDist = parseFloat(calibrationInput);
                                            if (realDist > 0 && activePoints.length === 2) {
                                              const dist = Math.sqrt(Math.pow(activePoints[0].x - activePoints[1].x, 2) + Math.pow(activePoints[0].y - activePoints[1].y, 2));
                                              const ratio = dist / realDist;
                                              setCalibrationRatio(ratio);
                                              saveProject(undefined, undefined, undefined, undefined, undefined, ratio);
                                            }
                                            setShowCalibrationInput(false);
                                            setIsCalibrating(false);
                                            setActivePoints([]);
                                          }}
                                          className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all"
                                        >
                                          Confirmar
                                        </button>
                                        <button 
                                          onClick={() => {
                                            setShowCalibrationInput(false);
                                            setIsCalibrating(false);
                                            setActivePoints([]);
                                          }}
                                          className="px-6 bg-slate-100 text-slate-400 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                                        >
                                          Sair
                                        </button>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                              
                              {/* SVG Overlay for Drawing */}
                              <svg 
                                className="absolute inset-0 w-full h-full pointer-events-none z-10"
                              >
                                {/* Drawing Calibration Line */}
                                {(isCalibrating || showCalibrationInput) && activePoints.length > 0 && (
                                  <>
                                    {activePoints.map((p, i) => (
                                      <circle key={i} cx={p.x} cy={p.y} r="8" fill="#FBBF24" stroke="white" strokeWidth="2" />
                                    ))}
                                    {activePoints.length === 2 && (
                                      <line 
                                        x1={activePoints[0].x} y1={activePoints[0].y} 
                                        x2={activePoints[1].x} y2={activePoints[1].y} 
                                        stroke="#FBBF24" strokeWidth="3" strokeDasharray="6 4"
                                      />
                                    )}
                                  </>
                                )}

                                {/* Drawing Area Polygon */}
                                {isMeasuringArea && activePoints.length > 0 && (
                                  <>
                                    <polyline 
                                      points={activePoints.map(p => `${p.x},${p.y}`).join(' ')}
                                      fill="rgba(59, 130, 246, 0.2)"
                                      stroke="#3B82F6"
                                      strokeWidth="3"
                                    />
                                    {activePoints.map((p, i) => (
                                      <circle key={i} cx={p.x} cy={p.y} r="8" fill="#3B82F6" stroke="white" strokeWidth="2" />
                                    ))}
                                    {activePoints.length > 2 && (
                                      <line 
                                        x1={activePoints[activePoints.length-1].x} y1={activePoints[activePoints.length-1].y}
                                        x2={activePoints[0].x} y2={activePoints[0].y}
                                        stroke="#3B82F6" strokeWidth="2" strokeDasharray="6 6"
                                      />
                                    )}
                                  </>
                                )}
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* Results Hub */}
                        {isMeasuringArea && activePoints.length > 2 && calibrationRatio && (
                          <div className="mt-8 flex flex-wrap justify-center gap-4">
                            <div className="bg-white px-6 py-4 rounded-2xl border border-slate-100 shadow-xl flex flex-col items-center">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Área Calculada</p>
                              <p className="text-2xl font-black text-slate-900">
                                {(() => {
                                  let area = 0;
                                  for (let i = 0; i < activePoints.length; i++) {
                                    const p1 = activePoints[i];
                                    const p2 = activePoints[(i + 1) % activePoints.length];
                                    area += (p1.x * p2.y) - (p2.x * p1.y);
                                  }
                                  const realArea = Math.abs(area / 2) / Math.pow(calibrationRatio, 2);
                                  return realArea.toFixed(2);
                                })()} m²
                              </p>
                            </div>
                            <div className="bg-white px-6 py-4 rounded-2xl border border-slate-100 shadow-xl flex flex-col items-center">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Perímetro</p>
                              <p className="text-2xl font-black text-slate-900">
                                {(() => {
                                  let perimeter = 0;
                                  for (let i = 0; i < activePoints.length; i++) {
                                    const p1 = activePoints[i];
                                    const p2 = activePoints[(i + 1) % activePoints.length];
                                    perimeter += Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
                                  }
                                  const realPerimeter = perimeter / calibrationRatio;
                                  return realPerimeter.toFixed(2);
                                })()} m
                              </p>
                            </div>
                            <button 
                              onClick={() => {
                                let area = 0;
                                for (let i = 0; i < activePoints.length; i++) {
                                  const p1 = activePoints[i];
                                  const p2 = activePoints[(i + 1) % activePoints.length];
                                  area += (p1.x * p2.y) - (p2.x * p1.y);
                                }
                                const realArea = parseFloat(Math.abs(area / 2 / Math.pow(calibrationRatio, 2)).toFixed(2));
                                
                                let perimeter = 0;
                                for (let i = 0; i < activePoints.length; i++) {
                                  const p1 = activePoints[i];
                                  const p2 = activePoints[(i + 1) % activePoints.length];
                                  perimeter += Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
                                }
                                const realPerimeter = parseFloat((perimeter / calibrationRatio).toFixed(2));

                                // Pre-calculate NBR requirements for the current room type
                                const specs = calculateNBR(currentRoom.type || 'living', realArea, realPerimeter);

                                setCurrentRoom(prev => ({ 
                                  ...prev, 
                                  area: realArea, 
                                  perimeter: realPerimeter,
                                  lights: specs.lights,
                                  tugs: specs.tugs
                                }));
                                setIsAddingRoom(true);
                                setIsMeasuringArea(false);
                                setActivePoints([]);
                              }}
                              className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-3 shadow-xl"
                            >
                              <Plus size={16} /> Usar na Criação do Cômodo
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </div>
                )}

                {rooms.length === 0 ? (
                  <div className="bg-white border-2 border-dashed border-slate-200 rounded-[3rem] p-20 text-center">
                    <div className="w-20 h-20 bg-slate-50 border border-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-8 text-slate-300">
                      <Zap size={40} />
                    </div>
                    <h4 className="text-xl font-bold text-slate-900 mb-2">Inicie o Dimensionamento</h4>
                    <p className="text-slate-500 mb-10 max-w-sm mx-auto">
                      Adicione os cômodos do imóvel para calcular as cargas, circuitos e materiais necessários conforme a NBR 5410.
                    </p>
                    <button 
                      onClick={() => setIsAddingRoom(true)}
                      className="inline-flex items-center gap-3 bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20"
                    >
                      Adicionar primeiro cômodo
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {rooms.map((room) => (
                      <motion.div 
                        key={room.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm hover:shadow-2xl hover:border-blue-100 transition-all group relative overflow-hidden"
                      >
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <div className="bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-md mb-3 inline-block">
                              {ROOM_TYPES.find(t => t.value === room.type)?.label || room.type}
                            </div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tighter">{room.name}</h3>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => startEditingRoom(room)}
                              className="p-3 text-slate-200 hover:text-blue-500 hover:bg-blue-50 rounded-2xl transition-all"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button 
                              onClick={() => removeRoom(room.id)}
                              className="p-3 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-8">
                          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100/50">
                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Medidas</p>
                            <p className="text-sm font-bold text-slate-700 mono-value">
                              {room.area}m² | {room.perimeter}m
                            </p>
                          </div>
                          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100/50">
                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Pot. Ilum.</p>
                            <p className="text-sm font-bold text-slate-700 mono-value">
                              {room.lights} VA
                            </p>
                          </div>
                        </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-xs p-4 bg-slate-900 rounded-2xl text-white shadow-lg shadow-slate-900/10">
                          <span className="font-bold flex items-center gap-2"><Zap size={14} className="text-yellow-400" /> Tomadas Uso Geral</span>
                          <span className="font-black mono-value bg-white/10 px-3 py-1 rounded-lg">{room.tugs} UN</span>
                        </div>
                        {room.tues.map(tue => (
                          <div key={tue.id} className="flex justify-between items-center text-xs p-4 border border-slate-100 rounded-2xl bg-slate-50/50">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-500 flex items-center gap-2">
                                <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                                  <Zap size={10} />
                                </div>
                                {tue.description}
                              </span>
                              <span className="text-[9px] font-bold text-slate-300 ml-8 uppercase">{tue.voltage}V</span>
                            </div>
                            <span className="font-black text-slate-900 mono-value">{tue.power}W</span>
                          </div>
                        ))}
                      </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}

            {activeTab === 'materials' && (
              <motion.div 
                key="materials"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-8 max-w-5xl mx-auto"
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-8">
                    {/* Padrão de Entrada Selection */}
                    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                            selectedPoleModelId ? "bg-amber-100 text-amber-600 shadow-lg shadow-amber-500/10" : "bg-slate-100 text-slate-400"
                          )}>
                            <Box size={24} />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Padrão de Entrada</h4>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Incluir kit de poste e medição no orçamento?</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          {selectedPoleModelId && (
                            <div className="flex items-center gap-2 bg-amber-50 px-4 py-2 rounded-xl">
                              <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Apenas Padrão?</span>
                              <button 
                                onClick={() => {
                                  const newVal = !calculateOnlyPole;
                                  setCalculateOnlyPole(newVal);
                                  saveProject(undefined, undefined, undefined, newVal);
                                }}
                                className={cn(
                                  "w-10 h-6 rounded-full p-1 transition-all duration-300 flex items-center",
                                  calculateOnlyPole ? "bg-amber-500" : "bg-slate-200"
                                )}
                              >
                                <motion.div 
                                  animate={{ x: calculateOnlyPole ? 16 : 0 }}
                                  className="w-4 h-4 bg-white rounded-full shadow-sm"
                                />
                              </button>
                            </div>
                          )}
                          <button 
                            onClick={() => setIsManagingPoleModels(true)}
                            className="text-blue-600 font-black text-[10px] uppercase tracking-widest hover:underline"
                          >
                            Configurar Modelos
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button 
                          onClick={() => {
                            setSelectedPoleModelId(null);
                            saveProject(undefined, undefined, null);
                          }}
                          className={cn(
                            "px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest border transition-all min-w-[140px]",
                            !selectedPoleModelId ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                          )}
                        >
                          Nenhum
                        </button>
                        {poleModels.map(model => (
                          <button 
                            key={model.id}
                            onClick={() => {
                              setSelectedPoleModelId(model.id);
                              saveProject(undefined, undefined, model.id);
                            }}
                            className={cn(
                              "px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest border transition-all min-w-[140px] text-left",
                              selectedPoleModelId === model.id ? "bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/20" : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                            )}
                          >
                            {model.name}
                          </button>
                        ))}
                      </div>

                      {selectedPoleModelId && (
                        <div className="bg-slate-50 rounded-2xl p-6 space-y-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Cable size={14} className="text-amber-500" />
                            <h5 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Dimensionamento da Entrada (NBR 5410)</h5>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <label className="block text-[8px] font-black text-slate-400 uppercase mb-1">Comprimento (m)</label>
                              <input 
                                type="number" 
                                value={serviceEntranceLength}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setServiceEntranceLength(val);
                                  saveProject(undefined, undefined, undefined, undefined, undefined, undefined, undefined, val);
                                }}
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] font-black text-slate-400 uppercase mb-1">Bitola (mm²)</label>
                              <select 
                                value={serviceEntranceGauge}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setServiceEntranceGauge(val);
                                  saveProject(undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, val);
                                }}
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-sm"
                              >
                                {[6, 10, 16, 25, 35, 50, 70, 95, 120].map(s => (
                                  <option key={s} value={s}>{s} mm²</option>
                                ))}
                              </select>
                            </div>
                            <div className="col-span-2">
                              {(() => {
                                const res = calculateVoltageDrop(totalPower, serviceEntranceLength, serviceEntranceGauge, 220, true, 1.0);
                                return (
                                  <div className={cn("h-full flex flex-col justify-center px-4 rounded-xl", res.isWithinLimit ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700")}>
                                    <div className="flex items-center justify-between">
                                      <span className="text-[9px] font-black uppercase">Queda Entrada: {res.percentageDrop.toFixed(2)}%</span>
                                      <span className="text-[10px] font-bold">{res.isWithinLimit ? "✓ OK" : "⚠️ ALTA"}</span>
                                    </div>
                                    {!res.isWithinLimit && (
                                      <p className="text-[8px] font-bold mt-0.5">Sugerido p/ 1%: {res.suggestedGauge}mm²</p>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* NBR List */}
                    <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm">
                      <div className="flex items-center justify-between mb-8">
                        <h3 className="text-lg font-black text-slate-900 tracking-tighter">Lista Quantitativa (NBR 5410)</h3>
                        <div className="bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                          Cálculo Dinâmico
                        </div>
                      </div>
                      
                      <div className="divide-y divide-slate-100">
                        {materialList.length === 0 ? (
                          <div className="py-20 text-center">
                            <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-300 mx-auto mb-6">
                              <Box size={32} />
                            </div>
                            <h4 className="text-slate-900 font-black text-lg mb-2">Aguardando Seleção</h4>
                            <p className="text-slate-400 text-sm max-w-xs mx-auto font-medium">Selecione um Padrão de Entrada ou adicione cômodos para gerar a lista de materiais automática.</p>
                          </div>
                        ) : (
                          materialList.map((item, idx) => (
                            <div key={idx} className="py-5 flex items-center justify-between gap-6 group">
                              <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className={cn(
                                  "w-2 h-12 rounded-full shrink-0 shadow-sm",
                                  item.category === 'cable' ? "bg-amber-500" : 
                                  item.category === 'conduit' ? "bg-blue-500" : 
                                  item.category === 'breaker' ? "bg-orange-500" : "bg-slate-200"
                                )} />
                                <div className="min-w-0">
                                  <p className="text-sm font-black text-slate-800 truncate mb-1">{item.name}</p>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.quantity} {item.unit}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-md font-black text-slate-900 mono-value">R$ {(item.quantity * (catalog[item.id] || 0)).toFixed(2)}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">Preço Unit: R$ {(catalog[item.id] || 0).toFixed(2)}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Extras */}
                    <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm">
                      <div className="flex items-center justify-between mb-8">
                        <h3 className="text-lg font-black text-slate-900 tracking-tighter">Itens e Equipamentos Extras</h3>
                        <button 
                          onClick={addCustomMaterial}
                          className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10"
                        >
                          Inserir Novo Item
                        </button>
                      </div>

                      <div className="space-y-4">
                        {customMaterials.length === 0 && materialList.length === 0 && rooms.length === 0 ? (
                          <div className="py-12 bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200 text-center">
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Inicie o projeto adicionando cômodos ou itens</p>
                          </div>
                        ) : customMaterials.map(item => (
                          <div key={item.id} className="p-6 bg-slate-50 border border-slate-100 rounded-3xl group hover:border-blue-200 transition-all">
                            <div className="flex items-center justify-between gap-4 mb-4">
                              <input 
                                type="text"
                                value={item.name || ''}
                                onChange={(e) => updateCustomMaterial(item.id, 'name', e.target.value)}
                                className="flex-1 text-sm font-black text-slate-800 bg-transparent border-none p-0 focus:ring-0"
                                placeholder="Descreva o item adicional..."
                              />
                              <button onClick={() => removeCustomMaterial(item.id)} className="text-slate-300 hover:text-red-500 transition-all">
                                <Trash2 size={16} />
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-2 text-xs">
                                <span className="text-[10px] font-black text-slate-400 uppercase">Quant:</span>
                                <input 
                                  type="number"
                                  value={item.quantity ?? 0}
                                  onChange={(e) => updateCustomMaterial(item.id, 'quantity', Number(e.target.value))}
                                  className="flex-1 font-bold text-slate-700 bg-transparent border-none p-0 focus:ring-0 mono-value"
                                />
                                <span className="text-[10px] font-black text-slate-400 uppercase">{item.unit}</span>
                              </div>
                              <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-2 text-xs">
                                <span className="text-[10px] font-black text-slate-400 uppercase">Preço:</span>
                                <span className="text-[10px] font-black text-slate-400">R$</span>
                                <input 
                                  type="number"
                                  value={item.unitPrice ?? 0}
                                  onChange={(e) => updateCustomMaterial(item.id, 'unitPrice', Number(e.target.value))}
                                  className="flex-1 font-bold text-slate-900 bg-transparent border-none p-0 focus:ring-0 mono-value"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="bg-slate-900 text-white rounded-[4rem] p-12 shadow-2xl sticky top-8">
                      <div className="w-16 h-16 bg-yellow-400 rounded-3xl flex items-center justify-center text-slate-900 mb-8 shadow-lg shadow-yellow-400/20">
                        <Zap size={32} />
                      </div>
                      <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-2 text-center">Total Orçado</p>
                      <h4 className="text-5xl font-black text-yellow-400 text-center mono-value leading-none mb-10">
                        R$ {totalBudget.toFixed(2)}
                      </h4>
                      
                      <div className="space-y-4 mb-12">
                        <div className="flex justify-between items-center py-3 border-b border-white/5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Área Total</span>
                          <span className="text-sm font-black mono-value">{rooms.reduce((acc, r) => acc + r.area, 0).toFixed(2)} m²</span>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-white/5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Potência Total</span>
                          <span className="text-sm font-black mono-value">{totalPower} VA</span>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-white/5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Qtd de Cômodos</span>
                          <span className="text-sm font-black mono-value">{rooms.length} UN</span>
                        </div>
                        <div className="flex justify-between items-center py-3">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Itens na Lista</span>
                          <span className="text-sm font-black mono-value">{materialList.length + customMaterials.length}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        <button 
                          disabled={materialList.length === 0 && customMaterials.length === 0}
                          onClick={() => {
                            const name = projects.find(p => p.id === currentProjectId)?.name || 'Projeto';
                            const poleModelName = poleModels.find(m => m.id === selectedPoleModelId)?.name;
                            generateElectricalPDF(name, rooms, materialList, customMaterials, totalPower, catalog, totalBudget, poleModelName, floorPlanImage, technician);
                          }}
                          className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:bg-slate-800 disabled:text-slate-600 text-slate-900 py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 shadow-xl flex items-center justify-center gap-2"
                        >
                          <FileDown size={18} /> Orçamento Simples
                        </button>

                        <button 
                          disabled={rooms.length === 0}
                          onClick={() => {
                            const name = projects.find(p => p.id === currentProjectId)?.name || 'Projeto';
                            const diagramData = prepareDiagramData(rooms, selectedPoleModel);
                            generateSingleLineDiagramPDF(name, diagramData, technician);
                          }}
                          className="w-full bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 border border-white/10"
                        >
                          <GitCommit size={18} /> Diagrama Unifilar
                        </button>

                        <button 
                          disabled={materialList.length === 0 && customMaterials.length === 0}
                          onClick={async () => {
                            const name = projects.find(p => p.id === currentProjectId)?.name || 'Projeto';
                            const detailedList = generateDetailedMaterialList(rooms, selectedPoleModel);
                            await generateDetailedElectricalPDF(name, detailedList, customMaterials, catalog, technician, floorPlanImage);
                          }}
                          className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-800 disabled:text-slate-600 text-white py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 shadow-xl flex items-center justify-center gap-2 border border-white/5"
                        >
                          <FileSpreadsheet size={18} /> Orçamento Detalhado
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'catalog' && (
              <motion.div 
                key="catalog"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-8 max-w-5xl mx-auto"
              >
                <div className="bg-white rounded-[3rem] p-12 border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-12">
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tighter mb-1">Catálogo de Preços</h3>
                      <p className="text-sm text-slate-500">Valores unitários usados para o cálculo automático.</p>
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => {
                          if (confirm('Deseja redefinir todos os preços para os padrões de fábrica?')) {
                            setCatalog(DEFAULT_CATALOG);
                          }
                        }}
                        className="bg-slate-100 text-slate-600 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2"
                      >
                        Resetar Preços
                      </button>
                      <button 
                        onClick={() => setIsAddingCatalogItem(true)}
                        className="bg-blue-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-2"
                      >
                        <Plus size={14} /> Novo Item
                      </button>
                      <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
                        <Settings size={20} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-12">
                    {categories.map(cat => {
                      const items = Object.entries(catalog).filter(([key]) => 
                        new RegExp(cat.pattern).test(key)
                      );
                      
                      if (items.length === 0) return null;

                      return (
                        <div key={cat.name}>
                          <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" /> {cat.name}
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                            {items.map(([key, price]) => (
                              <div key={key} className="flex items-center justify-between group bg-slate-50/50 p-4 rounded-2xl border border-transparent hover:border-slate-100 transition-all">
                                <div className="flex-1">
                                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1 truncate pr-4">
                                    {CATALOG_NAMES[key] || (key.includes('custom') ? key : key.split('-').join(' ').toUpperCase())}
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-black text-slate-900 mono-value">R$</span>
                                    <input 
                                      type="number"
                                      step="0.01"
                                      value={price ?? 0}
                                      onChange={(e) => updateCatalogItem(key, Number(e.target.value))}
                                      className="flex-1 text-xl font-black text-slate-900 bg-transparent border-none p-0 focus:ring-0 mono-value group-hover:text-blue-600 transition-colors"
                                    />
                                  </div>
                                </div>
                                <div onClick={() => {
                                  if (confirm('Remover item?')) {
                                    const newCatalog = { ...catalog };
                                    delete newCatalog[key];
                                    setCatalog(newCatalog);
                                  }
                                }} className="p-2 text-slate-300 hover:text-red-400 cursor-pointer opacity-0 group-hover:opacity-100 transition-all">
                                  <Trash2 size={14} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
            {activeTab === 'technicians' && (
              <motion.div 
                key="technicians"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-8 max-w-6xl mx-auto"
              >
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-12">
                  <div>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tighter flex items-center gap-4">
                      <div className="w-14 h-14 bg-blue-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-2xl shadow-blue-600/20">
                        <User size={28} />
                      </div>
                      Cadastro de Técnicos
                    </h3>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-2 ml-1">Gerencie os profissionais para emissão dos laudos</p>
                  </div>
                  <button 
                    onClick={() => {
                      setCurrentTech({ id: '', name: '', license: '', phone: '' });
                      setEditingTechId(null);
                      setIsAddingTechnician(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20 active:scale-95 flex items-center gap-3"
                  >
                    <Plus size={18} /> Novo Técnico
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {technicians.length === 0 ? (
                    <div className="col-span-full bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] p-20 flex flex-col items-center justify-center text-center">
                      <div className="w-20 h-20 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center mb-6">
                        <User size={40} />
                      </div>
                      <h4 className="text-xl font-bold text-slate-400">Nenhum técnico cadastrado</h4>
                      <p className="text-sm text-slate-400 mt-2">Clique no botão acima para adicionar seu primeiro profissional.</p>
                    </div>
                  ) : (
                    technicians.map(t => (
                      <div key={t.id} className="bg-white border border-slate-100 rounded-[2rem] p-7 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-12 -mt-12 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        <div className="flex items-start justify-between relative z-10">
                          <div className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                            <User size={28} />
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => {
                                setCurrentTech(t);
                                setEditingTechId(t.id);
                                setIsAddingTechnician(true);
                              }}
                              className="p-2 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-all"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => setTechToDelete(t)}
                              className="p-2 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        <div className="mt-6 relative z-10">
                          <h4 className="text-xl font-bold text-slate-900 leading-tight">{t.name}</h4>
                          <div className="flex flex-col gap-2 mt-4">
                            {t.license && (
                              <div className="flex items-center gap-2 text-slate-400">
                                <FileText size={14} className="text-blue-500" />
                                <span className="text-[10px] font-black uppercase tracking-widest">{t.license}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-slate-400">
                              <MessageSquare size={14} className="text-green-500" />
                              <span className="text-[10px] font-black uppercase tracking-widest">{t.phone}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isAddingTechnician && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsAddingTechnician(false)}
                  className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden"
                >
                  <div className="bg-slate-900 p-7 flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-white leading-tight">{editingTechId ? 'Editar Técnico' : 'Novo Técnico'}</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Cadastro de Responsável Técnico</p>
                    </div>
                    <button 
                      onClick={() => setIsAddingTechnician(false)} 
                      className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-all"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="p-8 space-y-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2.5">Nome Completo</label>
                        <input 
                          type="text" 
                          placeholder="Nome Completo"
                          value={currentTech.name || ''}
                          onChange={e => handleTechDataChange('name', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-sm shadow-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2.5">Registro Profissional (Ex: CREA/CFT)</label>
                        <input 
                          type="text" 
                          placeholder="CREA 12345-D / CFT 67890"
                          value={currentTech.license || ''}
                          onChange={e => handleTechDataChange('license', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-sm shadow-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2.5">Telefone / WhatsApp</label>
                        <input 
                          type="text" 
                          placeholder="(00) 00000-0000"
                          value={currentTech.phone || ''}
                          onChange={e => handleTechDataChange('phone', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-sm shadow-sm"
                        />
                      </div>
                    </div>

                    <button 
                      onClick={saveTechnician}
                      className="w-full bg-blue-600 py-5 text-white rounded-[2rem] font-black text-xs hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-95 uppercase tracking-widest mt-4"
                    >
                      {editingTechId ? 'Atualizar Cadastro' : 'Confirmar Cadastro'}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Manage Pole Models Modal */}
      <AnimatePresence>
        {isManagingPoleModels && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsManagingPoleModels(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Modelos de Padrão de Entrada</h3>
                  <p className="text-sm text-slate-500">Cadastre diferentes kits de poste e medição.</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      const name = prompt('Nome do novo modelo:');
                      if (name) {
                        const newModel: EntryPoleModel = {
                          id: `pole-${Date.now()}`,
                          name,
                          items: []
                        };
                        setPoleModels(prev => [...prev, newModel]);
                      }
                    }}
                    className="bg-blue-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-2"
                  >
                    <Plus size={14} /> Novo Modelo
                  </button>
                  <button onClick={() => setIsManagingPoleModels(false)} className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-10 overflow-y-auto no-scrollbar space-y-12">
                {poleModels.map(model => (
                  <div key={model.id} className="space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                          <Box size={20} />
                        </div>
                        <input 
                          type="text" 
                          value={model.name}
                          onChange={(e) => {
                            const updated = poleModels.map(m => m.id === model.id ? { ...m, name: e.target.value } : m);
                            setPoleModels(updated);
                          }}
                          className="text-lg font-black text-slate-900 bg-transparent border-none p-0 focus:ring-0"
                        />
                      </div>
                      <button 
                        onClick={() => {
                          if (confirm('Excluir este modelo?')) {
                            setPoleModels(prev => prev.filter(m => m.id !== model.id));
                            if (selectedPoleModelId === model.id) setSelectedPoleModelId(null);
                          }
                        }}
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {model.items.map((item, idx) => (
                        <div key={idx} className="bg-slate-50 p-4 rounded-2xl flex items-center gap-4 group">
                          <div className="flex-1 space-y-2">
                             <input 
                              type="text" 
                              value={item.name}
                              onChange={(e) => {
                                const updated = poleModels.map(m => m.id === model.id ? {
                                  ...m,
                                  items: m.items.map((it, i) => i === idx ? { ...it, name: e.target.value } : it)
                                } : m);
                                setPoleModels(updated);
                              }}
                              className="w-full text-[11px] font-black text-slate-800 bg-transparent border-none p-0 focus:ring-0 uppercase tracking-tight"
                              placeholder="Nome do item..."
                            />
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                                <span className="text-[9px] font-black text-slate-400 uppercase">Qtd:</span>
                                <input 
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const updated = poleModels.map(m => m.id === model.id ? {
                                      ...m,
                                      items: m.items.map((it, i) => i === idx ? { ...it, quantity: Number(e.target.value) } : it)
                                    } : m);
                                    setPoleModels(updated);
                                  }}
                                  className="w-12 text-[11px] font-bold text-slate-900 bg-transparent border-none p-0 focus:ring-0 mono-value"
                                />
                                <span className="text-[9px] font-black text-slate-400 uppercase">{item.unit}</span>
                              </div>
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              const updated = poleModels.map(m => m.id === model.id ? {
                                ...m,
                                items: m.items.filter((_, i) => i !== idx)
                              } : m);
                              setPoleModels(updated);
                            }}
                            className="p-2 text-slate-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      <button 
                        onClick={() => {
                          const newItem = { id: `item-${Date.now()}`, name: 'Novo Componente', quantity: 1, unit: 'un', category: 'device' as const };
                          const updated = poleModels.map(m => m.id === model.id ? { ...m, items: [...m.items, newItem] } : m);
                          setPoleModels(updated);
                        }}
                        className="border-2 border-dashed border-slate-200 rounded-2xl p-4 flex items-center justify-center text-slate-400 hover:border-blue-200 hover:text-blue-500 transition-all text-[10px] font-black uppercase tracking-widest gap-2"
                      >
                        <Plus size={14} /> Adicionar Componente
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Room Drawer/Modal - Simplified overlay */}
      <AnimatePresence>
        {isAddingRoom && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingRoom(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="bg-slate-900 p-7 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white leading-tight">{editingRoomId ? 'Editar Cômodo' : 'Configurar Cômodo'}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Defina as cargas conforme a NBR 5410</p>
                </div>
                <button 
                  onClick={() => {
                    setIsAddingRoom(false);
                    setEditingRoomId(null);
                    setCurrentRoom({ name: '', area: 0, perimeter: 0, type: 'living', tues: [] });
                  }} 
                  className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2.5">Identificação do Espaço</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Suíte Master, Cozinha Americana..."
                    value={currentRoom.name || ''}
                    onChange={e => handleRoomDataChange('name', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-sm shadow-sm placeholder:text-slate-300"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2.5">Área Útil (m²)</label>
                    <input 
                      type="number" 
                      placeholder="0.00"
                      value={currentRoom.area || ''}
                      onChange={e => handleRoomDataChange('area', Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-sm shadow-sm mono-value"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2.5">Perímetro (m)</label>
                    <input 
                      type="number" 
                      placeholder="0.00"
                      value={currentRoom.perimeter || ''}
                      onChange={e => handleRoomDataChange('perimeter', Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-sm shadow-sm mono-value"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-3">Ambiente</label>
                  <div className="grid grid-cols-3 gap-3">
                    {ROOM_TYPES.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => handleRoomDataChange('type', t.value)}
                        className={cn(
                          "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                          currentRoom.type === t.value 
                            ? "bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-600/30 scale-[1.02]" 
                            : "bg-white border-slate-100 text-slate-400 hover:border-slate-200 hover:bg-slate-50"
                        )}
                      >
                         <RoomIcon type={t.value} className="w-5 h-5 mb-1" />
                         <span className="text-[9px] font-black uppercase tracking-tight">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-5 h-5 bg-slate-900 rounded-lg flex items-center justify-center text-white">
                      <Settings size={12} />
                    </div>
                    <label className="text-[10px] font-black text-slate-900 uppercase tracking-[0.15em]">Agrupamento de Circuitos</label>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[8px] font-black text-slate-400 block mb-1.5 uppercase">ID Circ. Ilum.</span>
                      <input 
                        type="text" 
                        placeholder="Ex: L1"
                        value={currentRoom.lightingCircuitId || ''}
                        onChange={e => handleRoomDataChange('lightingCircuitId', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[8px] font-black text-slate-400 block mb-1.5 uppercase">ID Circ. Tomadas</span>
                      <input 
                        type="text" 
                        placeholder="Ex: T1"
                        value={currentRoom.tugCircuitId || ''}
                        onChange={e => handleRoomDataChange('tugCircuitId', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-xs"
                      />
                    </div>
                  </div>
                  <p className="text-[8px] text-slate-400 mt-2 italic">* Peças com o mesmo ID compartilharão o mesmo disjuntor no orçamento e diagrama.</p>
                </div>

                {/* NBR 5410 Recommendations Section */}
                <div className="bg-slate-900 rounded-[2.5rem] p-8 space-y-6 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                  
                  <div className="flex items-center gap-3 relative z-10">
                    <div className="w-8 h-8 bg-yellow-400 rounded-xl flex items-center justify-center text-slate-900 shadow-lg shadow-yellow-400/20">
                      <Zap size={16} />
                    </div>
                    <h4 className="text-[11px] font-black uppercase text-white tracking-[0.1em]">Dimensionamento NBR 5410</h4>
                  </div>

                  <div className="grid grid-cols-2 gap-4 relative z-10">
                    <div className="bg-white/5 border border-white/10 p-5 rounded-2xl relative">
                      <span className="text-[9px] font-black text-slate-400 block mb-2 uppercase tracking-widest">Iluminação</span>
                      <div className="flex items-center gap-2 mb-3">
                        <input 
                          type="number"
                          value={currentRoom.lights ?? 0}
                          onChange={(e) => handleRoomDataChange('lights', Number(e.target.value))}
                          className="bg-transparent border-none p-0 w-20 font-black text-white text-lg mono-value outline-none focus:ring-0"
                        />
                        <span className="text-[10px] font-bold text-slate-500">VA</span>
                      </div>
                      
                      <div className="space-y-2 border-t border-white/5 pt-3">
                        <div className="flex items-center justify-between">
                          <label className="text-[8px] font-black text-slate-500 uppercase">Dist. QD (m)</label>
                          <input 
                            type="number"
                            value={currentRoom.lightsLength ?? 10}
                            onChange={(e) => handleRoomDataChange('lightsLength', Number(e.target.value))}
                            className="bg-white/5 border-none p-1 rounded w-12 text-[10px] font-bold text-white text-right outline-none"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="text-[8px] font-black text-slate-500 uppercase">Cabo (mm²)</label>
                          <select 
                            value={currentRoom.lightsGauge ?? 1.5}
                            onChange={(e) => handleRoomDataChange('lightsGauge', Number(e.target.value))}
                            className="bg-white/5 border-none p-1 rounded w-12 text-[10px] font-bold text-white text-right outline-none"
                          >
                            {[1.5, 2.5, 4, 6, 10].map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        {(() => {
                          const res = calculateVoltageDrop(currentRoom.lights || 0, currentRoom.lightsLength || 10, currentRoom.lightsGauge || 1.5, 127, false, 4);
                          return (
                            <div className={cn("text-[8px] font-black uppercase mt-1 px-2 py-0.5 rounded-full inline-block", res.isWithinLimit ? "text-green-400 bg-green-400/10" : "text-red-400 bg-red-400/10")}>
                              {res.percentageDrop.toFixed(1)}% {res.isWithinLimit ? "✓" : `⚠️ Sugerido: ${res.suggestedGauge}mm²`}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    
                    <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                      <span className="text-[9px] font-black text-slate-400 block mb-2 uppercase tracking-widest">Tomadas (TUG)</span>
                      <div className="flex items-center gap-2 mb-3">
                        <input 
                          type="number"
                          value={currentRoom.tugs ?? 0}
                          onChange={(e) => handleRoomDataChange('tugs', Number(e.target.value))}
                          className="bg-transparent border-none p-0 w-16 font-black text-white text-lg mono-value outline-none focus:ring-0"
                        />
                        <span className="text-[10px] font-bold text-slate-500">UN</span>
                      </div>
                      
                      <div className="space-y-2 border-t border-white/5 pt-3">
                        <div className="flex items-center justify-between">
                          <label className="text-[8px] font-black text-slate-500 uppercase">Dist. QD (m)</label>
                          <input 
                            type="number"
                            value={currentRoom.tugsLength ?? 15}
                            onChange={(e) => handleRoomDataChange('tugsLength', Number(e.target.value))}
                            className="bg-white/5 border-none p-1 rounded w-12 text-[10px] font-bold text-white text-right outline-none"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="text-[8px] font-black text-slate-500 uppercase">Cabo (mm²)</label>
                          <select 
                            value={currentRoom.tugsGauge ?? 2.5}
                            onChange={(e) => handleRoomDataChange('tugsGauge', Number(e.target.value))}
                            className="bg-white/5 border-none p-1 rounded w-12 text-[10px] font-bold text-white text-right outline-none"
                          >
                            {[1.5, 2.5, 4, 6, 10].map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        {(() => {
                          const res = calculateVoltageDrop((currentRoom.tugs || 0) * 100, currentRoom.tugsLength || 15, currentRoom.tugsGauge || 2.5, 127, false, 7);
                          return (
                            <div className={cn("text-[8px] font-black uppercase mt-1 px-2 py-0.5 rounded-full inline-block", res.isWithinLimit ? "text-green-400 bg-green-400/10" : "text-red-400 bg-red-400/10")}>
                              {res.percentageDrop.toFixed(1)}% {res.isWithinLimit ? "✓" : `⚠️ Sugerido: ${res.suggestedGauge}mm²`}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 relative z-10">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cargas Especiais (TUE)</span>
                      <button 
                        onClick={() => handleRoomDataChange('tues', [...(currentRoom.tues || []), { id: Math.random().toString(), description: 'Equipamento Especial', power: 1500, voltage: 220, cableLength: 20, cableGauge: 4 }])}
                        className="text-[10px] font-black text-yellow-400 uppercase hover:text-yellow-300 transition-colors flex items-center gap-1.5"
                      >
                        <Plus size={12} /> Adicionar
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {(currentRoom.tues || []).length === 0 && (
                        <p className="text-[11px] text-slate-500 font-medium italic text-center py-2">Nenhuma TUE cadastrada</p>
                      )}
                      {(currentRoom.tues || []).map((tue) => (
                        <div key={tue.id} className="flex flex-col gap-3 bg-white/5 border border-white/10 p-5 rounded-2xl hover:bg-white/[0.08] transition-all group">
                          <div className="flex items-center gap-3">
                            <input 
                              className="flex-1 bg-transparent border-none text-[11px] font-black text-slate-200 p-0 outline-none focus:ring-0"
                              value={tue.description || ''}
                              onChange={(e) => {
                                const newTues = currentRoom.tues?.map(t => t.id === tue.id ? {...t, description: e.target.value} : t);
                                handleRoomDataChange('tues', newTues);
                              }}
                            />
                            <button 
                              onClick={() => handleRoomDataChange('tues', currentRoom.tues?.filter(t => t.id !== tue.id))}
                              className="text-slate-600 hover:text-red-400 transition-colors bg-white/5 w-6 h-6 rounded-lg flex items-center justify-center"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                              <input 
                                type="number"
                                className="w-20 bg-transparent border-none text-[11px] font-black text-white p-0 text-right mono-value outline-none focus:ring-0"
                                value={tue.power ?? 0}
                                onChange={(e) => {
                                  const newTues = currentRoom.tues?.map(t => t.id === tue.id ? {...t, power: Number(e.target.value)} : t);
                                  handleRoomDataChange('tues', newTues);
                                }}
                              />
                              <span className="text-[9px] font-bold text-slate-500">W</span>
                            </div>
                            <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 gap-1">
                              {[127, 220].map((v) => (
                                <button
                                  key={v}
                                  onClick={() => {
                                    const newTues = currentRoom.tues?.map(t => t.id === tue.id ? {...t, voltage: v as (127 | 220)} : t);
                                    handleRoomDataChange('tues', newTues);
                                  }}
                                  className={cn(
                                    "px-4 py-1.5 rounded-lg text-[9px] font-black transition-all",
                                    tue.voltage === v ? "bg-yellow-400 text-slate-900 shadow-lg shadow-yellow-400/20" : "text-white/40 hover:text-white/70"
                                  )}
                                >
                                  {v}V
                                </button>
                              ))}
                            </div>
                          </div>
                          
                          {/* TUE Voltage Drop */}
                          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5 mt-1">
                            <div className="flex items-center justify-between bg-white/5 px-3 py-2 rounded-xl">
                              <label className="text-[8px] font-black text-slate-500 uppercase">Dist (m)</label>
                              <input 
                                type="number"
                                value={tue.cableLength ?? 20}
                                onChange={(e) => {
                                  const newTues = currentRoom.tues?.map(t => t.id === tue.id ? {...t, cableLength: Number(e.target.value)} : t);
                                  handleRoomDataChange('tues', newTues);
                                }}
                                className="bg-transparent border-none p-0 w-10 text-[10px] font-bold text-white text-right outline-none"
                              />
                            </div>
                            <div className="flex items-center justify-between bg-white/5 px-3 py-2 rounded-xl">
                              <label className="text-[8px] font-black text-slate-500 uppercase">Bitola</label>
                              <select 
                                value={tue.cableGauge ?? 4}
                                onChange={(e) => {
                                  const newTues = currentRoom.tues?.map(t => t.id === tue.id ? {...t, cableGauge: Number(e.target.value)} : t);
                                  handleRoomDataChange('tues', newTues);
                                }}
                                className="bg-transparent border-none p-0 w-12 text-[10px] font-black text-white text-right outline-none"
                              >
                                {[1.5, 2.5, 4, 6, 10, 16, 25].map(s => <option key={s} value={s}>{s}mm²</option>)}
                              </select>
                            </div>
                          </div>
                          {(() => {
                            const res = calculateVoltageDrop(tue.power || 0, tue.cableLength || 20, tue.cableGauge || 4, tue.voltage, false, 7);
                            return (
                              <div className={cn("text-[8px] font-black uppercase px-3 py-1.5 rounded-xl flex items-center justify-between", res.isWithinLimit ? "text-green-400 bg-green-400/5" : "text-red-400 bg-red-400/5")}>
                                <span>Queda de Tensão: {res.percentageDrop.toFixed(2)}%</span>
                                <span>{res.isWithinLimit ? "✓ OK" : `⚠️ Sugerido: ${res.suggestedGauge}mm²`}</span>
                              </div>
                            );
                          })()}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    onClick={addRoom}
                    className="w-full bg-blue-600 py-5 text-white rounded-[2rem] font-black text-xs hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-95 uppercase tracking-widest"
                  >
                    {editingRoomId ? 'Atualizar Cômodo' : 'Confirmar e Adicionar'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Project Confirmation Modal */}
      <AnimatePresence>
        {projectToDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setProjectToDelete(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Excluir Projeto?</h3>
              <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                Esta ação não pode ser desfeita. Todos os cômodos e materiais deste projeto serão perdidos.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setProjectToDelete(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-xl font-bold text-sm transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => deleteProject(projectToDelete)}
                  className="bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-red-500/20"
                >
                  Sim, Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {techToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setTechToDelete(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Remover Técnico?</h3>
              <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                Tem certeza que deseja remover <strong>{techToDelete.name}</strong> do cadastro? Esta ação não pode ser desfeita.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setTechToDelete(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-xl font-bold text-sm transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => deleteTechnician(techToDelete)}
                  className="bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-red-500/20"
                >
                  Sim, Remover
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAddingCatalogItem && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingCatalogItem(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden"
            >
              <div className="p-10">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-600/20">
                    <Plus size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Novo Item no Catálogo</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Adicione materiais personalizados para o orçamento</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Nome do Material</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Refletor LED 50W, Sensor de Presença..."
                      value={newCatalogItem.name}
                      onChange={e => setNewCatalogItem(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-sm shadow-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Categoria</label>
                      <select 
                        value={newCatalogItem.category}
                        onChange={e => setNewCatalogItem(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-sm shadow-sm appearance-none"
                      >
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Preço Unitário (R$)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        placeholder="0,00"
                        value={newCatalogItem.price || ''}
                        onChange={e => setNewCatalogItem(prev => ({ ...prev, price: Number(e.target.value) }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-sm shadow-sm mono-value"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button 
                      onClick={() => setIsAddingCatalogItem(false)}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={addCatalogItem}
                      disabled={!newCatalogItem.name}
                      className="flex-[2] bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20 active:scale-95"
                    >
                      Adicionar ao Catálogo
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>






      {/* Image Cropper Modal */}
      {imageToCrop && (
        <ImageCropper
          image={imageToCrop}
          onCropDone={handleCropDone}
          onCancel={() => setImageToCrop(null)}
        />
      )}
    </div>
  );
}
