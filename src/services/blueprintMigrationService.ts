// Blueprint Migration Service
// One-time migration to set default blueprint for all existing projects

import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

// Default blueprint image URL (local asset - will be used if no blueprint exists)
// For production, this should be uploaded to Firebase Storage and use that URL
const DEFAULT_BLUEPRINT_IMAGE_URL = 'https://firebasestorage.googleapis.com/v0/b/YOUR_PROJECT_ID.appspot.com/o/default-blueprint.jpg?alt=media';

/**
 * Migrate all existing projects to have a default blueprint
 * This is a one-time migration function
 */
export async function migrateProjectsWithDefaultBlueprint(): Promise<{
  success: boolean;
  migrated: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let migrated = 0;

  try {
    // Get all projects
    const projectsRef = collection(db, 'projects');
    const projectsSnapshot = await getDocs(projectsRef);

    if (projectsSnapshot.empty) {
      return { success: true, migrated: 0, errors: [] };
    }

    // Get all existing blueprints
    const blueprintsRef = collection(db, 'blueprints');
    const blueprintsSnapshot = await getDocs(blueprintsRef);
    const existingBlueprintProjectIds = new Set<string>();
    
    blueprintsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.projectId) {
        existingBlueprintProjectIds.add(data.projectId);
      }
    });

    // Create blueprints for projects that don't have one
    for (const projectDoc of projectsSnapshot.docs) {
      const projectId = projectDoc.id;
      
      // Skip if blueprint already exists
      if (existingBlueprintProjectIds.has(projectId)) {
        continue;
      }

      try {
        // Create blueprint document with empty imageUrl (will use default in UI)
        await addDoc(blueprintsRef, {
          projectId: projectId,
          imageUrl: '', // Empty means use default blueprint in UI
          pins: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        
        migrated++;
        console.log(`✅ Created blueprint for project: ${projectId}`);
      } catch (error: any) {
        const errorMsg = `Failed to create blueprint for project ${projectId}: ${error.message}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    return {
      success: errors.length === 0,
      migrated,
      errors,
    };
  } catch (error: any) {
    return {
      success: false,
      migrated,
      errors: [`Migration failed: ${error.message}`],
    };
  }
}

