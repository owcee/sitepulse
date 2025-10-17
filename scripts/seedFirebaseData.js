/**
 * Seed Firebase Data Script for SitePulse
 * 
 * This script populates Firestore with initial project data including:
 * - Downtown Office Complex project
 * - Sample materials (Portland Cement, Steel Rebar)
 * - Sample workers (John Mason, Maria Rodriguez)
 * - Sample equipment (Excavator CAT 320, Concrete Mixer)
 * - Sample budget logs
 * 
 * Usage:
 *   node scripts/seedFirebaseData.js
 * 
 * Prerequisites:
 *   - Firebase project configured
 *   - Admin SDK credentials (or run this from a browser console with auth)
 */

// Import Firebase Admin SDK (requires installation: npm install firebase-admin)
// For browser-based seeding, use the regular Firebase SDK instead

const projectId = 'project-1';

const projectData = {
  id: projectId,
  name: 'Downtown Office Complex',
  description: 'Construction of 12-story office building',
  startDate: '2024-01-15',
  estimatedEndDate: '2024-12-15',
  status: 'active',
  totalBudget: 100000,
  engineerId: null, // Will be auto-assigned when first engineer accesses project
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const materials = [
  {
    name: 'Portland Cement',
    quantity: 50,
    price: 12.5,
    unit: 'bags',
    category: 'Construction Materials',
    supplier: 'BuildCorp',
    dateAdded: '2024-01-15',
    projectId,
  },
  {
    name: 'Steel Rebar 12mm',
    quantity: 100,
    price: 8.75,
    unit: 'pieces',
    category: 'Reinforcement',
    supplier: 'SteelWorks Ltd',
    dateAdded: '2024-01-16',
    projectId,
  },
];

const workers = [
  {
    name: 'John Mason',
    role: 'Site Supervisor',
    contractType: 'monthly',
    rate: 3500,
    phone: '+1234567890',
    email: 'john.mason@site.com',
    status: 'active',
    dateHired: '2024-01-01',
    projectId,
  },
  {
    name: 'Maria Rodriguez',
    role: 'Construction Worker',
    contractType: 'daily',
    rate: 120,
    phone: '+1234567891',
    email: null,
    status: 'active',
    dateHired: '2024-01-10',
    projectId,
  },
];

const equipment = [
  {
    name: 'Excavator CAT 320',
    type: 'rental',
    category: 'Heavy Machinery',
    condition: 'excellent',
    dailyRate: 450,
    weeklyRate: 2800,
    monthlyRate: 10500,
    status: 'in_use',
    dateAcquired: '2024-01-05',
    projectId,
  },
  {
    name: 'Concrete Mixer',
    type: 'owned',
    category: 'Tools',
    condition: 'good',
    status: 'available',
    dateAcquired: '2023-12-01',
    dailyRate: null,
    weeklyRate: null,
    monthlyRate: null,
    projectId,
  },
];

const budgetLogs = [
  {
    category: 'materials',
    description: 'Cement purchase',
    amount: 625,
    type: 'expense',
    date: '2024-01-15',
    reference: 'INV-001',
    projectId,
  },
];

console.log('\n========================================');
console.log('🔥 SitePulse Firebase Data Seeding');
console.log('========================================\n');
console.log('⚠️  MANUAL SEEDING INSTRUCTIONS\n');
console.log('This script provides the data structure for manual seeding.');
console.log('To seed data automatically, you would need Firebase Admin SDK.\n');

console.log('📝 STEPS TO SEED DATA MANUALLY:\n');
console.log('1. Go to Firebase Console: https://console.firebase.google.com/project/sitepulse-2d882/firestore');
console.log('2. Create the collections and documents as shown below\n');

console.log('═══════════════════════════════════════\n');
console.log('📁 COLLECTION: projects');
console.log('Document ID: project-1\n');
console.log(JSON.stringify(projectData, null, 2));

console.log('\n═══════════════════════════════════════\n');
console.log('📁 COLLECTION: materials');
console.log(`Add ${materials.length} documents (auto-generated IDs):\n`);
materials.forEach((material, index) => {
  console.log(`Material ${index + 1}:`);
  console.log(JSON.stringify(material, null, 2));
  console.log('');
});

console.log('\n═══════════════════════════════════════\n');
console.log('📁 COLLECTION: workers');
console.log(`Add ${workers.length} documents (auto-generated IDs):\n`);
workers.forEach((worker, index) => {
  console.log(`Worker ${index + 1}:`);
  console.log(JSON.stringify(worker, null, 2));
  console.log('');
});

console.log('\n═══════════════════════════════════════\n');
console.log('📁 COLLECTION: equipment');
console.log(`Add ${equipment.length} documents (auto-generated IDs):\n`);
equipment.forEach((equip, index) => {
  console.log(`Equipment ${index + 1}:`);
  console.log(JSON.stringify(equip, null, 2));
  console.log('');
});

console.log('\n═══════════════════════════════════════\n');
console.log('📁 COLLECTION: budget_logs');
console.log(`Add ${budgetLogs.length} documents (auto-generated IDs):\n`);
budgetLogs.forEach((log, index) => {
  console.log(`Budget Log ${index + 1}:`);
  console.log(JSON.stringify(log, null, 2));
  console.log('');
});

console.log('\n═══════════════════════════════════════\n');
console.log('✅ ALTERNATIVE: Browser Console Method\n');
console.log('Copy and run this code in your browser console after signing in:\n');

console.log(`
// Import Firebase (if not already imported)
import { getFirestore, collection, addDoc, setDoc, doc } from 'firebase/firestore';
const db = getFirestore();

// Seed project
await setDoc(doc(db, 'projects', 'project-1'), ${JSON.stringify(projectData)});

// Seed materials
${materials.map((m, i) => `await addDoc(collection(db, 'materials'), ${JSON.stringify(m)});`).join('\n')}

// Seed workers
${workers.map((w, i) => `await addDoc(collection(db, 'workers'), ${JSON.stringify(w)});`).join('\n')}

// Seed equipment
${equipment.map((e, i) => `await addDoc(collection(db, 'equipment'), ${JSON.stringify(e)});`).join('\n')}

// Seed budget logs
${budgetLogs.map((b, i) => `await addDoc(collection(db, 'budget_logs'), ${JSON.stringify(b)});`).join('\n')}

console.log('✅ Data seeded successfully!');
`);

console.log('\n========================================');
console.log('🎉 Data structure exported!');
console.log('========================================\n');

