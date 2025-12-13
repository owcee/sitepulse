# 📐 Blueprint-First Task Management Implementation Plan

## 🎯 Objective
Replace traditional task management with a **blueprint-based system** where tasks are created and managed through pins on an interactive blueprint.

## 📋 Project Creation Changes

### NEW: Create Project Flow
**OLD Flow:**
- Project name, description, location, client
- Budget input (₱)
- Timeline/duration input (months)

**NEW Flow:**
- Project name, description, location, client
- **Upload Excel File** (contains scope of work and Gantt chart)
- **Upload Electrical Plan** (blueprint image - JPG/PNG)

### Excel File Requirements
The Excel file must contain:
1. **Scope of Work Sheet**: Task list with descriptions, quantities, materials
2. **Gantt Chart Sheet**: Timeline data with task dependencies, start/end dates

### Electrical Plan Requirements
- Image file (JPG, PNG)
- This becomes the blueprint for the project
- Used for pin-based task management

---

## 📋 Core Requirements

### 5 Automated Electrical Tasks (CNN-Based)
1. **Conduit Installation** - Automated verification via CNN
2. **Electrical Box with Wires** - Automated verification via CNN
3. **Cable Pulling** - Automated verification via CNN
4. **Outlet/Switch Installation** - Automated verification via CNN
5. **Light Fixture Installation** - Automated verification via CNN

### Manual/Technical Tasks (Non-CNN)
6. **Manual Task** - Custom description, engineer manual review required

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│              Blueprint Editor (Engineer)                │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Blueprint Image (Pinch-to-zoom, Pan)          │   │
│  │  ┌───┐  ┌───┐  ┌───┐  ┌───┐  ┌───┐           │   │
│  │  │🔴│  │🔴│  │🟢│  │🔴│  │🟡│  (Pins)         │   │
│  │  └───┘  └───┘  └───┘  └───┘  └───┘           │   │
│  │  Red = Pending, Green = Verified, Yellow = Manual│ │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Tap Pin → Edit/Delete/View Task                       │
│  Tap Empty Space → Place New Pin                       │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│         Auto-Task Creation (Firestore)                  │
│  Pin Created → Task Created in tasks/{id}              │
│  Task Linked via blueprint_pin_id                      │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│       Worker Blueprint View (Verification)              │
│  Tap Pin → Two-Photo Verification                      │
│  (Close-up + Location Proof)                           │
│  CNN Eligible → Auto-verify (≥0.70)                    │
│  Manual → Engineer Review                              │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 PHASE 0: Project Creation Update (PRIORITY: HIGH)

### 0.1 Update CreateNewProjectScreen.tsx
**REMOVE:**
- Budget input field
- Duration/Timeline input field

**ADD:**
- Excel file upload button (for scope of work + Gantt chart)
- Electrical Plan upload button (blueprint image)
- File validation and preview

**Required Fields:**
- Project name *
- Description
- Location
- Client name
- Excel file * (Scope of Work + Gantt Chart)
- Electrical Plan * (Blueprint image)

### 0.2 Excel File Structure
The Excel file should contain:
1. **Scope of Work Sheet**:
   - Columns: Task Name, Description, Quantity, Unit, Materials Needed, Estimated Cost
   - Used for initial task/material planning

2. **Gantt Chart Sheet**:
   - Columns: Task Name, Start Date, End Date, Dependencies, Duration (days)
   - Used for timeline/delay prediction

### 0.3 File Storage
- Excel file → `projects/{projectId}/scope_of_work.xlsx` (Firebase Storage)
- Electrical Plan → `blueprints/{projectId}/electrical_plan.jpg` (Firebase Storage)
- Store file URLs in project document

### 0.4 Update Project Schema
```typescript
export interface Project {
  // Existing fields...
  
  // NEW FIELDS:
  excelFileUrl?: string; // Scope of work + Gantt chart
  blueprintImageUrl?: string; // Electrical plan
  blueprintId?: string; // Reference to blueprint document
  parsedScopeOfWork?: any; // Extracted from Excel (optional, can parse on-demand)
  parsedGanttChart?: any; // Extracted from Excel (optional)
}
```

### 0.5 Excel Parsing Service
Create `src/services/excelParserService.ts`:
- Upload Excel to Firebase Storage
- Parse Excel file (using xlsx library or backend function)
- Extract scope of work data
- Extract Gantt chart data
- Store parsed data in project document or separate collection

---

## 📝 Implementation Plan

### **PHASE 0: Project Creation Update** (Priority: CRITICAL - Do First!)

See `CREATE_PROJECT_UPDATE_PLAN.md` for detailed implementation.

**Summary:**
- Remove budget & timeline inputs
- Add Excel file upload (Scope of Work + Gantt Chart)
- Add Electrical Plan upload (becomes blueprint)
- Update projectService.ts to handle file uploads
- Store file URLs in project document

**Files to Modify:**
1. `src/screens/engineer/CreateNewProjectScreen.tsx` - UI changes
2. `src/services/projectService.ts` - Data model updates
3. Create file upload handlers using existing `uploadWithProgress()`

**Estimated Time:** 2-3 days

---

## 📝 Implementation Plan

### **PHASE 1: Data Models & Services** (Priority: HIGH)

#### 1.1 Create Blueprint Service (`src/services/blueprintService.ts`)
```typescript
// Blueprint Data Models
export interface Blueprint {
  id: string;
  projectId: string;
  imageUrl: string;
  uploadedAt: Date;
  uploadedBy: string;
}

export interface BlueprintPin {
  id: string;
  blueprintId: string;
  projectId: string;
  taskId?: string; // Auto-linked when task created
  pinType: 'conduit' | 'box' | 'cable' | 'outlet' | 'fixture' | 'manual';
  location: {
    x_percent: number; // 0-100
    y_percent: number; // 0-100
  };
  status: 'pending' | 'verified' | 'rejected';
  description?: string; // For manual tasks
  verifiedAt?: Date;
  verifiedBy?: string;
  createdAt: Date;
  createdBy: string;
}

// Service Functions
- uploadBlueprint(projectId, imageUri): Promise<Blueprint>
- getBlueprint(projectId): Promise<Blueprint | null>
- deleteBlueprint(projectId): Promise<void>
- createPin(projectId, pinData): Promise<BlueprintPin> // Auto-creates task
- updatePin(pinId, updates): Promise<void>
- deletePin(pinId): Promise<void> // Also deletes linked task
- getPins(projectId): Promise<BlueprintPin[]>
- getPinByTaskId(taskId): Promise<BlueprintPin | null>
```

#### 1.2 Update Task Schema (`src/services/taskService.ts`)
```typescript
export interface Task {
  // Existing fields...
  
  // NEW FIELDS for Blueprint System:
  blueprint_pin_id?: string; // REQUIRED for blueprint-based tasks
  verified_count: number; // Starts at 0
  total_required: number; // Default: 1 for pin-based tasks
  component_type: 'conduit' | 'box' | 'cable' | 'outlet' | 'fixture' | 'manual';
  isManual: boolean; // true for manual tasks
  cnnEligible: boolean; // false for manual tasks
}
```

#### 1.3 Firestore Collections Structure
```
projects/{projectId}/
  ├── blueprintId: string (reference to blueprint document)
  
blueprints/{blueprintId}/
  ├── projectId: string
  ├── imageUrl: string (Firebase Storage URL)
  ├── uploadedAt: timestamp
  ├── uploadedBy: string (userId)
  
blueprint_pins/{pinId}/
  ├── blueprintId: string
  ├── projectId: string
  ├── taskId: string (auto-linked)
  ├── pinType: string
  ├── location: { x_percent: number, y_percent: number }
  ├── status: string
  ├── description: string (optional, for manual)
  ├── createdAt: timestamp
  ├── createdBy: string
  
tasks/{taskId}/
  ├── blueprint_pin_id: string (link to pin)
  ├── component_type: string
  ├── verified_count: number
  ├── total_required: number
  ├── isManual: boolean
  ├── cnnEligible: boolean
  └── ... (existing task fields)
```

---

### **PHASE 2: Blueprint Editor Screen** (Priority: HIGH)

#### 2.1 Create `src/screens/engineer/BlueprintEditorScreen.tsx`

**Key Features:**
- **Upload Blueprint Button**: Upload JPG/PNG image, replace if exists
- **Interactive Blueprint Viewer**:
  - Pinch-to-zoom (react-native-gesture-handler)
  - Pan/drag to move around
  - Tap empty space → Open pin placement modal
  - Tap existing pin → Open pin edit modal
- **Pin Display**:
  - Red pins = Pending verification
  - Green pins = Verified
  - Yellow pins = Manual tasks
  - Pin icons vary by type (conduit, box, cable, outlet, fixture, manual)
- **Pin Placement Modal**:
  - Select pin type (6 options: 5 CNN + 1 Manual)
  - For manual: Enter description text
  - Confirm → Pin created → Task auto-created
- **Pin Edit Modal**:
  - Change pin type
  - Edit description (manual only)
  - Delete pin (with confirmation, deletes linked task)
- **Real-time Updates**: Listen to pin status changes

**UI Components Needed:**
- Image viewer with gestures (use `react-native-image-pan-zoom` or custom with `react-native-gesture-handler`)
- Pin overlay system (absolute positioned markers)
- Modal for pin type selection
- Pin edit/delete dialogs

---

### **PHASE 3: Navigation & Integration** (Priority: HIGH)

#### 3.1 Update ProjectToolsScreen.tsx
```typescript
// Change Task Management tool:
{
  id: 'task-management',
  title: 'Blueprint Editor', // Changed from 'Task Management'
  icon: 'map-outline', // Changed icon
  color: constructionColors.inProgress,
  description: 'Edit blueprint and manage tasks', // Updated description
  onPress: () => navigation.navigate('BlueprintEditor'), // Navigate to blueprint editor
}
```

#### 3.2 Update EngineerNavigation.tsx
```typescript
// Add Blueprint Editor to ProjectToolsStack:
<Stack.Screen name="BlueprintEditor" component={BlueprintEditorScreen} />

// Keep Tasks screen for now (can view tasks but not primary management)
// Optionally: Remove Tasks tab or make it secondary
```

#### 3.3 Update TasksScreen.tsx (Optional - Keep for Viewing)
- Keep existing screen for viewing task details
- Add filter: "Show only blueprint tasks" / "Show manual tasks"
- Note: Tasks created from pins should show blueprint pin reference

---

### **PHASE 4: Worker Blueprint View** (Priority: MEDIUM)

#### 4.1 Create `src/screens/worker/BlueprintViewScreen.tsx`

**Key Features:**
- Display blueprint with pins
- Pin colors: Red (pending), Green (verified), Yellow (manual)
- Tap pin → Open verification camera
- Two-photo requirement:
  1. Close-up photo (for CNN verification)
  2. Location proof photo (showing context)
- CNN-eligible pins → Auto-verify if confidence ≥0.70
- Manual pins → Submit for engineer review

**Verification Flow:**
```
Worker taps pin
  ↓
Camera opens (pre-filled with task type)
  ↓
Take Photo 1: Close-up
  ↓
Take Photo 2: Location proof
  ↓
If CNN-eligible:
  → CNN processes (5 binary outputs)
  → If ≥0.70 → Auto-approve → Pin turns green
  → If <0.70 → Flag for engineer review
If Manual:
  → Submit for engineer review in Report Logs
```

---

### **PHASE 5: Auto-Task Creation Logic** (Priority: HIGH)

#### 5.1 Task Creation on Pin Placement
When engineer places pin in BlueprintEditorScreen:

```typescript
// In blueprintService.ts - createPin()
async function createPin(projectId, pinData) {
  // 1. Create pin document
  const pinDoc = await addDoc(blueprintPinsRef, pinData);
  
  // 2. Auto-create linked task
  const taskData = {
    projectId,
    blueprint_pin_id: pinDoc.id,
    title: getTaskTitleFromPinType(pinData.pinType), // e.g., "Conduit Installation"
    component_type: pinData.pinType,
    verified_count: 0,
    total_required: 1,
    isManual: pinData.pinType === 'manual',
    cnnEligible: pinData.pinType !== 'manual',
    status: 'not_started',
    // ... other task fields
  };
  
  const taskDoc = await addDoc(tasksRef, taskData);
  
  // 3. Link task to pin
  await updateDoc(pinDoc, { taskId: taskDoc.id });
  
  return { pin: pinDoc, task: taskDoc };
}
```

**Task Title Mapping:**
- `conduit` → "Conduit Installation"
- `box` → "Electrical Box with Wires"
- `cable` → "Cable Pulling"
- `outlet` → "Outlet/Switch Installation"
- `fixture` → "Light Fixture Installation"
- `manual` → Use description field as title

---

### **PHASE 6: Progress Calculation** (Priority: MEDIUM)

#### 6.1 Pin-Based Progress
Replace CNN percentage guessing with count-based progress:

```typescript
// Calculate project progress:
const totalPins = pins.length;
const verifiedPins = pins.filter(p => p.status === 'verified').length;
const progressPercent = (verifiedPins / totalPins) * 100;

// Update in dashboard/reports
```

---

### **PHASE 7: Budget Overview Carousel Integration** (Priority: MEDIUM)

#### 7.1 Update ProjectToolsScreen Budget Carousel
Add blueprint visualization card to carousel:
- Show blueprint image
- Overlay pins with color coding
- Show progress: "X/Y pins verified"
- Click to open blueprint editor

---

## 🔧 Technical Implementation Details

### Pin Positioning System
- Store positions as percentages (0-100) for device independence
- Calculate actual pixel positions based on image dimensions
- Handle image scaling/zooming correctly

### Image Handling
- Upload to Firebase Storage: `blueprints/{projectId}/blueprint.jpg`
- Support JPG and PNG formats
- Compress images before upload (max 5MB recommended)
- Use React Native ImagePicker or Expo ImagePicker

### Pin Icons
- Use Ionicons or custom SVG icons
- Different icons for each pin type:
  - Conduit: `flash-outline` or custom
  - Box: `cube-outline` or custom
  - Cable: `git-merge-outline` or custom
  - Outlet: `power-outline` or custom
  - Fixture: `bulb-outline` or custom
  - Manual: `construct-outline` or custom

### State Management
- Use React Context or Redux for blueprint/pin state
- Real-time subscriptions to Firestore for pin updates
- Optimistic UI updates

---

## 📊 Migration Strategy

### Existing Tasks
- Keep existing tasks as-is (don't break current functionality)
- Add option to "Convert to blueprint task" (manual migration)
- Or: Mark old tasks as "legacy" and only show blueprint tasks in new view

### Data Migration Script
```typescript
// Optional: Migrate existing tasks to blueprint system
// Run once to create pins for existing tasks
```

---

## ✅ Testing Checklist

- [ ] Upload blueprint image
- [ ] Place pin on blueprint
- [ ] Verify task auto-created
- [ ] Edit pin (change type, description)
- [ ] Delete pin (verify task deleted)
- [ ] Worker view blueprint
- [ ] Worker tap pin and verify (CNN)
- [ ] Worker submit manual task verification
- [ ] Engineer review manual tasks
- [ ] Progress calculation updates correctly
- [ ] Real-time pin status updates
- [ ] Blueprint replacement works
- [ ] Pin positioning works on different screen sizes

---

## 🎨 UI/UX Considerations

1. **Blueprints should be high resolution** - Allow zoom to see details
2. **Pin placement should be precise** - Use zoom before placing pin
3. **Visual feedback** - Show pin preview while dragging
4. **Loading states** - Show loading while uploading blueprint
5. **Error handling** - Handle image upload failures gracefully
6. **Offline support** - Cache blueprint image for offline viewing

---

## 📅 Estimated Timeline

- **Phase 1**: Data Models & Services - 2-3 days
- **Phase 2**: Blueprint Editor Screen - 3-4 days
- **Phase 3**: Navigation & Integration - 1 day
- **Phase 4**: Worker Blueprint View - 2-3 days
- **Phase 5**: Auto-Task Creation - 1-2 days
- **Phase 6**: Progress Calculation - 1 day
- **Phase 7**: Budget Carousel Integration - 1 day

**Total: ~11-15 days** (assuming full-time development)

---

## 🚀 Next Steps

1. **Review this plan** with stakeholders
2. **Set up Firestore collections** (blueprints, blueprint_pins)
3. **Create blueprintService.ts** with all CRUD functions
4. **Build BlueprintEditorScreen.tsx** MVP (upload + pin placement)
5. **Implement auto-task creation** logic
6. **Test end-to-end flow** (pin → task → verification)
7. **Add worker blueprint view**
8. **Integrate with existing systems** (dashboard, reports)

---

**Ready for Review and Approval!** ✨

