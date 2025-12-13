# 🗑️ SitePulse 3.0 - Code Removal Checklist

Based on Chapters 1-3 requirements, this document lists all code/components that need to be **REMOVED** or **REPLACED** for SitePulse 3.0 (Electrical-Only System).

---

## ❌ **PHASE 1: REMOVE NON-ELECTRICAL TASK CATEGORIES**

### Files to Modify:
- [ ] **`src/screens/engineer/TasksScreen.tsx`** (Lines 62-178)
  - ❌ Remove all categories EXCEPT 'electrical':
    - Remove: `pre_construction` (8 subtasks)
    - Remove: `foundation` (9 subtasks including concrete_pouring)
    - Remove: `structural` (6 subtasks)
    - Remove: `masonry` (5 subtasks including chb_laying)
    - Remove: `roofing` (6 subtasks including roof_sheeting)
    - Remove: `carpentry` (6 subtasks)
    - Remove: `plumbing` (7 subtasks)
    - Remove: `finishing` (7 subtasks including tile_laying, painting)
  - ✅ Keep ONLY `electrical` category
  - ✅ Replace with 5 electrical tasks: Conduit, Box with Wires, Cable Pulling, Outlet/Switch, Light Fixture

- [ ] **`src/screens/engineer/TaskCreationModal.tsx`**
  - ❌ Remove all non-electrical category options
  - ❌ Remove category selection dropdown (only electrical)
  - ✅ Simplify to show only 5 electrical task types + Manual Task option

- [ ] **`assets/labels_improved.json`**
  - ❌ Remove all non-electrical task labels
  - ✅ Keep only 5 electrical task labels for CNN

- [ ] **`android/app/src/main/assets/labels_improved.json`**
  - ❌ Remove all non-electrical task labels
  - ✅ Keep only 5 electrical task labels

---

## ❌ **PHASE 2: REMOVE TRADITIONAL TASK MANAGEMENT UI**

### Files to Remove/Deprecate:
- [ ] **`src/screens/engineer/TasksScreen.tsx`**
  - ⚠️ **DEPRECATE**: This entire screen will be replaced by Blueprint Editor
  - ❌ Remove task list view
  - ❌ Remove task filtering/sorting
  - ✅ Replace with blueprint view (or remove completely if blueprint editor handles everything)

- [ ] **`src/screens/engineer/TaskCreationModal.tsx`**
  - ⚠️ **DEPRECATE**: Task creation will be via blueprint pin placement
  - ❌ Remove manual task creation form
  - ❌ Remove date pickers, worker assignment, notes fields
  - ✅ Keep ONLY as fallback for manual tasks (non-blueprint tasks if needed)

### Navigation Updates:
- [ ] **`src/navigation/EngineerNavigation.tsx`**
  - ❌ Remove "Tasks" tab from bottom navigation
  - ✅ Replace with "Blueprint" tab OR integrate into Project Tools

---

## ❌ **PHASE 3: REMOVE EQUIPMENT MANAGEMENT**

**Note**: Paper mentions **materials only** - no equipment tracking in scope.

### Files to Remove:
- [ ] **`src/screens/engineer/EquipmentManagementPage.tsx`**
  - ❌ **DELETE ENTIRE FILE** - Not in scope for electrical-only system

- [ ] **`src/services/firebaseDataService.js`**
  - ❌ Remove equipment-related functions:
    - `getEquipment()`
    - `addEquipment()`
    - `updateEquipment()`
    - `deleteEquipment()`

### Files to Modify:
- [ ] **`src/screens/engineer/ProjectToolsScreen.tsx`**
  - ❌ Remove "Manage Equipment" tool button
  - ❌ Remove equipment navigation

- [ ] **`src/navigation/EngineerNavigation.tsx`**
  - ❌ Remove EquipmentManagement navigation route

- [ ] **`src/context/ProjectDataContext.tsx`**
  - ❌ Remove equipment state management
  - ❌ Remove equipment loading/updating logic
  - ❌ Remove equipment calculations from budget

- [ ] **`src/screens/engineer/BudgetLogsManagementPage.tsx`**
  - ❌ Remove equipment budget category
  - ❌ Remove equipment spent calculations
  - ❌ Remove equipment rental cost tracking
  - ✅ Keep only Materials budget category

- [ ] **`src/screens/engineer/ResourcesScreen.tsx`**
  - ❌ Remove equipment tab/section
  - ❌ Remove equipment low-stock alerts
  - ❌ Remove equipment calculations

- [ ] **`src/services/usageService.ts`**
  - ❌ Remove equipment borrow/return functions
  - ❌ Remove equipment usage reporting
  - ✅ Keep only material usage tracking

- [ ] **`src/screens/worker/InventoryUseScreen.tsx`**
  - ❌ Remove equipment borrow/request functionality
  - ✅ Keep only material usage submission

---

## ❌ **PHASE 4: REMOVE GENERAL COST AGGREGATION**

**Note**: Paper specifies **penalty costs only** - remove general budget tracking.

### Files to Modify:
- [ ] **`src/screens/engineer/BudgetLogsManagementPage.tsx`**
  - ❌ Remove general budget categories
  - ❌ Remove budget allocation/spending tracking
  - ❌ Remove equipment/material cost aggregation
  - ✅ Keep ONLY penalty cost calculation module
  - ✅ Show penalty estimates based on delay prediction
  - ✅ Display: "Predicted delay: X days × Daily rate = ₱X,XXX penalty"

- [ ] **`src/context/ProjectDataContext.tsx`**
  - ❌ Remove budget recalculation logic
  - ❌ Remove equipment/material spent calculations
  - ✅ Keep only penalty cost state

- [ ] **`src/services/firebaseDataService.js`**
  - ❌ Remove `getBudget()` function (or simplify to penalty-only)
  - ❌ Remove `saveBudget()` function (or simplify)
  - ✅ Create new `calculatePenaltyCost()` function

- [ ] **`src/components/ChartCards.tsx`**
  - ❌ Remove BudgetChart component (or replace with PenaltyChart)
  - ✅ Create PenaltyCostChart showing penalty estimates

- [ ] **`src/screens/engineer/DashboardScreen.tsx`**
  - ❌ Remove general budget progress displays
  - ✅ Show only penalty cost estimates

- [ ] **`src/screens/engineer/ResourcesScreen.tsx`**
  - ❌ Remove budget tab
  - ❌ Remove budget breakdown displays
  - ✅ Show only penalty cost estimates

---

## ❌ **PHASE 5: REPLACE LINEAR REGRESSION WITH POLYNOMIAL**

### Files to Modify:
- [ ] **`functions/index.js`**
  - ❌ Remove `predictWithLinearRegression()` function (Line ~317)
  - ❌ Remove linear regression coefficients from `delay_model_weights.json`
  - ✅ Implement `predictWithPolynomialRegression()` (degree=2)
  - ✅ Update model weights to polynomial coefficients

- [ ] **`functions/delay_model_weights.json`**
  - ❌ Remove linear regression weights
  - ✅ Add polynomial regression coefficients (β₀, β₁, β₂)

---

## ❌ **PHASE 6: REPLACE PERCENTAGE-BASED CNN WITH BINARY**

### Files to Modify:
- [ ] **`src/services/cnnService.ts`**
  - ❌ Remove 15-class classification (5 tasks × 3 statuses)
  - ❌ Remove status prediction (not_started, in_progress, completed)
  - ❌ Remove `statusToProgress()` method (0%, 50%, 100%)
  - ❌ Remove `parseLabel()` method that extracts status
  - ✅ Implement 5 binary outputs (sigmoid, not softmax)
  - ✅ Return binary ✓/✗ verification (threshold ≥0.70)
  - ✅ Update `predictStatus()` to route by pin type

- [ ] **`assets/model_optimized.tflite`**
  - ❌ Replace with new binary classification model
  - ✅ New model: 5 binary outputs (conduit, box, cable, outlet, fixture)

- [ ] **`assets/labels_improved.json`**
  - ❌ Remove all status-based labels (e.g., "concrete_pouring_0%", "concrete_pouring_50%")
  - ✅ Keep only 5 task labels for binary classification

---

## ❌ **PHASE 7: REMOVE NON-ELECTRICAL MATERIAL CATEGORIES**

### Files to Modify:
- [ ] **`src/screens/engineer/MaterialsManagementPage.tsx`**
  - ❌ Remove non-electrical material categories
  - ✅ Keep only electrical categories:
    - Wires & Cables
    - Conduits & Raceways
    - Boxes & Enclosures
    - Devices (outlets, switches, breakers)
    - Fixtures (lights, fans, sensors)

- [ ] **`src/services/firebaseDataService.js`**
  - ✅ Update material categories to electrical-only

---

## ❌ **PHASE 8: REMOVE GENERAL CONSTRUCTION TERMINOLOGY**

### Files to Search and Replace:
- [ ] Search entire codebase for "construction" → Replace with "electrical"
- [ ] Search for "building" → Replace with "residential electrical"
- [ ] Update all UI labels, headers, descriptions

**Files to check:**
- All screen files in `src/screens/`
- Navigation files
- Service files
- Component files

---

## ❌ **PHASE 9: REMOVE MULTIPLE BLUEPRINT SUPPORT**

**Note**: Paper specifies **one blueprint per project**.

### Files to Modify (when implementing blueprint):
- [ ] **Blueprint Service** (to be created)
  - ❌ Remove blueprint list/collection support
  - ❌ Remove blueprint versioning (initially)
  - ✅ Store single blueprint per project (in project document)

---

## ✅ **WHAT TO KEEP**

### Core Systems to Retain:
- ✅ **Authentication** (Engineer/Worker roles)
- ✅ **Materials Management** (electrical categories only)
- ✅ **Photo Upload System** (for CNN verification)
- ✅ **Task Service** (modified for pin-based tasks)
- ✅ **Delay Prediction** (modified to polynomial regression)
- ✅ **Chat System** (project communication)
- ✅ **Notifications** (task updates, approvals)
- ✅ **Report Logs** (photo approvals, manual reviews)
- ✅ **Worker Assignment** (assign workers to projects)

---

## 📋 **SUMMARY OF REMOVALS**

| Category | What to Remove | Files Affected |
|----------|---------------|----------------|
| **Task Categories** | All non-electrical (8 categories) | TasksScreen.tsx, TaskCreationModal.tsx, labels files |
| **Task UI** | Traditional task list/creation | TasksScreen.tsx, TaskCreationModal.tsx |
| **Equipment** | Entire equipment management | EquipmentManagementPage.tsx, equipment services, budget calculations |
| **General Budget** | Cost aggregation, spending tracking | BudgetLogsManagementPage.tsx, ProjectDataContext.tsx |
| **Linear Regression** | Linear delay prediction | functions/index.js, delay_model_weights.json |
| **Percentage CNN** | 15-class status prediction | cnnService.ts, model file, labels |
| **Non-Electrical Materials** | Other material categories | MaterialsManagementPage.tsx |
| **Terminology** | "Construction" references | All files (search/replace) |

---

## 🚦 **REMOVAL PRIORITY**

**High Priority (Must Remove for MVP):**
1. Non-electrical task categories
2. Equipment management
3. General budget aggregation
4. Linear regression
5. Percentage-based CNN

**Medium Priority (Can defer):**
- Terminology updates
- Multiple blueprint support removal

**Low Priority (Nice to clean up):**
- Legacy code comments
- Unused imports
- Deprecated functions

---

*Last Updated: [Current Date]*
