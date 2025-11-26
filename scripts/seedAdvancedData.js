/**
 * Seed Advanced Data for SitePulse (Phase 2)
 * 
 * This script seeds Firebase with sample data for Phase 2 features:
 * - Notifications
 * - Task Photos
 * - Usage Submissions
 * - Worker Assignments
 * 
 * Usage:
 *   node scripts/seedAdvancedData.js
 * 
 * Note: Make sure you have:
 * 1. Deployed firestore rules and indexes
 * 2. Created at least one engineer and worker account
 * 3. Created at least one project
 */

const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  addDoc, 
  setDoc,
  doc,
  serverTimestamp 
} = require('firebase/firestore');

// Firebase configuration (should match your firebaseConfig.js)
const firebaseConfig = {
  apiKey: "AIzaSyBnCa0kuR39LMNlJb_toNDlRDhfCXUsMdU",
  authDomain: "sitepulse-2d882.firebaseapp.com",
  projectId: "sitepulse-2d882",
  storageBucket: "sitepulse-2d882.firebasestorage.app",
  messagingSenderId: "675231551037",
  appId: "1:675231551037:web:2c9f125bacc84264e3e454",
  measurementId: "G-37NWZXRDBS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Sample data
const SAMPLE_PROJECT_ID = 'project-1';
const SAMPLE_ENGINEER_ID = 'engineer-uid-1'; // Replace with actual engineer UID
const SAMPLE_WORKER_ID = 'worker-uid-1'; // Replace with actual worker UID

async function seedNotifications() {
  console.log('\n📬 Seeding Notifications...');
  
  const notifications = [
    {
      userId: SAMPLE_ENGINEER_ID,
      title: 'New Task Photo Uploaded',
      body: 'Foundation work photo uploaded by John Worker requires verification',
      type: 'task_approval',
      read: false,
      timestamp: serverTimestamp(),
      relatedId: 'task-1',
      projectId: SAMPLE_PROJECT_ID,
      status: 'pending'
    },
    {
      userId: SAMPLE_WORKER_ID,
      title: 'Photo Approved',
      body: 'Your concrete pouring photo has been approved by the engineer',
      type: 'task_approval',
      read: false,
      timestamp: serverTimestamp(),
      relatedId: 'photo-1',
      projectId: SAMPLE_PROJECT_ID,
      status: 'completed'
    },
    {
      userId: SAMPLE_WORKER_ID,
      title: 'Usage Report Approved',
      body: 'Your material usage report for Portland Cement has been approved',
      type: 'usage_approved',
      read: true,
      timestamp: serverTimestamp(),
      relatedId: 'usage-1',
      projectId: SAMPLE_PROJECT_ID,
      status: 'completed'
    }
  ];

  const notificationsRef = collection(db, 'notifications');
  
  for (const notification of notifications) {
    const docRef = await addDoc(notificationsRef, notification);
    console.log(`  ✓ Created notification: ${docRef.id} - "${notification.title}"`);
  }
}

async function seedTaskPhotos() {
  console.log('\n📷 Seeding Task Photos...');
  
  const photos = [
    {
      taskId: 'task-1',
      projectId: SAMPLE_PROJECT_ID,
      uploaderId: SAMPLE_WORKER_ID,
      uploaderName: 'John Worker',
      imageUrl: 'https://via.placeholder.com/800x600?text=Foundation+Work',
      storagePath: `task_photos/${SAMPLE_PROJECT_ID}/task-1/photo1.jpg`,
      cnnClassification: 'Foundation Work',
      confidence: 0.92,
      verificationStatus: 'pending',
      notes: 'Foundation excavation completed for Section A',
      uploadedAt: serverTimestamp(),
      verifiedAt: null,
      verifiedBy: null,
      rejectionReason: null
    },
    {
      taskId: 'task-2',
      projectId: SAMPLE_PROJECT_ID,
      uploaderId: SAMPLE_WORKER_ID,
      uploaderName: 'John Worker',
      imageUrl: 'https://via.placeholder.com/800x600?text=Concrete+Pouring',
      storagePath: `task_photos/${SAMPLE_PROJECT_ID}/task-2/photo2.jpg`,
      cnnClassification: 'Concrete Pouring',
      confidence: 0.88,
      verificationStatus: 'approved',
      notes: 'Concrete pouring for foundation',
      uploadedAt: serverTimestamp(),
      verifiedAt: serverTimestamp(),
      verifiedBy: SAMPLE_ENGINEER_ID,
      rejectionReason: null
    }
  ];

  const photosRef = collection(db, 'task_photos');
  
  for (const photo of photos) {
    const docRef = await addDoc(photosRef, photo);
    console.log(`  ✓ Created task photo: ${docRef.id} - ${photo.cnnClassification} (${photo.verificationStatus})`);
  }
}

async function seedUsageSubmissions() {
  console.log('\n📦 Seeding Usage Submissions...');
  
  const submissions = [
    {
      projectId: SAMPLE_PROJECT_ID,
      workerId: SAMPLE_WORKER_ID,
      workerName: 'John Worker',
      type: 'material',
      itemId: 'material-1',
      itemName: 'Portland Cement',
      quantity: 10,
      unit: 'bags',
      notes: 'Used for foundation work in Section A',
      photoUrl: 'https://via.placeholder.com/400x300?text=Cement+Usage',
      status: 'approved',
      rejectionReason: null,
      timestamp: serverTimestamp(),
      reviewedAt: serverTimestamp(),
      reviewerId: SAMPLE_ENGINEER_ID,
      taskId: 'task-1'
    },
    {
      projectId: SAMPLE_PROJECT_ID,
      workerId: SAMPLE_WORKER_ID,
      workerName: 'John Worker',
      type: 'equipment',
      itemId: 'equipment-1',
      itemName: 'Excavator CAT 320',
      quantity: null,
      unit: null,
      notes: 'Used for excavation work, approximately 4 hours',
      photoUrl: 'https://via.placeholder.com/400x300?text=Excavator+Usage',
      status: 'pending',
      rejectionReason: null,
      timestamp: serverTimestamp(),
      reviewedAt: null,
      reviewerId: null,
      taskId: 'task-1'
    },
    {
      projectId: SAMPLE_PROJECT_ID,
      workerId: SAMPLE_WORKER_ID,
      workerName: 'John Worker',
      type: 'damage',
      itemId: 'equipment-2',
      itemName: 'Concrete Mixer',
      quantity: null,
      unit: null,
      notes: 'Motor overheated during continuous operation. Requires inspection.',
      photoUrl: 'https://via.placeholder.com/400x300?text=Mixer+Damage',
      status: 'pending',
      rejectionReason: null,
      timestamp: serverTimestamp(),
      reviewedAt: null,
      reviewerId: null,
      taskId: 'task-2'
    }
  ];

  const submissionsRef = collection(db, 'usage_submissions');
  
  for (const submission of submissions) {
    const docRef = await addDoc(submissionsRef, submission);
    console.log(`  ✓ Created usage submission: ${docRef.id} - ${submission.type}: ${submission.itemName} (${submission.status})`);
  }
}

async function seedWorkerAssignments() {
  console.log('\n👷 Seeding Worker Assignments...');
  
  const assignments = [
    {
      workerId: SAMPLE_WORKER_ID,
      workerName: 'John Worker',
      workerEmail: 'john.worker@example.com',
      projectId: SAMPLE_PROJECT_ID,
      projectName: 'Downtown Office Complex',
      status: 'accepted',
      invitedBy: SAMPLE_ENGINEER_ID,
      invitedByName: 'Sarah Engineer',
      invitedAt: serverTimestamp(),
      decidedAt: serverTimestamp()
    }
  ];

  for (const assignment of assignments) {
    const assignmentRef = doc(db, 'worker_assignments', assignment.workerId);
    await setDoc(assignmentRef, assignment);
    console.log(`  ✓ Created worker assignment: ${assignment.workerName} → ${assignment.projectName} (${assignment.status})`);
  }
}

async function seedAll() {
  console.log('🌱 Starting SitePulse Phase 2 Data Seeding...');
  console.log('================================================');
  
  try {
    await seedNotifications();
    await seedTaskPhotos();
    await seedUsageSubmissions();
    await seedWorkerAssignments();
    
    console.log('\n================================================');
    console.log('✅ Seeding completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Deploy Firestore rules: npx firebase-tools deploy --only firestore:rules');
    console.log('2. Deploy Firestore indexes: npx firebase-tools deploy --only firestore:indexes');
    console.log('3. Deploy Storage rules: npx firebase-tools deploy --only storage');
    console.log('4. Test the app features');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error seeding data:', error);
    console.error('\nTroubleshooting:');
    console.error('- Make sure Firestore is enabled in Firebase Console');
    console.error('- Verify firestore rules are deployed');
    console.error('- Update SAMPLE_PROJECT_ID, SAMPLE_ENGINEER_ID, and SAMPLE_WORKER_ID with actual IDs');
    process.exit(1);
  }
}

// Run seeding
seedAll();












