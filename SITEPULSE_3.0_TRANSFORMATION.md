# 🚀 SitePulse 3.0: Electrical Construction Management System

## 📋 Project Overview

**SitePulse 3.0** is a complete transformation from general construction monitoring to a **specialized residential electrical construction management system** with blueprint integration.

### Core Concept
- **Blueprint-First Architecture**: Blueprint is the primary task management interface
- **One Blueprint Per Project**: Single blueprint stored in project document
- **Pin-Based Tasks**: Tasks are automatically created from blueprint pins
- **CNN Verification**: 5 binary electrical task verifications
- **Count-Based Progress**: Progress calculated from verified pins

---

## 🎯 Transformation Goals

### FROM (Old SitePulse):
- General construction tasks (concrete, tiling, painting, CHB, roofing)
- Traditional task list management
- CNN percentage guessing (0%, 50%, 100%)
- Linear regression delay prediction
- General cost aggregation

### TO (SitePulse 3.0):
- **5 Electrical Tasks Only**: Conduit, Box with Wires, Cable Pulling, Outlet/Switch, Light Fixture
- **Blueprint-Based Task Management**: No traditional task list - pins on blueprint = tasks
- **5 Binary CNN Outputs**: ✓/✗ verification (threshold ≥0.70)
- **Polynomial Regression**: Delay prediction using actual vs planned progress
- **Penalty Costs Only**: Delay days × Daily penalty rate

---

## 📝 TODO LIST - Implementation Plan

### **PHASE 1: Foundation & Blueprint System** (15 tasks)

#### UI/UX Updates
- [ ] **PHASE 1.1**: Update all labels from 'Construction' to 'Electrical' throughout app
  - Navigation headers, buttons, tooltips
  - Screen titles and descriptions
  - Error messages and notifications

#### Navigation Restructure
- [ ] **PHASE 1.2**: Remove 'Tasks' tab from EngineerNavigation.tsx
  - Blueprint replaces traditional task management
  - Update navigation structure

- [ ] **PHASE 1.3**: Update 'Task Management' in ProjectToolsScreen.tsx
  - Change to open blueprint editor (not Tasks screen)
  - Update tool description and icon

#### Data Model
- [ ] **PHASE 1.4**: Implement one blueprint per project model
  - Store `blueprintId` in `projects/{id}` document
  - Blueprint image stored in Firebase Storage
  - Replace existing blueprint if new one uploaded

- [ ] **PHASE 1.5**: Create blueprint_pins collection in Firestore
  - Schema: `blueprintId`, `projectId`, `taskId` (auto-linked), `pinType`, `location: {x_percent, y_percent}`, `status`, `description` (for manual tasks)
  - Indexes for queries by projectId, blueprintId

#### Blueprint Service
- [ ] **PHASE 1.6**: Create blueprintService.ts
  - `uploadBlueprint(projectId, imageUri)` - Upload/replace blueprint
  - `getBlueprint(projectId)` - Get blueprint data
  - `deleteBlueprint(projectId)` - Delete blueprint
  - `createPin(projectId, pinData)` - Create pin (auto-creates task)
  - `updatePin(pinId, updates)` - Update pin
  - `deletePin(pinId)` - Delete pin and linked task
  - `getPins(projectId)` - Get all pins for project

#### Pin Types & Task Creation
- [ ] **PHASE 1.7**: Define 6 pin types
  1. **Conduit Installation** (CNN-eligible)
  2. **Box with Wires** (CNN-eligible)
  3. **Cable Pulling** (CNN-eligible)
  4. **Outlet/Switch Installation** (CNN-eligible)
  5. **Light Fixture Installation** (CNN-eligible)
  6. **Manual Task** (No CNN - custom description)

- [ ] **PHASE 1.8**: Auto-task creation on pin placement
  - When engineer places pin → Automatically create task in `tasks` collection
  - Link task to pin via `blueprint_pin_id`
  - Task gets `cnnEligible: true/false` based on pin type
  - Task gets `verified_count: 0`, `total_required: 1`

#### Blueprint Editor Screen
- [ ] **PHASE 1.9**: Create BlueprintEditorScreen.tsx
  - Upload/replace blueprint image (JPG/PNG support)
  - Interactive blueprint viewer with pinch-to-zoom and pan
  - Tap to place pin → Select pin type from modal
  - Edit pin (change type, description)
  - Delete pin (confirmation dialog)
  - Display all pins with color coding (red=pending, green=verified)
  - Real-time pin status updates

#### Task Schema Updates
- [ ] **PHASE 1.10**: Update Task interface in taskService.ts
  - Add `verified_count: number` (starts at 0)
  - Add `total_required: number` (always 1 for pin-based tasks)
  - Add `component_type: string` (from pin type)
  - Add `blueprint_pin_id: string` (REQUIRED - links to pin)
  - Add `isManual: boolean` (true for manual pin types)

#### Progress Calculation
- [ ] **PHASE 1.11**: Implement count-based progress calculation
  - Formula: `(green_verified_pins ÷ total_pins) × 100`
  - Update real-time as pins verify
  - Update dashboard and all progress displays

#### Budget Overview Carousel
- [ ] **PHASE 1.12**: Update Budget Overview carousel in ProjectToolsScreen.tsx
  - Add blueprint visualization card to carousel
  - Show blueprint with color-coded pins overlay
  - Display progress percentage from pins
  - Click to open blueprint editor

#### Worker Blueprint Access
- [ ] **PHASE 1.13**: Add Blueprint tab to WorkerNavigation.tsx
  - Add as primary tab (or rename existing Tasks tab)
  - Show blueprint with pins
  - Color coding: red=pending, blue=in_progress, green=verified
  - Tap red/blue pin to verify

#### Two-Photo Verification
- [ ] **PHASE 1.14**: Implement two-photo verification workflow
  - Worker taps pin → Camera opens
  - Pre-fill task type based on pin type
  - Capture two photos:
    1. Close-up photo (for CNN verification)
    2. Location proof photo (shows blueprint marker/location)
  - Upload both photos with metadata

#### CNN Routing Logic
- [ ] **PHASE 1.15**: Implement CNN routing based on pin type
  - If pin type is CNN-eligible (5 electrical types) → Route to CNN binary classifier
  - If pin type is Manual → Flag for manual engineer review (no CNN)
  - Store routing decision in task metadata

---

### **PHASE 2: CNN Integration** (3 tasks)

#### CNN Service Updates
- [ ] **PHASE 2.1**: Modify cnnService.ts for 5 binary outputs
  - Change from 15-class classification (5 tasks × 3 statuses) to 5 binary outputs
  - Use sigmoid activation (not softmax)
  - Output format: `[conduit_prob, box_prob, cable_prob, outlet_prob, fixture_prob]`
  - Threshold: ≥0.70 = Verified ✓, <0.70 = Not Verified ✗

- [ ] **PHASE 2.2**: Update CNN prediction logic
  - Modify `predictStatus()` method
  - Return binary ✓/✗ verification based on pin type
  - Remove percentage status guessing (0%/50%/100%)
  - Route photo to correct binary classifier based on pin type

#### Photo Approval Flow
- [ ] **PHASE 2.3**: Implement photo approval workflow
  - **CNN-eligible pins**: 
    - Run CNN binary classifier
    - If confidence ≥0.70 → Auto-approve → Pin turns green → Task marked complete
    - If confidence <0.70 → Flag for engineer review
  - **Manual pins**:
    - Skip CNN verification
    - Flag for engineer manual review in Report Logs
    - Engineer approves/rejects → Pin turns green/stays red

---

### **PHASE 3: Delay, Penalty & Materials** (4 tasks)

#### Delay Prediction
- [ ] **PHASE 3.1**: Implement polynomial regression delay prediction
  - Replace linear regression in `functions/index.js`
  - Use polynomial regression (degree=2)
  - Inputs: Actual progress % (from verified pins) vs Planned progress % (from Gantt schedule)
  - Outputs: Predicted delay days, risk level (Green/Yellow/Red), confidence %

#### Penalty Cost System
- [ ] **PHASE 3.2**: Implement penalty cost calculation
  - Formula: `max(0, (Predicted Delay - Grace Period)) × Daily Rate`
  - Respect maximum penalty cap
  - Add fields to Project schema: `penalty_rate`, `grace_period`, `max_penalty`
  - Update project creation form to include penalty settings
  - Display penalty estimates in delay prediction dashboard

#### Material Specialization
- [ ] **PHASE 3.3**: Specialize materials for electrical work
  - Update MaterialsManagementPage.tsx
  - Electrical categories:
    - Wires & Cables (Romex, THHN, grounding wires)
    - Conduits & Raceways (PVC, EMT, flexible conduit)
    - Boxes & Enclosures (outlet boxes, switch boxes, panels)
    - Devices (outlets, switches, breakers, connectors)
    - Fixtures (lights, fans, sensors)
  - Auto-deduct materials when pins are verified
  - Low-stock alerts when below threshold

#### Project Schema
- [ ] **PHASE 3.4**: Add blueprintId to Project schema
  - Update `projectService.ts` Project interface
  - Add `blueprintId: string | null` field
  - Update project creation and update functions

---

### **PHASE 4: Testing & Polish** (1 task)

- [ ] **PHASE 4.1**: End-to-end testing and polish
  - Test complete workflow: Project Tools → Task Management → Upload blueprint → Place pins → Worker verification → Progress updates → Dashboard carousel
  - Test CNN verification for all 5 electrical types
  - Test manual task workflow
  - Test delay prediction with pin-based progress
  - Test penalty cost calculations
  - UI/UX refinement and consistency checks
  - Bug fixes and performance optimization

---

## 📊 Architecture Summary

### Engineer Flow
```
Project Tools → Task Management → Blueprint Editor
  ↓
Upload/Replace Blueprint → Place Pins → Tasks Auto-Created
  ↓
Budget Overview Carousel → Shows Blueprint with Pins
```

### Worker Flow
```
Blueprint Tab → View Blueprint → See Red/Blue/Green Pins
  ↓
Tap Red Pin → Camera Opens → Two Photos → CNN Verifies
  ↓
Pin Turns Green → Progress Updates → Task Complete
```

### Data Model
- **One Blueprint Per Project**: Stored in `projects/{id}.blueprintId`
- **Pins**: `blueprint_pins/{id}` collection
- **Tasks**: `tasks/{id}` collection (auto-created from pins)
- **Progress**: Calculated from pin status (green_pins / total_pins)

---

## 🔑 Key Design Decisions

1. **Blueprint-First**: Blueprint is the primary interface, not secondary feature
2. **Pin = Task**: Each pin automatically creates a task (no separate task creation UI needed for blueprint tasks)
3. **One Blueprint**: Single blueprint per project (can be replaced/updated)
4. **Binary CNN**: 5 binary outputs with 0.70 threshold (not percentage guessing)
5. **Count-Based Progress**: Simple formula from verified counts (not CNN percentages)
6. **Manual Tasks Supported**: Non-CNN tasks via manual pin type with engineer review

---

## 📈 Progress Tracking

### Phase 1: Foundation & Blueprint System
- [ ] 0/15 tasks completed

### Phase 2: CNN Integration
- [ ] 0/3 tasks completed

### Phase 3: Delay, Penalty & Materials
- [ ] 0/4 tasks completed

### Phase 4: Testing & Polish
- [ ] 0/1 tasks completed

**Total Progress: 0/23 tasks completed**

---

## 🚦 Current Status

**Status**: Planning Phase  
**Version**: 3.0.0 (Electrical Transformation)  
**Target Completion**: 5 days (MVP)

---

*Last Updated: [Current Date]*
