import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';

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
      
      Alert.alert(
        'PDF Exported Successfully',
        'Your budget report has been saved and can be shared.',
        [{ text: 'OK' }]
      );
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
  const percentageSpent = ((totalSpent / projectInfo.totalBudget) * 100).toFixed(1);
  const contingency = projectInfo.contingencyPercentage || 0;
  const contingencyAmount = (projectInfo.totalBudget * contingency) / 100;

  // Group logs by category for summary
  const categorySummary = budgetLogs.reduce((acc, log) => {
    if (!acc[log.category]) {
      acc[log.category] = 0;
    }
    acc[log.category] += log.amount;
    return acc;
  }, {} as Record<string, number>);

  // Generate category summary HTML
  const categoryRows = Object.entries(categorySummary)
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${category}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; font-weight: 600;">
          ₱${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </td>
      </tr>
    `)
    .join('');

  // Generate detailed logs HTML
  const logRows = budgetLogs
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map((log) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; font-size: 12px;">
          ${new Date(log.date).toLocaleDateString('en-US')}
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; font-size: 12px;">${log.category}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; font-size: 12px;">${log.description}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; font-size: 12px; font-weight: 600;">
          ₱${log.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; font-size: 11px; color: #666;">
          ${log.addedBy}
        </td>
      </tr>
    `)
    .join('');

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
            percentageSpent < 75 ? 'status-good' : percentageSpent < 90 ? 'status-warning' : 'status-danger'
          }">
            ${percentageSpent < 75 ? '✓ On Track' : percentageSpent < 90 ? '⚠ Needs Attention' : '⚠ Over Budget'}
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
            ${categoryRows || '<tr><td colspan="2" style="text-align: center; padding: 20px; color: #999;">No budget logs recorded</td></tr>'}
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
            ${logRows || '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #999;">No budget logs recorded</td></tr>'}
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

/**
 * Generate Materials Inventory Report as PDF
 * (Future enhancement - can be expanded similarly)
 */
export async function exportMaterialsToPDF(materials: any[], projectInfo: ProjectInfo): Promise<void> {
  // Similar implementation for materials
  Alert.alert('Coming Soon', 'Materials export feature will be available in the next update.');
}

/**
 * Generate Equipment Report as PDF
 * (Future enhancement)
 */
export async function exportEquipmentToPDF(equipment: any[], projectInfo: ProjectInfo): Promise<void> {
  // Similar implementation for equipment
  Alert.alert('Coming Soon', 'Equipment export feature will be available in the next update.');
}

