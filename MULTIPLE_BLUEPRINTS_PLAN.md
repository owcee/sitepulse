# 📐 Multiple Blueprints Per Floor - Implementation Plan

## Current Architecture Analysis

### Current State (One Blueprint Per Project)
- **Project Schema**: Has `blueprintId` (single reference)
- **Blueprint Schema**: 
  - `id`, `projectId`, `imageUrl`, `pins[]`, `createdAt`, `updatedAt`
  - No `floor` field
- **Functions**: 
  - `getBlueprintByProjectId()` - Returns first blueprint found
  - `getBlueprint(blueprintId)` - Gets by ID
- **Storage Path**: `blueprints/{blueprintId}/electrical_plan.jpg`

### Target Architecture (Multiple Blueprints Per Floor)
- **Project Schema**: Remove `blueprintId` (or keep for backward compatibility)
- **Blueprint Schema**: Add `floor` field (string: "Ground Floor", "1st Floor", "2nd Floor", etc.)
- **Functions**: 
  - `getBlueprintsByProjectId()` - Returns array of all blueprints
  - `getBlueprintByProjectIdAndFloor()` - Gets specific floor blueprint
  - `getBlueprint(blueprintId)` - Keep existing (by ID)
- **Storage Path**: `blueprints/{projectId}/{floor}/electrical_plan.jpg`

---

## Required Changes

### 1. Database Schema Updates

#### Blueprint Interface (`src/services/blueprintService.ts`)
```typescript
export interface Blueprint {
  id: string;
  projectId: string;
  floor: string; // NEW: "Ground Floor", "1st Floor", "2nd Floor", etc.
  imageUrl: string;
  pins: BlueprintPin[];
  createdAt: Date;
  updatedAt: Date;
}
```

#### Project Interface (`src/services/projectService.ts`)
```typescript
export interface Project {
  // ... existing fields
  blueprintId?: string; // DEPRECATED: Keep for backward compatibility
  // Remove or keep - we'll query blueprints by projectId instead
}
```

### 2. Service Function Updates

#### New Functions Needed:
1. `getBlueprintsByProjectId(projectId)` - Get all blueprints for a project
2. `getBlueprintByProjectIdAndFloor(projectId, floor)` - Get specific floor
3. `createBlueprint(projectId, floor, imageUrl)` - Create new blueprint
4. `deleteBlueprint(blueprintId)` - Delete a blueprint

#### Functions to Update:
1. `getBlueprintByProjectId()` - Change to return array or specific floor
2. `updateBlueprintImage()` - Update storage path to include floor
3. All pin functions - Already work with blueprintId (no changes needed)

### 3. UI Updates

#### BlueprintEditorScreen (`src/screens/engineer/BlueprintEditorScreen.tsx`)
- Add floor selector (dropdown/picker)
- Show list of floors if multiple exist
- Allow creating new floor blueprint
- Update to use `getBlueprintByProjectIdAndFloor()`

#### CreateNewProjectScreen (`src/screens/engineer/CreateNewProjectScreen.tsx`)
- Change from single blueprint upload to floor-based
- Allow uploading multiple blueprints (one per floor)
- Or: Upload first blueprint, allow adding more floors later

#### WorkerBlueprintScreen (to be created)
- Show floor selector
- Filter pins by selected floor
- Allow switching between floors

### 4. Storage Path Updates

**Current**: `blueprints/{blueprintId}/electrical_plan.jpg`  
**New**: `blueprints/{projectId}/{floor}/electrical_plan.jpg`

**Migration**: Existing blueprints will need path update or keep old structure

---

## Implementation Steps

### Step 1: Update Blueprint Schema
- [ ] Add `floor` field to Blueprint interface
- [ ] Update all blueprint creation functions to require floor
- [ ] Add floor validation (non-empty string)

### Step 2: Update Service Functions
- [ ] Create `getBlueprintsByProjectId()` - returns array
- [ ] Create `getBlueprintByProjectIdAndFloor()` - returns single
- [ ] Update `getBlueprintByProjectId()` - deprecate or make it return first floor
- [ ] Update `updateBlueprintImage()` - use new storage path
- [ ] Create `createBlueprint()` function
- [ ] Create `deleteBlueprint()` function

### Step 3: Update BlueprintEditorScreen
- [ ] Add floor selector UI
- [ ] Load blueprint by projectId + floor
- [ ] Allow creating new floor blueprint
- [ ] Show list of existing floors
- [ ] Update image upload to use floor-based path

### Step 4: Update Project Creation
- [ ] Modify CreateNewProjectScreen to support floor input
- [ ] Update `createProject()` to create blueprint with floor
- [ ] Allow adding more floors after project creation

### Step 5: Update Worker Blueprint Screen (PHASE 1.13)
- [ ] Add floor selector
- [ ] Filter pins by floor
- [ ] Show floor name in header

### Step 6: Migration (Optional)
- [ ] Script to add `floor: "Ground Floor"` to existing blueprints
- [ ] Update storage paths for existing blueprints
- [ ] Keep backward compatibility for projects without floor

---

## Files to Modify

### Core Services
1. `src/services/blueprintService.ts` - Schema + functions
2. `src/services/projectService.ts` - Remove blueprintId dependency

### UI Screens
3. `src/screens/engineer/BlueprintEditorScreen.tsx` - Floor selector
4. `src/screens/engineer/CreateNewProjectScreen.tsx` - Multi-floor support
5. `src/screens/worker/WorkerBlueprintScreen.tsx` - Floor selector (new)

### Other
6. `firestore.indexes.json` - Add index for `projectId + floor` query
7. `firestore.rules` - Update if needed for floor-based access

---

## Backward Compatibility Strategy

### Option 1: Gradual Migration
- Keep `blueprintId` in Project for existing projects
- New projects don't use `blueprintId`
- `getBlueprintByProjectId()` checks for `blueprintId` first, then queries by projectId

### Option 2: Clean Break
- Remove `blueprintId` from Project
- Migrate all existing blueprints to have `floor: "Ground Floor"`
- Update all queries immediately

**Recommendation**: Option 1 (Gradual Migration) - safer, allows rollback

---

## Example Floor Values

Common floor naming:
- "Ground Floor" / "Ground Level"
- "1st Floor" / "First Floor"
- "2nd Floor" / "Second Floor"
- "Basement" / "B1"
- "Roof" / "Rooftop"

**Recommendation**: Use standardized format: "Ground Floor", "1st Floor", "2nd Floor", etc.

---

## Database Indexes Needed

```json
{
  "collectionGroup": "blueprints",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "projectId", "order": "ASCENDING" },
    { "fieldPath": "floor", "order": "ASCENDING" }
  ]
}
```

---

## Testing Checklist

- [ ] Create project with multiple floors
- [ ] Add pins to different floors
- [ ] Switch between floors in editor
- [ ] Verify pins are isolated per floor
- [ ] Test worker blueprint view with floor selector
- [ ] Test backward compatibility with old projects
- [ ] Verify storage paths are correct
- [ ] Test blueprint deletion

---

## Estimated Time

- **Schema Updates**: 1 hour
- **Service Functions**: 2-3 hours
- **UI Updates**: 3-4 hours
- **Testing & Migration**: 2 hours
- **Total**: ~8-10 hours

---

## Priority

**High** - This is a foundational change that affects:
- Blueprint management
- Pin organization
- Worker verification workflow
- Project structure

Should be done before implementing PHASE 1.13 (Worker Blueprint Screen) to avoid rework.

