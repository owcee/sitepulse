/**
 * Script to rename existing duplicate tasks with numbers
 * e.g., if there are 3 "Concrete pouring" tasks, they become:
 * - Concrete pouring (oldest, unchanged)
 * - Concrete pouring 2
 * - Concrete pouring 3
 * 
 * Run with: node scripts/renameDuplicateTasks.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');

try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (error) {
  console.error('❌ Error loading service account:', error.message);
  console.log('Make sure firebase-service-account.json exists in the project root.');
  process.exit(1);
}

const db = admin.firestore();

async function renameDuplicateTasks() {
  console.log('🔍 Finding duplicate tasks...\n');
  
  try {
    // Get all tasks
    const tasksSnapshot = await db.collection('tasks').get();
    
    if (tasksSnapshot.empty) {
      console.log('No tasks found in database.');
      return;
    }
    
    console.log(`Found ${tasksSnapshot.size} total tasks.\n`);
    
    // Group tasks by projectId
    const tasksByProject = new Map();
    
    tasksSnapshot.forEach(doc => {
      const data = doc.data();
      const projectId = data.projectId;
      
      if (!tasksByProject.has(projectId)) {
        tasksByProject.set(projectId, []);
      }
      
      // Handle various createdAt formats
      let createdAt;
      if (data.createdAt) {
        if (typeof data.createdAt.toDate === 'function') {
          createdAt = data.createdAt.toDate();
        } else if (data.createdAt instanceof Date) {
          createdAt = data.createdAt;
        } else if (typeof data.createdAt === 'string') {
          createdAt = new Date(data.createdAt);
        } else {
          createdAt = new Date(0);
        }
      } else {
        createdAt = new Date(0);
      }
      
      tasksByProject.get(projectId).push({
        id: doc.id,
        title: data.title,
        createdAt: createdAt,
        ...data
      });
    });
    
    console.log(`Tasks grouped into ${tasksByProject.size} projects.\n`);
    
    // Process each project
    let totalRenamed = 0;
    
    for (const [projectId, tasks] of tasksByProject) {
      console.log(`\n📁 Processing project: ${projectId}`);
      console.log(`   Tasks in project: ${tasks.length}`);
      
      // Group by base title (remove existing numbers like "Task 2" -> "Task")
      const tasksByBaseTitle = new Map();
      
      for (const task of tasks) {
        // Extract base title by removing trailing numbers like " 2", " 3", etc.
        const baseTitle = task.title.replace(/\s+\d+$/, '').trim();
        
        if (!tasksByBaseTitle.has(baseTitle)) {
          tasksByBaseTitle.set(baseTitle, []);
        }
        tasksByBaseTitle.get(baseTitle).push(task);
      }
      
      // Find duplicates and rename
      for (const [baseTitle, duplicates] of tasksByBaseTitle) {
        if (duplicates.length > 1) {
          console.log(`\n   🔄 Found ${duplicates.length} tasks with base title: "${baseTitle}"`);
          
          // Sort by createdAt (oldest first)
          duplicates.sort((a, b) => {
            const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
            const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
            return aTime - bTime;
          });
          
          // Rename each task
          for (let i = 0; i < duplicates.length; i++) {
            const task = duplicates[i];
            let newTitle;
            
            if (i === 0) {
              // First (oldest) task keeps the base title
              newTitle = baseTitle;
            } else {
              // Subsequent tasks get numbered
              newTitle = `${baseTitle} ${i + 1}`;
            }
            
            // Only update if title is different
            if (task.title !== newTitle) {
              console.log(`      📝 Renaming: "${task.title}" -> "${newTitle}"`);
              
              await db.collection('tasks').doc(task.id).update({
                title: newTitle,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              });
              
              totalRenamed++;
            } else {
              console.log(`      ✓ Already correct: "${task.title}"`);
            }
          }
        }
      }
    }
    
    console.log(`\n\n✅ Done! Renamed ${totalRenamed} tasks.`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the script
renameDuplicateTasks()
  .then(() => {
    console.log('\n👋 Script finished.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });

