const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '../assets');
const MODEL_PATH = path.join(ASSETS_DIR, 'model_optimized.tflite');
const LABELS_PATH = path.join(ASSETS_DIR, 'labels_improved.json');

console.log('🔍 Verifying CNN Model Artifacts for Mobile App...\n');

let hasError = false;

// 1. Verify TFLite Model File
if (fs.existsSync(MODEL_PATH)) {
  const stats = fs.statSync(MODEL_PATH);
  const sizeMB = stats.size / (1024 * 1024);
  console.log(`✅ Model found: ${path.basename(MODEL_PATH)}`);
  console.log(`   - Path: ${MODEL_PATH}`);
  console.log(`   - Size: ${sizeMB.toFixed(2)} MB`);

  if (sizeMB < 1) {
    console.warn('   ⚠️ Warning: Model size is surprisingly small (<1MB). Check if export was correct.');
  } else {
    console.log('   - Size check passed (likely valid model).');
  }
} else {
  console.error(`❌ CRITICAL: Model file missing at ${MODEL_PATH}`);
  hasError = true;
}

console.log('');

// 2. Verify Labels JSON
if (fs.existsSync(LABELS_PATH)) {
  try {
    const labelsContent = fs.readFileSync(LABELS_PATH, 'utf8');
    let labels = JSON.parse(labelsContent);
    
    // Handle Object vs Array format
    if (!Array.isArray(labels)) {
      console.log('   ℹ️ Labels file is in Object format (Index -> Label). Converting to values for check.');
      labels = Object.values(labels);
    }

    console.log(`✅ Labels found: ${path.basename(LABELS_PATH)}`);
    console.log(`   - Count: ${labels.length} classes`);
    
    // Check for expected task categories
    const expectedTasks = ['concrete_pouring', 'chb_laying', 'roofing', 'tile_laying', 'painting'];
    const missingTasks = [];

    expectedTasks.forEach(task => {
      // We look for partial matches since labels are like "concrete_pouring_in_progress"
      const found = labels.some(label => label.toLowerCase().includes(task === 'roof_sheeting' ? 'roofing' : task));
      if (!found) missingTasks.push(task);
    });

    if (missingTasks.length > 0) {
      console.warn(`   ⚠️ Warning: These task categories might be missing in labels: ${missingTasks.join(', ')}`);
    } else {
      console.log('   - All core task categories detected in label set.');
    }

    // Check for status states
    const states = ['not_started', 'in_progress', 'completed'];
    const hasAllStates = states.every(state => labels.some(l => l.includes(state)));
    
    if (hasAllStates) {
      console.log('   - Status states (not_started, in_progress, completed) detected.');
    } else {
      console.warn('   ⚠️ Warning: Some status states might be missing from labels.');
    }

  } catch (e) {
    console.error(`❌ Error parsing labels JSON: ${e.message}`);
    hasError = true;
  }
} else {
  console.error(`❌ CRITICAL: Labels file missing at ${LABELS_PATH}`);
  hasError = true;
}

console.log('\n---------------------------------------------------');
if (hasError) {
  console.error('❌ Verification FAILED. App will likely crash or malfunction.');
  process.exit(1);
} else {
  console.log('✨ Verification SUCCESS. Assets are present and look valid.');
  console.log('   You can proceed with building the app.');
}
