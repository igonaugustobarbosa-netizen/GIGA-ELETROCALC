/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const STANDARDS = {
  LIGHTING: {
    INITIAL_VA: 100,
    INITIAL_AREA: 6,
    STEP_VA: 60,
    STEP_AREA: 4,
  },
  TUG: {
    KITCHEN_PERIMETER_STEP: 3.5,
    SOCIAL_PERIMETER_STEP: 5,
    MIN_VA_KITCHEN_FIRST_3: 600,
    MIN_VA_KITCHEN_OTHERS: 100,
    MIN_VA_SOCIAL: 100,
  },
  CABLES: {
    LIGHTING_BITOLA: 1.5,
    TUG_BITOLA: 2.5,
  }
};

export const ROOM_TYPES = [
  { value: 'living', label: 'Sala', icon: 'Sofa' },
  { value: 'bedroom', label: 'Quarto', icon: 'Bed' },
  { value: 'kitchen', label: 'Cozinha', icon: 'Utensils' },
  { value: 'bathroom', label: 'Banheiro', icon: 'Bath' },
  { value: 'laundry', label: 'Lavanderia', icon: 'WashingMachine' },
  { value: 'other', label: 'Outro', icon: 'Layout' },
];

export const DEFAULT_CATALOG: Record<string, number> = {
  // Condutores
  'cable-1.5': 2.50,
  'cable-2.5': 3.80,
  'cable-4.0': 5.50,
  'cable-6.0': 8.50,
  'cable-10.0': 13.00,
  'cable-16.0': 21.00,
  
  // Infraestrutura e Quadros
  'conduit-20': 3.50,
  'conduit-25': 4.20,
  'box-4x2': 1.20,
  'box-4x4': 2.80,
  'box-octo': 2.50,
  'quadro-12': 85.00,
  'quadro-24': 145.00,
  
  // Proteção
  'breaker-10': 15.0,
  'breaker-16': 15.0,
  'breaker-20': 15.0,
  'breaker-32': 18.0,
  'breaker-40': 22.0,
  'breaker-50': 28.0,
  'dr-40a': 125.00,
  'dps-20ka': 65.00,
  'busbar-pente': 45.00,
  'busbar-neutro': 12.00,
  'busbar-terra': 12.00,
  
  // Entrada de Serviço (Padrão Copel Aéreo)
  'poste-concreto-8m': 650.00,
  'caixa-copel': 450.00,
  'caixa-copel-bifasica': 310.00,
  'caixa-copel-monofasica': 225.00,
  'caixa-copel-trifasica': 450.00,
  'caixa-copel-monofasica-sub': 300.00,
  'caixa-copel-trifasica-sub': 550.00,
  'caixa-passagem-copel': 275.00,
  'breaker-tripolar-50': 120.00,
  'breaker-tripolar-63': 150.00,
  'breaker-tripolar-80': 180.00,
  'breaker-tripolar-100': 220.00,
  'breaker-bipolar-50': 65.00,
  'breaker-bipolar-63': 75.00,
  'breaker-bipolar-70': 95.00,
  'breaker-monopolar-30': 40.00,
  'breaker-monopolar-40': 45.00,
  'breaker-monopolar-50': 50.00,
  'breaker-bipolar-40': 60.00,
  'cabo-multiplex-25': 16.00,
  'cabo-multiplex-3x25': 14.00,
  'cabo-multiplex-3x16': 12.00,
  'cabo-multiplex-3x35': 22.50,
  'cabo-multiplex-4x25': 16.00,
  'cabo-multiplex-4x35': 22.50,
  'cabo-multiplex-4x50': 35.00,
  'cabo-multiplex-2x10': 7.50,
  'cabo-multiplex-2x16': 10.00,
  'cabo-cobre-10': 22.50,
  'cabo-cobre-16': 65.00,
  'cabo-cobre-25': 90.00,
  'cabo-cobre-35': 120.00,
  'cabo-cobre-50': 170.00,
  'haste-copel-2.4': 40.00,
  'cabo-aterro-16': 11.50,
  'cabo-aterro-10': 9.00,
  'conector-grampo-u': 20.00,
  'eletroduto-pvc-rigid-2': 42.50,
  'eletroduto-pvc-rigid-1.5': 35.00,
  'curva-pvc-90-2': 17.50,
  'luva-eletroduto-2': 10.00,
  'luva-eletroduto-1.5': 8.00,
  'curva-pvc-longa-1.5': 25.00,
  'curva-pvc-longa-2': 35.00,
  'bucha-arruela-kit': 10.00,
  'parafuso-bucha-kit': 3.50,
  'abracadeira-tipo-d': 3.50,
  'roldana-isolador': 20.00,
  'parafuso-olhal': 27.50,
  'conector-ipc': 27.50,
  'conector-emenda': 20.00,
  'cordoalha-aco': 17.50,
  'tampa-reforcada': 140.00,
  'areia-media': 85.00,
  'fita-advertencia': 35.00,
  
  // Dispositivos
  'socket-10a': 14.00,
  'socket-20a': 18.00,
  'switch-simple': 12.00,
  'switch-3way': 18.00,
  'lamp-led-9w': 10.00,
  'soquete-e27': 5.00,
  'plafon-led': 35.00,
  
  // Carga Pesada
  'chuveiro-7500w': 160.00,
  'torneira-eletrica': 180.00,
  
  // Miudezas
  'fita-isolante': 8.00,
  'fita-autofusao': 25.00,
  'bucha-parafuso': 0.50,
};
