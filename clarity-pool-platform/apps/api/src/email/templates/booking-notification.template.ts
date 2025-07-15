import { Injectable } from '@nestjs/common';

@Injectable()
export class BookingEmailTemplate {
  generateBookingEmail(data: any, poolbrainId: number): { html: string; text: string } {
    const html = this.generateHtmlEmail(data, poolbrainId);
    const text = this.generateTextEmail(data, poolbrainId);
    
    return { html, text };
  }

  private generateHtmlEmail(data: any, poolbrainId: number): string {
    const currentDate = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const currentTime = new Date().toLocaleTimeString('en-US');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Pool Analysis Reservation</title>
    <style>
        /* Reset styles */
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
        
        /* Main styles */
        body {
            margin: 0 !important;
            padding: 0 !important;
            background-color: #f4f7fa;
            font-family: Arial, sans-serif;
            color: #333333;
            line-height: 1.6;
        }
        
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .header {
            background: linear-gradient(135deg, #577C8E 0%, #4a6b7c 100%);
            color: #ffffff;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        
        .header p {
            margin: 10px 0 0 0;
            font-size: 16px;
            opacity: 0.9;
        }
        
        .content {
            padding: 30px;
        }
        
        .section {
            background-color: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            border: 1px solid #e9ecef;
        }
        
        .section h2 {
            margin: 0 0 15px 0;
            color: #577C8E;
            font-size: 20px;
            font-weight: 600;
            display: flex;
            align-items: center;
        }
        
        .section h2 span {
            margin-right: 10px;
            font-size: 24px;
        }
        
        .info-row {
            display: flex;
            padding: 8px 0;
            border-bottom: 1px solid #e9ecef;
        }
        
        .info-row:last-child {
            border-bottom: none;
        }
        
        .info-label {
            font-weight: 600;
            color: #495057;
            min-width: 140px;
            flex-shrink: 0;
        }
        
        .info-value {
            color: #212529;
            word-break: break-word;
        }
        
        .dog-alert {
            background-color: #fff3cd;
            border: 2px solid #ffc107;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
        }
        
        .dog-alert h2 {
            color: #856404;
            margin: 0 0 10px 0;
            display: flex;
            align-items: center;
        }
        
        .dog-alert-content {
            color: #856404;
            font-weight: 500;
        }
        
        .water-body-item {
            background-color: #ffffff;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            padding: 15px;
            margin-bottom: 10px;
        }
        
        .water-body-item h3 {
            margin: 0 0 10px 0;
            color: #495057;
            font-size: 16px;
        }
        
        .action-items {
            background-color: #e7f3ff;
            border: 2px solid #0066cc;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        
        .action-items h2 {
            color: #0066cc;
            margin: 0 0 15px 0;
        }
        
        .action-items ol {
            margin: 0;
            padding-left: 20px;
        }
        
        .action-items li {
            margin-bottom: 8px;
            color: #0052a3;
        }
        
        .footer {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #6c757d;
            border-top: 1px solid #dee2e6;
        }
        
        .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #577C8E;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 5px;
        }
        
        .button:hover {
            background-color: #4a6b7c;
        }
        
        /* Mobile responsive */
        @media only screen and (max-width: 600px) {
            .email-container {
                width: 100% !important;
                border-radius: 0;
            }
            
            .content {
                padding: 20px;
            }
            
            .info-row {
                flex-direction: column;
            }
            
            .info-label {
                margin-bottom: 4px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <!-- Header -->
        <div class="header">
            <h1>🏊 New Pool Analysis Reservation</h1>
            <p>${currentDate} at ${currentTime}</p>
        </div>
        
        <!-- Content -->
        <div class="content">
            ${data.address.hasDogs === 'yes' ? `
            <!-- Dog Alert -->
            <div class="dog-alert">
                <h2><span>🐕</span> DOG ALERT - Property Has Dogs</h2>
                <div class="dog-alert-content">
                    ${data.address.dogDetails ? 
                        `<strong>Details provided by customer:</strong><br>${this.escapeHtml(data.address.dogDetails)}` : 
                        '<strong>No specific details provided about the dogs.</strong><br>Please contact customer for more information before visit.'}
                </div>
            </div>
            ` : ''}
            
            <!-- Customer Information -->
            <div class="section">
                <h2><span>👤</span> Customer Information</h2>
                <div class="info-row">
                    <div class="info-label">Name:</div>
                    <div class="info-value">${this.escapeHtml(data.customer.firstName)} ${this.escapeHtml(data.customer.lastName)}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Email:</div>
                    <div class="info-value"><a href="mailto:${data.customer.email}">${data.customer.email}</a></div>
                </div>
                <div class="info-row">
                    <div class="info-label">Phone:</div>
                    <div class="info-value"><a href="tel:${data.customer.contactNumber}">${this.formatPhoneNumber(data.customer.contactNumber)}</a></div>
                </div>
                <div class="info-row">
                    <div class="info-label">Poolbrain ID:</div>
                    <div class="info-value">#${poolbrainId}</div>
                </div>
            </div>
            
            <!-- Property Information -->
            <div class="section">
                <h2><span>📍</span> Property Information</h2>
                <div class="info-row">
                    <div class="info-label">Address:</div>
                    <div class="info-value">${this.escapeHtml(data.address.address)}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">City:</div>
                    <div class="info-value">${this.escapeHtml(data.address.city)}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">State:</div>
                    <div class="info-value">${data.address.state}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Zip Code:</div>
                    <div class="info-value">${data.address.zipCode}</div>
                </div>
                ${data.address.gateCode ? `
                <div class="info-row">
                    <div class="info-label">Gate Code:</div>
                    <div class="info-value"><strong>${this.escapeHtml(data.address.gateCode)}</strong></div>
                </div>
                ` : ''}
                ${data.address.accessNotes ? `
                <div class="info-row">
                    <div class="info-label">Access Notes:</div>
                    <div class="info-value">${this.escapeHtml(data.address.accessNotes)}</div>
                </div>
                ` : ''}
            </div>
            
            <!-- Pool Information -->
            <div class="section">
                <h2><span>🏊</span> Pool Information</h2>
                ${data.waterBodies.map((pool: any, index: number) => `
                <div class="water-body-item">
                    <h3>Water Body ${index + 1}: ${this.escapeHtml(pool.waterBodyName)}</h3>
                    <div class="info-row">
                        <div class="info-label">Type:</div>
                        <div class="info-value">${this.getPoolTypeName(pool.waterBodyType)}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Size:</div>
                        <div class="info-value">${pool.waterBodyGallons.toLocaleString()} gallons</div>
                    </div>
                    ${pool.concerns ? `
                    <div class="info-row">
                        <div class="info-label">Concerns:</div>
                        <div class="info-value">${this.escapeHtml(pool.concerns)}</div>
                    </div>
                    ` : ''}
                </div>
                `).join('')}
            </div>
            
            ${data.metadata.currentServiceDay ? `
            <!-- Current Service -->
            <div class="section">
                <h2><span>📅</span> Current Pool Service</h2>
                <div class="info-row">
                    <div class="info-label">Service Day:</div>
                    <div class="info-value"><strong>${data.metadata.currentServiceDay}</strong></div>
                </div>
            </div>
            ` : ''}
            
            ${data.metadata.additionalComments ? `
            <!-- Additional Comments -->
            <div class="section">
                <h2><span>💬</span> Additional Comments from Customer</h2>
                <p>${this.escapeHtml(data.metadata.additionalComments)}</p>
            </div>
            ` : ''}
            
            <!-- Action Items -->
            <div class="action-items">
                <h2><span>⚡</span> Required Actions</h2>
                <ol>
                    <li>Review all customer information and special requirements</li>
                    <li>Check technician availability for the area</li>
                    <li>Create job in Poolbrain and assign to appropriate route</li>
                    <li>Contact customer to confirm appointment time</li>
                    ${data.address.hasDogs === 'yes' ? '<li><strong>Brief technician about dogs on property - SAFETY FIRST</strong></li>' : ''}
                    ${data.address.gateCode ? '<li>Ensure technician has gate code before visit</li>' : ''}
                </ol>
            </div>
            
            <!-- Quick Actions -->
            <div style="text-align: center; margin: 30px 0;">
                <a href="https://app.poolbrain.com/customers/${poolbrainId}" class="button">View in Poolbrain</a>
                <a href="mailto:${data.customer.email}" class="button">Email Customer</a>
                <a href="tel:${data.customer.contactNumber}" class="button">Call Customer</a>
            </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <p>This is an automated notification from Clarity Pool Services Booking System</p>
            <p>Sent to Front channel: ${process.env.FRONT_CHANNEL_EMAIL}</p>
            <p>Do not reply directly to this email</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  private generateTextEmail(data: any, poolbrainId: number): string {
    const currentDate = new Date().toLocaleDateString('en-US');
    const currentTime = new Date().toLocaleTimeString('en-US');

    return `
NEW POOL ANALYSIS RESERVATION
==============================
Received: ${currentDate} at ${currentTime}

${data.address.hasDogs === 'yes' ? `
⚠️ DOG ALERT - PROPERTY HAS DOGS ⚠️
${data.address.dogDetails || 'No specific details provided. Contact customer for more information.'}
==============================

` : ''}
CUSTOMER INFORMATION
--------------------
Name: ${data.customer.firstName} ${data.customer.lastName}
Email: ${data.customer.email}
Phone: ${this.formatPhoneNumber(data.customer.contactNumber)}
Poolbrain ID: #${poolbrainId}

PROPERTY INFORMATION
--------------------
Address: ${data.address.address}
City: ${data.address.city}
State: ${data.address.state}
Zip Code: ${data.address.zipCode}
${data.address.gateCode ? `Gate Code: ${data.address.gateCode}` : ''}
${data.address.accessNotes ? `Access Notes: ${data.address.accessNotes}` : ''}

POOL INFORMATION
----------------
${data.waterBodies.map((pool: any, index: number) => `
Water Body ${index + 1}: ${pool.waterBodyName}
Type: ${this.getPoolTypeName(pool.waterBodyType)}
Size: ${pool.waterBodyGallons.toLocaleString()} gallons
${pool.concerns ? `Concerns: ${pool.concerns}` : ''}
`).join('\n')}

${data.metadata.currentServiceDay ? `
CURRENT SERVICE
---------------
Service Day: ${data.metadata.currentServiceDay}
` : ''}

${data.metadata.additionalComments ? `
ADDITIONAL COMMENTS
-------------------
${data.metadata.additionalComments}
` : ''}

REQUIRED ACTIONS
----------------
1. Review all customer information and special requirements
2. Check technician availability for the area
3. Create job in Poolbrain and assign to appropriate route
4. Contact customer to confirm appointment time
${data.address.hasDogs === 'yes' ? '5. BRIEF TECHNICIAN ABOUT DOGS ON PROPERTY - SAFETY FIRST' : ''}
${data.address.gateCode ? '6. Ensure technician has gate code before visit' : ''}

QUICK LINKS
-----------
View in Poolbrain: https://app.poolbrain.com/customers/${poolbrainId}
Email Customer: mailto:${data.customer.email}
Call Customer: tel:${data.customer.contactNumber}

==============================
This is an automated notification from Clarity Pool Services
Do not reply directly to this email
    `;
  }

  private escapeHtml(text: string): string {
    if (!text) return '';
    
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  private formatPhoneNumber(phone: string): string {
    if (!phone) return '';
    
    const cleaned = phone.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    
    return phone;
  }

  private getPoolTypeName(type: number): string {
    const types: { [key: number]: string } = {
      1: 'In-ground Pool',
      2: 'Above-ground Pool',
      3: 'Spa/Hot Tub',
      4: 'Fountain',
      5: 'Other Water Feature'
    };
    
    return types[type] || 'Unknown';
  }
}