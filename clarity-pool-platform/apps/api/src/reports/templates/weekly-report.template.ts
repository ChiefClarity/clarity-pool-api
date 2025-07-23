import { Injectable } from '@nestjs/common';
import { WeeklyReportData } from '../interfaces/report.interface';

@Injectable()
export class WeeklyReportTemplate {
  generateReport(data: WeeklyReportData): { html: string; text: string } {
    const html = this.generateHtmlReport(data);
    const text = this.generateTextReport(data);

    return { html, text };
  }

  private generateHtmlReport(data: WeeklyReportData): string {
    const reportDate = new Date(data.serviceDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Chemistry ideal ranges for reference
    const idealRanges = {
      chlorine: { min: 1, max: 3, unit: 'ppm' },
      ph: { min: 7.2, max: 7.6, unit: '' },
      alkalinity: { min: 80, max: 120, unit: 'ppm' },
      calcium: { min: 200, max: 400, unit: 'ppm' },
      cyanuricAcid: { min: 30, max: 50, unit: 'ppm' },
      salt: { min: 2700, max: 3400, unit: 'ppm' },
    };

    // Health score color
    const healthScoreColor = this.getHealthScoreColor(data.healthScore);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Pool Health Report</title>
    <style>
        /* Reset and base styles */
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
        
        body {
            margin: 0 !important;
            padding: 0 !important;
            background-color: #f4f7fa;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            color: #333333;
            line-height: 1.6;
        }
        
        .email-container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        /* Header styles */
        .header {
            background: linear-gradient(135deg, #0066cc 0%, #004499 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        
        .header p {
            margin: 10px 0 0;
            font-size: 16px;
            opacity: 0.9;
        }
        
        /* Health score section */
        .health-score {
            background-color: #f8f9fa;
            padding: 30px;
            text-align: center;
            border-bottom: 1px solid #e9ecef;
        }
        
        .score-circle {
            display: inline-block;
            width: 120px;
            height: 120px;
            border-radius: 50%;
            background-color: ${healthScoreColor};
            color: white;
            line-height: 120px;
            font-size: 48px;
            font-weight: bold;
            margin-bottom: 15px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        
        .score-label {
            font-size: 18px;
            color: #495057;
            margin-bottom: 5px;
        }
        
        .score-status {
            font-size: 24px;
            font-weight: 600;
            color: ${healthScoreColor};
        }
        
        /* Content sections */
        .content-section {
            padding: 30px;
            border-bottom: 1px solid #e9ecef;
        }
        
        .content-section:last-child {
            border-bottom: none;
        }
        
        .section-title {
            font-size: 20px;
            font-weight: 600;
            color: #212529;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
        }
        
        .section-icon {
            width: 24px;
            height: 24px;
            margin-right: 10px;
        }
        
        /* Chemistry table */
        .chemistry-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        
        .chemistry-table th,
        .chemistry-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e9ecef;
        }
        
        .chemistry-table th {
            background-color: #f8f9fa;
            font-weight: 600;
            color: #495057;
            font-size: 14px;
            text-transform: uppercase;
        }
        
        .chemistry-table td {
            font-size: 16px;
        }
        
        .chemistry-value {
            font-weight: 600;
        }
        
        .in-range {
            color: #28a745;
        }
        
        .out-of-range {
            color: #dc3545;
        }
        
        /* Status badges */
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 500;
        }
        
        .status-operational {
            background-color: #d4edda;
            color: #155724;
        }
        
        .status-warning {
            background-color: #fff3cd;
            color: #856404;
        }
        
        .status-critical {
            background-color: #f8d7da;
            color: #721c24;
        }
        
        /* Alert box */
        .alert {
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        
        .alert-warning {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
        }
        
        .alert-danger {
            background-color: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
        }
        
        /* Lists */
        .service-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        
        .service-list li {
            padding: 8px 0;
            padding-left: 25px;
            position: relative;
        }
        
        .service-list li:before {
            content: "✓";
            position: absolute;
            left: 0;
            color: #28a745;
            font-weight: bold;
        }
        
        /* Footer */
        .footer {
            background-color: #f8f9fa;
            padding: 30px;
            text-align: center;
            color: #6c757d;
            font-size: 14px;
        }
        
        .footer a {
            color: #0066cc;
            text-decoration: none;
        }
        
        /* Responsive */
        @media screen and (max-width: 600px) {
            .email-container {
                margin: 0;
                border-radius: 0;
            }
            
            .header h1 {
                font-size: 24px;
            }
            
            .score-circle {
                width: 100px;
                height: 100px;
                line-height: 100px;
                font-size: 40px;
            }
            
            .content-section {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <!-- Header -->
        <div class="header">
            <h1>Pool Health Report</h1>
            <p>${reportDate}</p>
        </div>
        
        <!-- Health Score -->
        <div class="health-score">
            <div class="score-label">Overall Health Score</div>
            <div class="score-circle">${data.healthScore}</div>
            <div class="score-status">${this.getHealthStatus(data.healthScore)}</div>
        </div>
        
        <!-- Urgent Issues Alert -->
        ${
          data.urgentIssues.length > 0
            ? `
        <div class="content-section">
            <div class="alert alert-danger">
                <strong>⚠️ Urgent Issues Requiring Attention:</strong>
                <ul style="margin: 10px 0 0; padding-left: 20px;">
                    ${data.urgentIssues.map((issue) => `<li>${this.escapeHtml(issue)}</li>`).join('')}
                </ul>
            </div>
        </div>
        `
            : ''
        }
        
        <!-- Service Summary -->
        <div class="content-section">
            <h2 class="section-title">
                <span class="section-icon">🔧</span>
                Service Summary
            </h2>
            <p><strong>Technician:</strong> ${this.escapeHtml(data.technicianName)}</p>
            <p><strong>Property:</strong> ${this.escapeHtml(data.poolAddress)}</p>
            
            <h3 style="margin-top: 20px; font-size: 18px;">Services Performed:</h3>
            <ul class="service-list">
                ${data.servicesPerformed
                  .map((service) => `<li>${this.escapeHtml(service)}</li>`)
                  .join('')}
            </ul>
            
            ${
              data.chemicalsAdded.length > 0
                ? `
            <h3 style="margin-top: 20px; font-size: 18px;">Chemicals Added:</h3>
            <ul style="list-style: none; padding: 0;">
                ${data.chemicalsAdded
                  .map(
                    (chemical) =>
                      `<li style="padding: 5px 0;">
                        <strong>${this.escapeHtml(chemical.chemical)}:</strong> 
                        ${this.escapeHtml(chemical.amount)} - 
                        <em>${this.escapeHtml(chemical.reason)}</em>
                    </li>`,
                  )
                  .join('')}
            </ul>
            `
                : ''
            }
        </div>
        
        <!-- Water Chemistry -->
        <div class="content-section">
            <h2 class="section-title">
                <span class="section-icon">🧪</span>
                Water Chemistry
            </h2>
            
            <table class="chemistry-table">
                <thead>
                    <tr>
                        <th>Parameter</th>
                        <th>Current</th>
                        <th>Ideal Range</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.generateChemistryRows(data.chemistry, idealRanges)}
                </tbody>
            </table>
            
            ${
              data.chemistryTrends.length > 0
                ? `
            <h3 style="margin-top: 20px; font-size: 18px;">Trends:</h3>
            <ul style="list-style: none; padding: 0;">
                ${data.chemistryTrends
                  .filter((trend) => Math.abs(trend.changePercent) > 10)
                  .map(
                    (trend) =>
                      `<li style="padding: 5px 0;">
                            ${this.getTrendIcon(trend.trend)} 
                            <strong>${trend.parameter}:</strong> 
                            ${trend.trend} by ${Math.abs(trend.changePercent).toFixed(0)}%
                        </li>`,
                  )
                  .join('')}
            </ul>
            `
                : ''
            }
        </div>
        
        <!-- Equipment Status -->
        <div class="content-section">
            <h2 class="section-title">
                <span class="section-icon">⚙️</span>
                Equipment Status
            </h2>
            
            <div style="margin-top: 15px;">
                <div style="margin-bottom: 15px;">
                    <strong>Pump:</strong> 
                    <span class="status-badge status-${data.equipment.pump.status}">
                        ${data.equipment.pump.status}
                    </span>
                    ${
                      data.equipment.pump.issues.length > 0
                        ? `<ul style="margin-top: 5px; color: #dc3545;">
                            ${data.equipment.pump.issues
                              .map(
                                (issue) => `<li>${this.escapeHtml(issue)}</li>`,
                              )
                              .join('')}
                        </ul>`
                        : ''
                    }
                </div>
                
                <div style="margin-bottom: 15px;">
                    <strong>Filter:</strong> 
                    <span class="status-badge status-${data.equipment.filter.status}">
                        ${data.equipment.filter.status}
                    </span>
                    <span style="margin-left: 10px;">Pressure: ${data.equipment.filter.pressure} PSI</span>
                </div>
                
                ${
                  data.equipment.heater
                    ? `
                <div style="margin-bottom: 15px;">
                    <strong>Heater:</strong> 
                    <span class="status-badge status-${data.equipment.heater.status}">
                        ${data.equipment.heater.status}
                    </span>
                    <span style="margin-left: 10px;">Temperature: ${data.equipment.heater.temperature}°F</span>
                </div>
                `
                    : ''
                }
                
                ${
                  data.equipment.sanitizer
                    ? `
                <div style="margin-bottom: 15px;">
                    <strong>Sanitizer (${data.equipment.sanitizer.type}):</strong> 
                    <span class="status-badge status-${data.equipment.sanitizer.status}">
                        ${data.equipment.sanitizer.status}
                    </span>
                </div>
                `
                    : ''
                }
            </div>
        </div>
        
        <!-- Recommendations -->
        ${
          data.recommendations.length > 0
            ? `
        <div class="content-section">
            <h2 class="section-title">
                <span class="section-icon">💡</span>
                Recommendations
            </h2>
            <ul style="padding-left: 20px;">
                ${data.recommendations
                  .map(
                    (rec) =>
                      `<li style="margin-bottom: 10px;">${this.escapeHtml(rec)}</li>`,
                  )
                  .join('')}
            </ul>
        </div>
        `
            : ''
        }
        
        <!-- Weather Impact -->
        <div class="content-section">
            <h2 class="section-title">
                <span class="section-icon">☀️</span>
                Weather Conditions
            </h2>
            <p>
                <strong>Current:</strong> ${data.weather.temperature}°F, ${data.weather.conditions}
            </p>
            ${
              data.weather.forecast.length > 0
                ? `
            <p style="margin-top: 10px;"><strong>Upcoming Forecast:</strong></p>
            <ul style="list-style: none; padding: 0;">
                ${data.weather.forecast
                  .slice(0, 3)
                  .map(
                    (day) =>
                      `<li style="padding: 5px 0;">
                        ${new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}: 
                        ${day.temp}°F, ${day.conditions}
                        ${day.precipitation > 0 ? ` (${day.precipitation}% chance of rain)` : ''}
                    </li>`,
                  )
                  .join('')}
            </ul>
            `
                : ''
            }
        </div>
        
        <!-- Notes -->
        ${
          data.notes
            ? `
        <div class="content-section">
            <h2 class="section-title">
                <span class="section-icon">📝</span>
                Technician Notes
            </h2>
            <p>${this.escapeHtml(data.notes)}</p>
        </div>
        `
            : ''
        }
        
        <!-- Next Service -->
        ${
          data.nextServiceDate
            ? `
        <div class="content-section" style="background-color: #f8f9fa;">
            <h2 class="section-title">
                <span class="section-icon">📅</span>
                Next Service Scheduled
            </h2>
            <p style="font-size: 18px; margin: 0;">
                ${new Date(data.nextServiceDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
            </p>
        </div>
        `
            : ''
        }
        
        <!-- Footer -->
        <div class="footer">
            <p style="margin-bottom: 10px;">
                This report was generated for ${this.escapeHtml(data.customerName)}
            </p>
            <p style="margin-bottom: 10px;">
                Questions? Contact us at <a href="mailto:support@claritypools.com">support@claritypools.com</a>
            </p>
            <p style="font-size: 12px; color: #adb5bd;">
                © ${new Date().getFullYear()} Clarity Pool Service. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
    `;
  }

  private generateTextReport(data: WeeklyReportData): string {
    const reportDate = new Date(data.serviceDate).toLocaleDateString('en-US');

    return `
POOL HEALTH REPORT
==================
Date: ${reportDate}

OVERALL HEALTH SCORE: ${data.healthScore}/100 - ${this.getHealthStatus(data.healthScore)}

${
  data.urgentIssues.length > 0
    ? `
URGENT ISSUES:
${data.urgentIssues.map((issue) => `- ${issue}`).join('\n')}

`
    : ''
}
SERVICE SUMMARY
---------------
Technician: ${data.technicianName}
Property: ${data.poolAddress}

Services Performed:
${data.servicesPerformed.map((service) => `- ${service}`).join('\n')}

${
  data.chemicalsAdded.length > 0
    ? `
Chemicals Added:
${data.chemicalsAdded.map((c) => `- ${c.chemical}: ${c.amount} (${c.reason})`).join('\n')}
`
    : ''
}

WATER CHEMISTRY
---------------
${this.generateTextChemistryReport(data.chemistry)}

EQUIPMENT STATUS
----------------
- Pump: ${data.equipment.pump.status}
- Filter: ${data.equipment.filter.status} (Pressure: ${data.equipment.filter.pressure} PSI)
${data.equipment.heater ? `- Heater: ${data.equipment.heater.status} (${data.equipment.heater.temperature}°F)` : ''}
${data.equipment.sanitizer ? `- Sanitizer (${data.equipment.sanitizer.type}): ${data.equipment.sanitizer.status}` : ''}

${
  data.recommendations.length > 0
    ? `
RECOMMENDATIONS
---------------
${data.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}
`
    : ''
}

${
  data.notes
    ? `
TECHNICIAN NOTES
----------------
${data.notes}
`
    : ''
}

${
  data.nextServiceDate
    ? `
NEXT SERVICE
------------
${new Date(data.nextServiceDate).toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})}
`
    : ''
}

---
Clarity Pool Service
support@claritypools.com
    `.trim();
  }

  private generateChemistryRows(chemistry: any, idealRanges: any): string {
    const parameters = [
      { key: 'chlorine', name: 'Free Chlorine' },
      { key: 'ph', name: 'pH' },
      { key: 'alkalinity', name: 'Alkalinity' },
      { key: 'calcium', name: 'Calcium Hardness' },
      { key: 'cyanuricAcid', name: 'Cyanuric Acid' },
    ];

    if (chemistry.salt !== undefined) {
      parameters.push({ key: 'salt', name: 'Salt' });
    }

    return parameters
      .map((param) => {
        const value = chemistry[param.key];
        const range = idealRanges[param.key];
        const isInRange = range
          ? value >= range.min && value <= range.max
          : true;

        return `
        <tr>
          <td>${param.name}</td>
          <td class="chemistry-value ${isInRange ? 'in-range' : 'out-of-range'}">
            ${value}${range?.unit ? ` ${range.unit}` : ''}
          </td>
          <td>${range ? `${range.min}-${range.max}${range.unit ? ` ${range.unit}` : ''}` : 'N/A'}</td>
          <td>
            <span class="status-badge status-${isInRange ? 'operational' : 'warning'}">
              ${isInRange ? 'Good' : 'Adjust'}
            </span>
          </td>
        </tr>
      `;
      })
      .join('');
  }

  private generateTextChemistryReport(chemistry: any): string {
    return `
- Free Chlorine: ${chemistry.chlorine} ppm
- pH: ${chemistry.ph}
- Alkalinity: ${chemistry.alkalinity} ppm
- Calcium Hardness: ${chemistry.calcium} ppm
- Cyanuric Acid: ${chemistry.cyanuricAcid} ppm
${chemistry.salt !== undefined ? `- Salt: ${chemistry.salt} ppm` : ''}
    `.trim();
  }

  private getHealthScoreColor(score: number): string {
    if (score >= 80) return '#28a745';
    if (score >= 60) return '#ffc107';
    return '#dc3545';
  }

  private getHealthStatus(score: number): string {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Very Good';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Needs Attention';
  }

  private getTrendIcon(trend: 'increasing' | 'decreasing' | 'stable'): string {
    switch (trend) {
      case 'increasing':
        return '📈';
      case 'decreasing':
        return '📉';
      default:
        return '➡️';
    }
  }

  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };

    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}
