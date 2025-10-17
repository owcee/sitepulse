export interface User {
  uid: string;
  name: string;
  email: string;
  role: 'engineer' | 'worker';
  projectId: string | null;
  profileImage?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  startDate: string;
  estimatedEndDate: string;
  status: 'active' | 'completed' | 'paused';
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  projectId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  dueDate: string;
  lastPhoto?: TaskPhoto;
  createdAt: string;
  updatedAt: string;
}

export interface TaskPhoto {
  id: string;
  taskId: string;
  imageUri: string;
  cnnClassification?: string;
  confidence?: number;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  notes?: string;
  uploadedBy: string;
  uploadedAt: string;
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface ChatMessage {
  id: string;
  projectId: string;
  senderId: string;
  senderName: string;
  senderRole: 'engineer' | 'worker';
  content: string;
  type: 'text';
  timestamp: string;
}

export interface ResourceBudget {
  id: string;
  projectId: string;
  totalBudget: number;
  spentAmount: number;
  categories: BudgetCategory[];
}

export interface BudgetCategory {
  name: string;
  allocated: number;
  spent: number;
}

export interface Worker {
  id: string;
  name: string;
  role: string;
  contactInfo: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  currentStock: number;
  minStock: number;
  unit: string;
  lastUpdated: string;
  cost: number;
}

export interface DelayPrediction {
  taskId: string;
  taskTitle: string;
  originalDueDate: string;
  estimatedCompletionDate: string;
  delayDays: number;
  confidenceLevel: number;
  factors: DelayFactor[];
  currentStatus: 'in_progress' | 'at_risk' | 'delayed';
}

export interface DelayFactor {
  name: string;
  impact: number;
  description: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'task_approval' | 'task_rejection' | 'delay_warning' | 'resource_alert' | 'chat_message';
  read: boolean;
  timestamp: string;
  relatedId?: string;
}

export interface UsageSubmission {
  id: string;
  type: 'material' | 'equipment' | 'damage';
  itemId: string;
  itemName: string;
  quantity?: number;
  unit?: string;
  notes: string;
  photo: string;
  timestamp: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  taskId?: string;
  workerId?: string;
}


