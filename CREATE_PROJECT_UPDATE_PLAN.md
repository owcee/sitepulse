# 📋 Create Project Update Plan - Excel & Blueprint Upload

## 🎯 Objective
Update CreateNewProjectScreen to replace budget/timeline inputs with:
1. **Excel file upload** (Scope of Work + Gantt Chart)
2. **Electrical Plan upload** (Blueprint image)

---

## 📝 Changes Required

### 1. Update CreateNewProjectScreen.tsx

#### REMOVE:
- Budget input field (`budget` state)
- Duration/Timeline input field (`duration` state)
- Budget & Timeline Card section
- Budget/duration validation

#### ADD:
- Excel file upload button
- Electrical Plan (blueprint) image upload button
- File preview/display
- File validation (Excel format, image format)

#### New State Variables:
```typescript
const [excelFile, setExcelFile] = useState<{uri: string, name: string} | null>(null);
const [blueprintImage, setBlueprintImage] = useState<{uri: string, name: string} | null>(null);
const [uploadingExcel, setUploadingExcel] = useState(false);
const [uploadingBlueprint, setUploadingBlueprint] = useState(false);
```

#### Updated Field Errors:
```typescript
const [fieldErrors, setFieldErrors] = useState({
  projectName: false,
  excelFile: false,      // NEW
  blueprintImage: false  // NEW
});
```

---

### 2. File Upload Implementation

#### Excel File Upload:
- Use `expo-document-picker` or `react-native-document-picker`
- Accept `.xlsx` and `.xls` files
- Show file name and size
- Upload to: `projects/{projectId}/scope_of_work.xlsx`

#### Electrical Plan Upload:
- Use `expo-image-picker` (already in use for photos)
- Accept JPG/PNG images
- Show image preview
- Upload to: `blueprints/{projectId}/electrical_plan.jpg`

#### Upload Helper:
- Use existing `uploadFileToStorage()` or `uploadWithProgress()` from storage helpers
- Show upload progress
- Handle errors gracefully

---

### 3. Update projectService.ts

#### Update createProject Function:
```typescript
export async function createProject(projectData: {
  name: string;
  description: string;
  location: string;
  clientName: string;
  excelFileUrl: string;        // NEW
  blueprintImageUrl: string;   // NEW
}): Promise<Project>
```

#### Updated Project Interface:
```typescript
export interface Project {
  // Existing fields...
  excelFileUrl?: string;       // NEW
  blueprintImageUrl?: string;  // NEW
  blueprintId?: string;        // NEW (reference to blueprint doc)
  // Remove: budget, duration (or make optional for backward compatibility)
}
```

#### Project Creation Flow:
1. Upload Excel file to Storage → Get URL
2. Upload blueprint image to Storage → Get URL
3. Create blueprint document in `blueprints` collection
4. Create project document with file URLs
5. Link blueprint document to project

---

### 4. Excel File Structure

The Excel file should contain:

#### Sheet 1: Scope of Work
| Task Name | Description | Quantity | Unit | Materials Needed | Estimated Cost |
|-----------|-------------|----------|------|------------------|----------------|
| Conduit Installation - Room 1 | ... | 50 | meters | PVC Conduit, Fittings | 5000 |
| ... | ... | ... | ... | ... | ... |

#### Sheet 2: Gantt Chart
| Task Name | Start Date | End Date | Duration (days) | Dependencies |
|-----------|------------|----------|-----------------|--------------|
| Conduit Installation - Room 1 | 2024-01-01 | 2024-01-05 | 5 | - |
| Box Installation - Room 1 | 2024-01-06 | 2024-01-08 | 3 | Conduit Installation - Room 1 |
| ... | ... | ... | ... | ... |

---

### 5. Excel Parsing (Future Enhancement)

Create `src/services/excelParserService.ts`:
```typescript
// Parse Excel file and extract:
// - Scope of work tasks
// - Gantt chart timeline data
// Store parsed data in project document or separate collection

import * as XLSX from 'xlsx'; // Need to install: npm install xlsx

export async function parseExcelFile(excelFileUrl: string) {
  // Download Excel from Storage
  // Parse using XLSX library
  // Extract scope of work
  // Extract Gantt chart data
  // Return structured data
}
```

**Note:** Excel parsing can be implemented later. For now, just upload and store the file URL.

---

### 6. UI/UX Changes

#### CreateNewProjectScreen Layout:
```
┌─────────────────────────────────────┐
│  Project Information                │
│  - Name *                           │
│  - Description                      │
│  - Location                         │
│  - Client Name                      │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  Excel File (Scope of Work) *       │
│  [Upload Excel File] 📄             │
│  scope_of_work.xlsx (2.5 MB) ✓     │
│  ℹ️ Must contain: Scope of Work &   │
│     Gantt Chart sheets              │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  Electrical Plan (Blueprint) *      │
│  [Upload Electrical Plan] 🗺️        │
│  electrical_plan.jpg ✓              │
│  [Image Preview]                    │
│  ℹ️ JPG or PNG format               │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  [Create Project]                   │
└─────────────────────────────────────┘
```

#### File Upload Buttons:
- Show file picker on press
- Display selected file name/size
- Show upload progress bar
- Allow file removal/change before submission

---

### 7. Validation Rules

#### Excel File:
- ✅ Must be `.xlsx` or `.xls` format
- ✅ Maximum size: 10MB
- ✅ Must be selected before project creation

#### Electrical Plan:
- ✅ Must be JPG or PNG format
- ✅ Maximum size: 10MB
- ✅ Must be selected before project creation
- ✅ Show image preview after selection

---

### 8. Error Handling

- File too large → Show error message
- Invalid file format → Show error message
- Upload failure → Retry option
- Network error → Show retry button

---

### 9. Dependencies Needed

```bash
# For Excel file picker
npm install expo-document-picker

# For Excel parsing (optional, future)
npm install xlsx
```

---

### 10. Migration Strategy

#### Existing Projects:
- Keep `budget` and `duration` fields optional
- Projects without Excel/blueprint can still function
- Show warning if blueprint missing when trying to use blueprint editor

#### Backward Compatibility:
- If project has `budget` → Use for budget management
- If project has `blueprintImageUrl` → Use for blueprint editor
- If both missing → Prompt to upload

---

## ✅ Implementation Checklist

- [ ] Update CreateNewProjectScreen UI (remove budget/duration)
- [ ] Add Excel file upload button
- [ ] Add Electrical Plan image upload button
- [ ] Implement file selection (DocumentPicker, ImagePicker)
- [ ] Implement file upload to Firebase Storage
- [ ] Update projectService.ts createProject function
- [ ] Update Project interface
- [ ] Update validation logic
- [ ] Test file upload flow
- [ ] Test project creation with files
- [ ] Handle errors gracefully
- [ ] Update UI/UX for better file management

---

## 🚀 Next Steps

1. **Phase 1**: Update CreateNewProjectScreen UI
2. **Phase 2**: Implement file uploads
3. **Phase 3**: Update projectService and data models
4. **Phase 4**: Test and refine
5. **Phase 5**: (Future) Excel parsing for scope of work extraction

---

**Ready for Implementation!** ✨

