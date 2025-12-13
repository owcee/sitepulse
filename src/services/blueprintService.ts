// Blueprint Service for SitePulse: Electrical
// Handles blueprint and pin management for electrical construction projects

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment
} from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { uploadWithProgress } from './storageUploadHelperV2';

// Pin types for electrical tasks
export type PinType = 
  | 'conduit_installation'
  | 'electrical_box_wires'
  | 'cable_pulling'
  | 'outlet_switch_installation'
  | 'light_fixture_installation'
  | 'manual_task'; // For tasks not covered by CNN automation

export interface BlueprintPin {
  id: string;
  blueprintId: string;
  projectId: string;
  pinType: PinType;
  x: number; // Percentage-based X coordinate (0-100)
  y: number; // Percentage-based Y coordinate (0-100)
  componentType?: string; // e.g., "Outlet", "Switch", "Light Fixture"
  description?: string;
  taskId?: string; // Reference to associated task (auto-created)
  verifiedCount: number; // Number of times this pin has been verified
  totalRequired: number; // Total number of items needed at this location
  status: 'pending' | 'in_progress' | 'completed'; // Based on verifiedCount / totalRequired
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface Blueprint {
  id: string;
  projectId: string;
  imageUrl: string;
  pins: BlueprintPin[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get blueprint by project ID
 */
export async function getBlueprintByProjectId(projectId: string): Promise<Blueprint | null> {
  try {
    const blueprintsRef = collection(db, 'blueprints');
    const q = query(blueprintsRef, where('projectId', '==', projectId));
    const snapshot = await getDocs(q);

    // If no blueprint found, return null (will use default image in UI)
    if (snapshot.empty) {
      return null;
    }

    const blueprintDoc = snapshot.docs[0];
    const data = blueprintDoc.data();

    return {
      id: blueprintDoc.id,
      projectId: data.projectId,
      imageUrl: data.imageUrl,
      pins: (data.pins || []).map((pin: any) => ({
        ...pin,
        createdAt: pin.createdAt?.toDate() || new Date(),
        updatedAt: pin.updatedAt?.toDate() || new Date(),
      })),
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  } catch (error) {
    console.error('Error getting blueprint:', error);
    throw new Error('Failed to get blueprint');
  }
}

/**
 * Get blueprint by ID
 */
export async function getBlueprint(blueprintId: string): Promise<Blueprint | null> {
  try {
    const blueprintRef = doc(db, 'blueprints', blueprintId);
    const blueprintDoc = await getDoc(blueprintRef);

    if (!blueprintDoc.exists()) {
      return null;
    }

    const data = blueprintDoc.data();

    return {
      id: blueprintDoc.id,
      projectId: data.projectId,
      imageUrl: data.imageUrl,
      pins: (data.pins || []).map((pin: any) => ({
        ...pin,
        createdAt: pin.createdAt?.toDate() || new Date(),
        updatedAt: pin.updatedAt?.toDate() || new Date(),
      })),
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  } catch (error) {
    console.error('Error getting blueprint:', error);
    throw new Error('Failed to get blueprint');
  }
}

/**
 * Update blueprint image
 */
export async function updateBlueprintImage(
  blueprintId: string,
  imageUri: string
): Promise<string> {
  try {
    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }

    // Upload new image
    const storagePath = `blueprints/${blueprintId}/electrical_plan.jpg`;
    const imageUrl = await uploadWithProgress(storagePath, imageUri);

    // Update blueprint document
    const blueprintRef = doc(db, 'blueprints', blueprintId);
    await updateDoc(blueprintRef, {
      imageUrl: imageUrl,
      updatedAt: serverTimestamp()
    });

    console.log('✅ Blueprint image updated:', imageUrl);
    return imageUrl;
  } catch (error) {
    console.error('Error updating blueprint image:', error);
    throw new Error('Failed to update blueprint image');
  }
}

/**
 * Add a pin to a blueprint
 */
export async function addPinToBlueprint(
  blueprintId: string,
  pinData: {
    projectId: string;
    pinType: PinType;
    x: number; // Percentage (0-100)
    y: number; // Percentage (0-100)
    componentType?: string;
    description?: string;
    totalRequired?: number;
  }
): Promise<BlueprintPin> {
  try {
    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }

    const blueprintRef = doc(db, 'blueprints', blueprintId);
    const blueprintDoc = await getDoc(blueprintRef);

    if (!blueprintDoc.exists()) {
      throw new Error('Blueprint not found');
    }

    const newPin: Omit<BlueprintPin, 'id' | 'createdAt' | 'updatedAt'> = {
      blueprintId: blueprintId,
      projectId: pinData.projectId,
      pinType: pinData.pinType,
      x: pinData.x,
      y: pinData.y,
      componentType: pinData.componentType,
      description: pinData.description,
      verifiedCount: 0,
      totalRequired: pinData.totalRequired || 1,
      status: 'pending',
      createdBy: auth.currentUser.uid,
    };

    // Add pin to blueprint's pins array
    await updateDoc(blueprintRef, {
      pins: arrayUnion({
        ...newPin,
        id: `pin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
      updatedAt: serverTimestamp()
    });

    // Get updated blueprint to return the new pin with proper ID
    const updatedDoc = await getDoc(blueprintRef);
    const updatedData = updatedDoc.data();
    const pins = updatedData.pins || [];
    const createdPin = pins[pins.length - 1]; // Last pin is the one we just added

    const blueprintPin: BlueprintPin = {
      ...createdPin,
      id: createdPin.id,
      createdAt: createdPin.createdAt?.toDate() || new Date(),
      updatedAt: createdPin.updatedAt?.toDate() || new Date(),
    };

    console.log('✅ Pin added to blueprint:', blueprintPin.id);
    return blueprintPin;
  } catch (error) {
    console.error('Error adding pin to blueprint:', error);
    throw new Error('Failed to add pin to blueprint');
  }
}

/**
 * Update a pin in a blueprint
 */
export async function updatePinInBlueprint(
  blueprintId: string,
  pinId: string,
  updates: Partial<{
    pinType: PinType;
    x: number;
    y: number;
    componentType: string;
    description: string;
    totalRequired: number;
    taskId: string;
  }>
): Promise<void> {
  try {
    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }

    const blueprintRef = doc(db, 'blueprints', blueprintId);
    const blueprintDoc = await getDoc(blueprintRef);

    if (!blueprintDoc.exists()) {
      throw new Error('Blueprint not found');
    }

    const data = blueprintDoc.data();
    const pins = data.pins || [];
    const pinIndex = pins.findIndex((p: any) => p.id === pinId);

    if (pinIndex === -1) {
      throw new Error('Pin not found');
    }

    // Update the pin
    pins[pinIndex] = {
      ...pins[pinIndex],
      ...updates,
      updatedAt: serverTimestamp(),
    };

    // Update blueprint document
    await updateDoc(blueprintRef, {
      pins: pins,
      updatedAt: serverTimestamp()
    });

    console.log('✅ Pin updated:', pinId);
  } catch (error) {
    console.error('Error updating pin:', error);
    throw new Error('Failed to update pin');
  }
}

/**
 * Delete a pin from a blueprint
 */
export async function deletePinFromBlueprint(
  blueprintId: string,
  pinId: string
): Promise<void> {
  try {
    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }

    const blueprintRef = doc(db, 'blueprints', blueprintId);
    const blueprintDoc = await getDoc(blueprintRef);

    if (!blueprintDoc.exists()) {
      throw new Error('Blueprint not found');
    }

    const data = blueprintDoc.data();
    const pins = (data.pins || []).filter((p: any) => p.id !== pinId);

    // Update blueprint document
    await updateDoc(blueprintRef, {
      pins: pins,
      updatedAt: serverTimestamp()
    });

    console.log('✅ Pin deleted:', pinId);
  } catch (error) {
    console.error('Error deleting pin:', error);
    throw new Error('Failed to delete pin');
  }
}

/**
 * Increment verified count for a pin (called when worker verifies)
 */
export async function incrementPinVerification(
  blueprintId: string,
  pinId: string
): Promise<void> {
  try {
    const blueprintRef = doc(db, 'blueprints', blueprintId);
    const blueprintDoc = await getDoc(blueprintRef);

    if (!blueprintDoc.exists()) {
      throw new Error('Blueprint not found');
    }

    const data = blueprintDoc.data();
    const pins = data.pins || [];
    const pinIndex = pins.findIndex((p: any) => p.id === pinId);

    if (pinIndex === -1) {
      throw new Error('Pin not found');
    }

    // Increment verified count
    pins[pinIndex].verifiedCount = (pins[pinIndex].verifiedCount || 0) + 1;

    // Update status based on verified count
    const verifiedCount = pins[pinIndex].verifiedCount;
    const totalRequired = pins[pinIndex].totalRequired || 1;
    
    if (verifiedCount >= totalRequired) {
      pins[pinIndex].status = 'completed';
    } else if (verifiedCount > 0) {
      pins[pinIndex].status = 'in_progress';
    } else {
      pins[pinIndex].status = 'pending';
    }

    pins[pinIndex].updatedAt = serverTimestamp();

    // Update blueprint document
    await updateDoc(blueprintRef, {
      pins: pins,
      updatedAt: serverTimestamp()
    });

    console.log('✅ Pin verification incremented:', pinId, 'Count:', verifiedCount);
  } catch (error) {
    console.error('Error incrementing pin verification:', error);
    throw new Error('Failed to increment pin verification');
  }
}

/**
 * Link a task to a pin
 */
export async function linkTaskToPin(
  blueprintId: string,
  pinId: string,
  taskId: string
): Promise<void> {
  try {
    await updatePinInBlueprint(blueprintId, pinId, { taskId });
    console.log('✅ Task linked to pin:', pinId, 'Task:', taskId);
  } catch (error) {
    console.error('Error linking task to pin:', error);
    throw new Error('Failed to link task to pin');
  }
}

