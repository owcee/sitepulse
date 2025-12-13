import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';

// Custom alert function for styled PDF export success messages
const showPDFSuccessAlert = (title: string, message: string) => {
  Alert.alert(
    title,
    message,
    [{ text: 'OK', style: 'default' }],
    {
      // Note: React Native Alert doesn't support full styling, but we can use a custom component
      // For now, we'll use the default Alert but with updated text
    }
  );
};

interface BudgetLog {
  id: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  addedBy: string;
}

interface ProjectInfo {
  name: string;
  description?: string;
  totalBudget: number;
  contingencyPercentage?: number;
}

/**
 * Generate and export Budget Logs as PDF
 * @param budgetLogs - Array of budget log entries
 * @param projectInfo - Project details
 * @param totalSpent - Total amount spent
 * @returns Promise<void>
 */
export async function exportBudgetToPDF(
  budgetLogs: BudgetLog[],
  projectInfo: ProjectInfo,
  totalSpent: number
): Promise<void> {
  try {
    // Generate HTML content for PDF
    const htmlContent = generateBudgetHTML(budgetLogs, projectInfo, totalSpent);

    // Create PDF from HTML
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false,
    });

    console.log('PDF generated:', uri);

    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync();
    
    if (isAvailable) {
      // Share/Save the PDF
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Save Budget Report',
        UTI: 'com.adobe.pdf',
      });
      
      // Alert will be shown by the calling component with custom styling
      // This alert is kept as fallback for non-UI contexts
      console.log('PDF Exported Successfully - Your budget report has been shared.');
    } else {
      Alert.alert(
        'PDF Generated',
        `PDF saved to: ${uri}`,
        [{ text: 'OK' }]
      );
    }
  } catch (error) {
    console.error('Error exporting PDF:', error);
    Alert.alert(
      'Export Failed',
      'Unable to generate PDF report. Please try again.',
      [{ text: 'OK' }]
    );
    throw error;
  }
}

/**
 * Generate HTML template for budget report
 */
function generateBudgetHTML(
  budgetLogs: BudgetLog[],
  projectInfo: ProjectInfo,
  totalSpent: number
): string {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const budgetRemaining = projectInfo.totalBudget - totalSpent;
  const percentageSpent = projectInfo.totalBudget > 0 ? ((totalSpent / projectInfo.totalBudget) * 100).toFixed(1) : '0.0';
  const contingency = projectInfo.contingencyPercentage || 0;
  const contingencyAmount = (projectInfo.totalBudget * contingency) / 100;

  // Debug: Log budget logs to see what we're working with
  console.log('PDF Export - Budget Logs Count:', budgetLogs.length);
  console.log('PDF Export - Budget Logs:', JSON.stringify(budgetLogs, null, 2));
  console.log('PDF Export - Total Spent:', totalSpent);
  console.log('PDF Export - Total Budget:', projectInfo.totalBudget);
  
  // Early return if no logs
  if (!budgetLogs || budgetLogs.length === 0) {
    console.warn('PDF Export - No budget logs provided!');
  }

  // Group logs by category for summary - ensure we handle all categories
  const categorySummary = budgetLogs.reduce((acc, log) => {
    // Skip invalid logs
    if (!log) {
      console.log('PDF Export - Skipping null/undefined log');
      return acc;
    }
    if (!log.amount || log.amount <= 0 || isNaN(log.amount)) {
      console.log('PDF Export - Skipping log with invalid amount:', log);
      return acc;
    }
    
    // Normalize category: handle both string and union types, trim whitespace, default to 'other'
    let category = log.category;
    if (!category || typeof category !== 'string') {
      console.log('PDF Export - Category is not a string, defaulting to "other":', category);
      category = 'other';
    }
    category = String(category).trim();
    if (!category || category === '') {
      console.log('PDF Export - Category is empty, defaulting to "other"');
      category = 'other';
    }
    // Normalize to lowercase for consistent grouping (handle already capitalized categories)
    const normalizedCategory = category.toLowerCase();
    console.log('PDF Export - Processing category:', category, '-> normalized:', normalizedCategory, 'amount:', log.amount);
    
    if (!acc[normalizedCategory]) {
      acc[normalizedCategory] = 0;
    }
    acc[normalizedCategory] += Number(log.amount);
    return acc;
  }, {} as Record<string, number>);

  console.log('PDF Export - Category Summary:', JSON.stringify(categorySummary, null, 2));
  console.log('PDF Export - Category Summary Keys:', Object.keys(categorySummary));
  console.log('PDF Export - Category Summary Values:', Object.values(categorySummary));

  // Generate category summary HTML - capitalize first letter
  const categoryEntries = Object.entries(categorySummary);
  console.log('PDF Export - Category entries:', categoryEntries);
  console.log('PDF Export - Category entries count:', categoryEntries.length);
  
  const categoryRows = categoryEntries
    .filter(([category, amount]) => {
      const isValid = category && category !== '' && amount > 0;
      if (!isValid) {
        console.log('PDF Export - Filtering out category entry:', category, amount);
      }
      return isValid;
    })
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => {
      // Capitalize first letter, rest lowercase
      const capitalizedCategory = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
      console.log('PDF Export - Generating row for category:', capitalizedCategory, 'amount:', amount);
      return `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${capitalizedCategory}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; font-weight: 600;">
          ₱${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </td>
      </tr>
    `;
    })
    .join('');
  
  console.log('PDF Export - Category rows generated:', categoryRows.length > 0 ? 'YES' : 'NO');
  console.log('PDF Export - Category rows HTML length:', categoryRows.length);
  
  // If no category rows, show a message
  // But first, let's check if we have any logs at all
  console.log('PDF Export - Category rows length:', categoryRows.length);
  console.log('PDF Export - Category entries count:', categoryEntries.length);
  
  const categoryTableContent = categoryRows.length > 0 
    ? categoryRows 
    : '<tr><td colspan="2" style="text-align: center; padding: 20px; color: #999;">No budget logs recorded</td></tr>';

  // Generate detailed logs HTML - sort by date descending
  const validLogs = budgetLogs.filter(log => {
    // Filter out invalid logs
    if (!log) {
      console.log('PDF Export - Filtering out null/undefined log');
      return false;
    }
    if (!log.amount || log.amount <= 0) {
      console.log('PDF Export - Filtering out log with invalid amount:', log);
      return false;
    }
    // Ensure category exists
    let category = log.category;
    if (typeof category !== 'string') {
      category = 'other';
    }
    category = category.trim().toLowerCase();
    if (!category || category === '') {
      console.log('PDF Export - Filtering out log with empty category:', log);
      return false;
    }
    return true;
  });
  
  console.log('PDF Export - Valid logs for detailed table:', validLogs.length);
  
  const logRows = validLogs
    .sort((a, b) => {
      // Handle date sorting - try to parse dates
      let dateA = 0;
      let dateB = 0;
      try {
        if (a.date) {
          const parsedA = new Date(a.date);
          dateA = isNaN(parsedA.getTime()) ? 0 : parsedA.getTime();
        }
      } catch (e) {
        console.log('PDF Export - Error parsing date A:', a.date);
      }
      try {
        if (b.date) {
          const parsedB = new Date(b.date);
          dateB = isNaN(parsedB.getTime()) ? 0 : parsedB.getTime();
        }
      } catch (e) {
        console.log('PDF Export - Error parsing date B:', b.date);
      }
      return dateB - dateA; // Descending order (newest first)
    })
    .map((log) => {
      // Format date
      let logDate = 'N/A';
      try {
        if (log.date) {
          const dateObj = new Date(log.date);
          if (!isNaN(dateObj.getTime())) {
            logDate = dateObj.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            });
          }
        }
      } catch (e) {
        console.log('PDF Export - Error formatting date:', log.date);
        logDate = String(log.date || 'N/A');
      }
      
      // Normalize category
      let category = log.category;
      if (typeof category !== 'string') {
        category = 'other';
      }
      category = category.trim().toLowerCase();
      if (!category || category === '') {
        category = 'other';
      }
      const capitalizedCategory = category.charAt(0).toUpperCase() + category.slice(1);
      
      const description = (log.description || 'No description').trim();
      const amount = log.amount || 0;
      const addedBy = (log.addedBy || 'Engineer').trim();
      
      return `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; font-size: 12px;">
          ${logDate}
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; font-size: 12px;">${capitalizedCategory}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; font-size: 12px;">${description}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; font-size: 12px; font-weight: 600;">
          ₱${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; font-size: 11px; color: #666;">
          ${addedBy}
        </td>
      </tr>
    `;
    })
    .join('');
  
  // If no log rows, show a message
  console.log('PDF Export - Log rows length:', logRows.length);
  console.log('PDF Export - Valid logs count:', validLogs.length);
  
  const logTableContent = logRows.length > 0 
    ? logRows 
    : '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #999;">No budget logs recorded</td></tr>';

  // HTML Template
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Budget Report - ${projectInfo.name}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 0;
          padding: 20px;
          color: #333;
          background-color: #fff;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 3px solid #2196F3;
        }
        .header h1 {
          margin: 0;
          color: #2196F3;
          font-size: 28px;
        }
        .header p {
          margin: 5px 0;
          color: #666;
          font-size: 14px;
        }
        .project-info {
          background-color: #f5f5f5;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        .project-info h2 {
          margin: 0 0 10px 0;
          color: #333;
          font-size: 18px;
        }
        .project-info p {
          margin: 5px 0;
          font-size: 13px;
          color: #555;
        }
        .summary-cards {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
          gap: 15px;
        }
        .summary-card {
          flex: 1;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
        }
        .summary-card.green {
          background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
        }
        .summary-card.orange {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }
        .summary-card.blue {
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        }
        .summary-card h3 {
          margin: 0 0 10px 0;
          font-size: 14px;
          font-weight: 400;
          opacity: 0.9;
        }
        .summary-card .value {
          font-size: 24px;
          font-weight: 700;
          margin: 0;
        }
        .section {
          margin-bottom: 30px;
        }
        .section h2 {
          color: #2196F3;
          font-size: 20px;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 2px solid #e0e0e0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
          background-color: #fff;
        }
        thead {
          background-color: #2196F3;
          color: white;
        }
        th {
          padding: 12px 8px;
          text-align: left;
          font-size: 13px;
          font-weight: 600;
        }
        th:last-child, td:last-child {
          text-align: right;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #e0e0e0;
          text-align: center;
          font-size: 12px;
          color: #999;
        }
        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }
        .status-good {
          background-color: #e8f5e9;
          color: #2e7d32;
        }
        .status-warning {
          background-color: #fff3e0;
          color: #ef6c00;
        }
        .status-danger {
          background-color: #ffebee;
          color: #c62828;
        }
        @media print {
          body { margin: 0; }
          .summary-cards { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <!-- Header -->
      <div class="header">
        <h1>📊 Budget Report</h1>
        <p><strong>SitePulse</strong> Construction Management Platform</p>
        <p>Generated on: ${currentDate}</p>
      </div>

      <!-- Project Information -->
      <div class="project-info">
        <h2>${projectInfo.name}</h2>
        ${projectInfo.description ? `<p>${projectInfo.description}</p>` : ''}
        <p><strong>Report Period:</strong> All Time</p>
      </div>

      <!-- Summary Cards -->
      <div class="summary-cards">
        <div class="summary-card blue">
          <h3>Total Budget</h3>
          <p class="value">₱${projectInfo.totalBudget.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        </div>
        <div class="summary-card orange">
          <h3>Total Spent</h3>
          <p class="value">₱${totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          <p style="margin: 5px 0 0 0; font-size: 13px;">${percentageSpent}% of budget</p>
        </div>
        <div class="summary-card ${budgetRemaining > 0 ? 'green' : 'orange'}">
          <h3>Remaining</h3>
          <p class="value">₱${budgetRemaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        </div>
        ${contingency > 0 ? `
        <div class="summary-card">
          <h3>Contingency (${contingency}%)</h3>
          <p class="value">₱${contingencyAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        </div>
        ` : ''}
      </div>

      <!-- Budget Status -->
      <div class="section">
        <h2>Budget Status</h2>
        <p>
          Current Status: 
          <span class="status-badge ${
            Number(percentageSpent) < 75 ? 'status-good' : Number(percentageSpent) < 90 ? 'status-warning' : 'status-danger'
          }">
            ${Number(percentageSpent) < 75 ? '✓ On Track' : Number(percentageSpent) < 90 ? '⚠ Needs Attention' : '⚠ Over Budget'}
          </span>
        </p>
      </div>

      <!-- Category Summary -->
      <div class="section">
        <h2>Spending by Category</h2>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th style="text-align: right;">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            ${categoryTableContent}
          </tbody>
        </table>
      </div>

      <!-- Detailed Budget Logs -->
      <div class="section">
        <h2>Detailed Budget Logs (${budgetLogs.length} entries)</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Description</th>
              <th style="text-align: right;">Amount</th>
              <th>Added By</th>
            </tr>
          </thead>
          <tbody>
            ${logTableContent}
          </tbody>
        </table>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p><strong>SitePulse</strong> - Construction Management Platform</p>
        <p>This is a computer-generated document. No signature is required.</p>
        <p>Report generated on ${currentDate}</p>
      </div>
    </body>
    </html>
  `;
}

interface MaterialItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  price: number;
  category: string;
  supplier?: string;
  dateAdded: string;
}


/**
 * Generate Materials Inventory Report as PDF
 */
export async function exportMaterialsToPDF(
  materials: MaterialItem[], 
  projectInfo: ProjectInfo,
  lowStockThreshold: number = 10
): Promise<void> {
  try {
    const htmlContent = generateMaterialsHTML(materials, projectInfo, lowStockThreshold);

    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false,
    });

    console.log('Inventory PDF generated:', uri);

    const isAvailable = await Sharing.isAvailableAsync();
    
    if (isAvailable) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Save Inventory Report',
        UTI: 'com.adobe.pdf',
      });
      
      // Alert will be shown by the calling component with custom styling
      // This alert is kept as fallback for non-UI contexts
      console.log('PDF Exported Successfully - Your inventory report has been shared.');
    } else {
      Alert.alert(
        'PDF Generated',
        `PDF saved to: ${uri}`,
        [{ text: 'OK' }]
      );
    }
  } catch (error) {
    console.error('Error exporting inventory PDF:', error);
    Alert.alert(
      'Export Failed',
      'Unable to generate inventory report. Please try again.',
      [{ text: 'OK' }]
    );
    throw error;
  }
}

/**
 * Generate HTML template for inventory report
 */
function generateMaterialsHTML(
  materials: MaterialItem[],
  projectInfo: ProjectInfo,
  lowStockThreshold: number
): string {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const totalValue = materials.reduce((sum, m) => sum + (m.quantity * m.price), 0);
  const totalInventoryValue = totalValue;
  const lowStockItems = materials.filter(m => m.quantity <= lowStockThreshold);
  const totalItems = materials.length;

  // Group by category
  const categorySummary = materials.reduce((acc, m) => {
    if (!acc[m.category]) {
      acc[m.category] = { count: 0, value: 0 };
    }
    acc[m.category].count += m.quantity;
    acc[m.category].value += m.quantity * m.price;
    return acc;
  }, {} as Record<string, { count: number; value: number }>);

  const categoryRows = Object.entries(categorySummary)
    .sort((a, b) => b[1].value - a[1].value)
    .map(([category, data]) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${category}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${data.count}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; font-weight: 600;">
          ₱${data.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </td>
      </tr>
    `)
    .join('');

  const materialRows = materials
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((m) => {
      const isLowStock = m.quantity <= lowStockThreshold;
      return `
        <tr style="${isLowStock ? 'background-color: #ffebee;' : ''}">
          <td style="padding: 8px; border-bottom: 1px solid #ddd; font-size: 12px;">${m.name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; font-size: 12px;">${m.category}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center; font-size: 12px; ${isLowStock ? 'color: #c62828; font-weight: bold;' : ''}">
            ${m.quantity} ${m.unit}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; font-size: 12px;">
            ₱${m.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; font-size: 12px; font-weight: 600;">
            ₱${(m.quantity * m.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; font-size: 11px; color: #666;">
            ${m.supplier || '-'}
          </td>
        </tr>
      `;
    })
    .join('');

  const lowStockRows = lowStockItems
    .map((m) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; color: #c62828; font-weight: 500;">${m.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center; color: #c62828; font-weight: bold;">
          ${m.quantity} ${m.unit}
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; font-size: 12px;">${m.category}</td>
      </tr>
    `)
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Inventory Report - ${projectInfo.name}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 0;
          padding: 20px;
          color: #333;
          background-color: #fff;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 3px solid #4CAF50;
        }
        .header h1 {
          margin: 0;
          color: #4CAF50;
          font-size: 28px;
        }
        .header p {
          margin: 5px 0;
          color: #666;
          font-size: 14px;
        }
        .project-info {
          background-color: #f5f5f5;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        .project-info h2 {
          margin: 0 0 10px 0;
          color: #333;
          font-size: 18px;
        }
        .summary-cards {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
          gap: 15px;
        }
        .summary-card {
          flex: 1;
          background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
          color: white;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
        }
        .summary-card.orange {
          background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%);
        }
        .summary-card.red {
          background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
        }
        .summary-card.blue {
          background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
        }
        .summary-card h3 {
          margin: 0 0 10px 0;
          font-size: 14px;
          font-weight: 400;
          opacity: 0.9;
        }
        .summary-card .value {
          font-size: 24px;
          font-weight: 700;
          margin: 0;
        }
        .section {
          margin-bottom: 30px;
        }
        .section h2 {
          color: #4CAF50;
          font-size: 20px;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 2px solid #e0e0e0;
        }
        .alert-section h2 {
          color: #c62828;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
          background-color: #fff;
        }
        thead {
          background-color: #4CAF50;
          color: white;
        }
        .alert-section thead {
          background-color: #c62828;
        }
        th {
          padding: 12px 8px;
          text-align: left;
          font-size: 13px;
          font-weight: 600;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #e0e0e0;
          text-align: center;
          font-size: 12px;
          color: #999;
        }
        @media print {
          body { margin: 0; }
          .summary-cards { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📦 Inventory Report</h1>
        <p><strong>SitePulse</strong> Construction Management Platform</p>
        <p>Generated on: ${currentDate}</p>
      </div>

      <div class="project-info">
        <h2>${projectInfo.name}</h2>
        ${projectInfo.description ? `<p>${projectInfo.description}</p>` : ''}
      </div>

      <div class="summary-cards">
        <div class="summary-card blue">
          <h3>Total Items</h3>
          <p class="value">${totalItems}</p>
        </div>
        <div class="summary-card">
          <h3>Total Value</h3>
          <p class="value">₱${totalInventoryValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        </div>
        <div class="summary-card ${lowStockItems.length > 0 ? 'red' : 'orange'}">
          <h3>Low Stock Items</h3>
          <p class="value">${lowStockItems.length}</p>
        </div>
      </div>

      ${lowStockItems.length > 0 ? `
      <div class="section alert-section">
        <h2>⚠️ Low Stock Alerts</h2>
        <table>
          <thead>
            <tr>
              <th>Material</th>
              <th style="text-align: center;">Current Stock</th>
              <th>Category</th>
            </tr>
          </thead>
          <tbody>
            ${lowStockRows}
          </tbody>
        </table>
      </div>
      ` : ''}

      <div class="section">
        <h2>Inventory by Category</h2>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th style="text-align: center;">Total Quantity</th>
              <th style="text-align: right;">Total Value</th>
            </tr>
          </thead>
          <tbody>
            ${categoryRows || '<tr><td colspan="3" style="text-align: center; padding: 20px; color: #999;">No materials recorded</td></tr>'}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2>Detailed Inventory - Materials (${materials.length} items)</h2>
        <table>
          <thead>
            <tr>
              <th>Material</th>
              <th>Category</th>
              <th style="text-align: center;">Quantity</th>
              <th style="text-align: right;">Unit Price</th>
              <th style="text-align: right;">Total Value</th>
              <th>Supplier</th>
            </tr>
          </thead>
          <tbody>
            ${materialRows || '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #999;">No materials recorded</td></tr>'}
          </tbody>
        </table>
      </div>


      <div class="footer">
        <p><strong>SitePulse</strong> - Construction Management Platform</p>
        <p>This is a computer-generated document. No signature is required.</p>
        <p>Report generated on ${currentDate}</p>
      </div>
    </body>
    </html>
  `;
}


