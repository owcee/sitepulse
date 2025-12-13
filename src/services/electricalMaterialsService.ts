// Electrical Materials Service for SitePulse: Electrical
// Provides hardcoded list of electrical materials for automated tasks

export interface ElectricalMaterial {
  material_id: string;
  name: string;
  category: string;
  unit: string;
  unit_cost: number;
  current_stock: number;
  min_threshold: number;
}

// Hardcoded list of electrical materials for the 5 automated tasks
export const ELECTRICAL_MATERIALS_LIST: ElectricalMaterial[] = [
  // Conduits
  { material_id: 'em_001', name: '20mm PVC Conduit', category: 'conduits', unit: 'meter', unit_cost: 45.00, current_stock: 0, min_threshold: 4 },
  { material_id: 'em_002', name: '25mm PVC Conduit', category: 'conduits', unit: 'meter', unit_cost: 65.00, current_stock: 0, min_threshold: 4 },
  { material_id: 'em_003', name: 'PVC 90° Elbow (20mm)', category: 'conduits', unit: 'piece', unit_cost: 15.00, current_stock: 0, min_threshold: 4 },
  { material_id: 'em_004', name: 'PVC Coupler (20mm)', category: 'conduits', unit: 'piece', unit_cost: 8.00, current_stock: 0, min_threshold: 4 },
  { material_id: 'em_005', name: 'PVC Box Adaptor (20mm)', category: 'conduits', unit: 'piece', unit_cost: 12.00, current_stock: 0, min_threshold: 4 },
  
  // Hardware
  { material_id: 'em_006', name: 'Conduit Straps (pack of 10)', category: 'hardware', unit: 'pack', unit_cost: 25.00, current_stock: 0, min_threshold: 4 },
  { material_id: 'em_007', name: 'Concrete Anchors', category: 'hardware', unit: 'piece', unit_cost: 5.00, current_stock: 0, min_threshold: 4 },
  { material_id: 'em_016', name: 'Cable Staples (pack of 50)', category: 'hardware', unit: 'pack', unit_cost: 30.00, current_stock: 0, min_threshold: 4 },
  { material_id: 'em_031', name: 'Outlet Screws (pack of 20)', category: 'hardware', unit: 'pack', unit_cost: 10.00, current_stock: 0, min_threshold: 4 },
  { material_id: 'em_036', name: 'Fixture Mounting Bracket', category: 'hardware', unit: 'piece', unit_cost: 50.00, current_stock: 0, min_threshold: 4 },
  { material_id: 'em_038', name: 'Fixture Screws/Anchors', category: 'hardware', unit: 'pack', unit_cost: 15.00, current_stock: 0, min_threshold: 4 },
  
  // Boxes
  { material_id: 'em_008', name: '1-Gang Switch Box', category: 'boxes', unit: 'piece', unit_cost: 25.00, current_stock: 0, min_threshold: 4 },
  { material_id: 'em_009', name: '2-Gang Switch Box', category: 'boxes', unit: 'piece', unit_cost: 35.00, current_stock: 0, min_threshold: 4 },
  { material_id: 'em_010', name: '4" Square Junction Box', category: 'boxes', unit: 'piece', unit_cost: 40.00, current_stock: 0, min_threshold: 4 },
  { material_id: 'em_011', name: 'Octagonal Box', category: 'boxes', unit: 'piece', unit_cost: 35.00, current_stock: 0, min_threshold: 4 },
  
  // Wires
  { material_id: 'em_012', name: '14/2 Romex Cable', category: 'wires', unit: 'meter', unit_cost: 85.50, current_stock: 0, min_threshold: 4 },
  { material_id: 'em_013', name: '12/2 Romex Cable', category: 'wires', unit: 'meter', unit_cost: 120.75, current_stock: 0, min_threshold: 4 },
  { material_id: 'em_014', name: 'Bare Copper Ground Wire (14 AWG)', category: 'wires', unit: 'meter', unit_cost: 20.00, current_stock: 0, min_threshold: 4 },
  { material_id: 'em_017', name: '14 AWG THHN Wire (Black)', category: 'wires', unit: 'meter', unit_cost: 25.00, current_stock: 0, min_threshold: 4 },
  { material_id: 'em_018', name: '14 AWG THHN Wire (White)', category: 'wires', unit: 'meter', unit_cost: 25.00, current_stock: 0, min_threshold: 4 },
  { material_id: 'em_019', name: '14 AWG THHN Wire (Green)', category: 'wires', unit: 'meter', unit_cost: 25.00, current_stock: 0, min_threshold: 4 },
  { material_id: 'em_020', name: '12 AWG THHN Wire (Black)', category: 'wires', unit: 'meter', unit_cost: 35.00, current_stock: 0, min_threshold: 4 },
  { material_id: 'em_021', name: '12 AWG THHN Wire (White)', category: 'wires', unit: 'meter', unit_cost: 35.00, current_stock: 0, min_threshold: 4 },
  
  // Connectors
  { material_id: 'em_015', name: 'Romex Cable Connectors (pack of 10)', category: 'connectors', unit: 'pack', unit_cost: 40.00, current_stock: 0, min_threshold: 4 },
  { material_id: 'em_030', name: 'Wire Nuts (Red, pack of 10)', category: 'connectors', unit: 'pack', unit_cost: 50.00, current_stock: 0, min_threshold: 4 },
  { material_id: 'em_037', name: 'Wire Nuts (Yellow, pack of 10)', category: 'connectors', unit: 'pack', unit_cost: 40.00, current_stock: 0, min_threshold: 4 },
  
  // Consumables
  { material_id: 'em_022', name: 'Wire Lubricant', category: 'consumables', unit: 'can', unit_cost: 150.00, current_stock: 0, min_threshold: 4 },
  
  // Tools
  { material_id: 'em_023', name: 'Pull String/Measuring Tape', category: 'tools', unit: 'piece', unit_cost: 80.00, current_stock: 0, min_threshold: 4 },
  
  // Devices
  { material_id: 'em_024', name: 'Duplex Outlet (15A)', category: 'devices', unit: 'piece', unit_cost: 85.00, current_stock: 0, min_threshold: 4 },
  { material_id: 'em_025', name: 'Single Pole Switch', category: 'devices', unit: 'piece', unit_cost: 75.00, current_stock: 0, min_threshold: 4 },
  { material_id: 'em_026', name: '3-Way Switch', category: 'devices', unit: 'piece', unit_cost: 120.00, current_stock: 0, min_threshold: 4 },
  { material_id: 'em_027', name: 'GFCI Outlet', category: 'devices', unit: 'piece', unit_cost: 450.00, current_stock: 0, min_threshold: 4 },
  { material_id: 'em_028', name: 'Wall Plate (1-gang)', category: 'devices', unit: 'piece', unit_cost: 15.00, current_stock: 0, min_threshold: 4 },
  { material_id: 'em_029', name: 'Wall Plate (2-gang)', category: 'devices', unit: 'piece', unit_cost: 20.00, current_stock: 0, min_threshold: 4 },
  
  // Lighting
  { material_id: 'em_032', name: 'LED Downlight (6-inch)', category: 'lighting', unit: 'piece', unit_cost: 250.00, current_stock: 0, min_threshold: 4 },
  { material_id: 'em_033', name: 'LED Bulb (9W E27)', category: 'lighting', unit: 'piece', unit_cost: 80.00, current_stock: 0, min_threshold: 4 },
  { material_id: 'em_034', name: 'Ceiling Light Fixture', category: 'lighting', unit: 'piece', unit_cost: 400.00, current_stock: 0, min_threshold: 4 },
  { material_id: 'em_035', name: 'Ceiling Fan (56-inch)', category: 'lighting', unit: 'piece', unit_cost: 1500.00, current_stock: 0, min_threshold: 4 },
];

/**
 * Get all electrical materials
 */
export function getElectricalMaterials(): ElectricalMaterial[] {
  return ELECTRICAL_MATERIALS_LIST;
}

/**
 * Search electrical materials by name or category
 * Handles partial matches, ignores special characters and spaces
 */
export function searchElectricalMaterials(searchTerm: string): ElectricalMaterial[] {
  if (!searchTerm.trim()) {
    return ELECTRICAL_MATERIALS_LIST;
  }
  
  // Normalize search term: remove special chars, spaces, convert to lowercase
  const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
  const searchNormalized = normalize(searchTerm);
  
  return ELECTRICAL_MATERIALS_LIST.filter(material => {
    const nameNormalized = normalize(material.name);
    const categoryNormalized = normalize(material.category);
    
    // Check if normalized search term is found in normalized name or category
    return nameNormalized.includes(searchNormalized) || 
           categoryNormalized.includes(searchNormalized) ||
           // Also check if all words in search term appear in material name
           searchTerm.toLowerCase().split(/\s+/).every(word => 
             normalize(material.name).includes(normalize(word))
           );
  });
}

/**
 * Get electrical materials by category
 */
export function getElectricalMaterialsByCategory(category: string): ElectricalMaterial[] {
  return ELECTRICAL_MATERIALS_LIST.filter(material => material.category === category);
}

/**
 * Get unique categories
 */
export function getElectricalMaterialCategories(): string[] {
  const categories = new Set(ELECTRICAL_MATERIALS_LIST.map(m => m.category));
  return Array.from(categories).sort();
}

