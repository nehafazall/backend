"""
Email Service Module for CLT Synapse ERP
Handles SMTP email sending for notifications
"""

import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, List
from datetime import datetime
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
load_dotenv(Path(__file__).parent / '.env')

logger = logging.getLogger(__name__)

def get_smtp_config():
    """Get SMTP configuration from environment"""
    return {
        "host": os.environ.get("SMTP_HOST", "smtp.gmail.com"),
        "port": int(os.environ.get("SMTP_PORT", "587")),
        "user": os.environ.get("SMTP_USER", ""),
        "password": os.environ.get("SMTP_PASSWORD", ""),
        "from_name": os.environ.get("SMTP_FROM_NAME", "CLT Synapse")
    }

def is_email_configured() -> bool:
    """Check if email is properly configured"""
    config = get_smtp_config()
    return bool(config["user"] and config["password"])

def send_email(
    to_email: str,
    subject: str,
    html_content: str,
    plain_content: Optional[str] = None,
    cc: Optional[List[str]] = None
) -> bool:
    """
    Send an email via SMTP
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        html_content: HTML body of the email
        plain_content: Plain text fallback (optional)
        cc: List of CC recipients (optional)
    
    Returns:
        True if email sent successfully, False otherwise
    """
    if not is_email_configured():
        logger.warning("Email not configured. Skipping email send.")
        return False
    
    config = get_smtp_config()
    
    try:
        # Create message
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{config['from_name']} <{config['user']}>"
        msg["To"] = to_email
        
        if cc:
            msg["Cc"] = ", ".join(cc)
        
        # Add plain text version
        if plain_content:
            msg.attach(MIMEText(plain_content, "plain"))
        
        # Add HTML version
        msg.attach(MIMEText(html_content, "html"))
        
        # Send email
        with smtplib.SMTP(config['host'], config['port']) as server:
            server.starttls()
            server.login(config['user'], config['password'])
            
            recipients = [to_email]
            if cc:
                recipients.extend(cc)
            
            server.sendmail(config['user'], recipients, msg.as_string())
        
        logger.info(f"Email sent successfully to {to_email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        return False

# Email Templates

def get_leave_request_template(
    employee_name: str,
    leave_type: str,
    start_date: str,
    end_date: str,
    total_days: float,
    reason: str,
    approver_name: str
) -> str:
    """Generate HTML template for leave request notification to approver"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #14b8a6, #0d9488); color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
            .content {{ background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }}
            .footer {{ background: #1f2937; color: #9ca3af; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; }}
            .detail-row {{ display: flex; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }}
            .detail-label {{ font-weight: bold; width: 140px; color: #6b7280; }}
            .detail-value {{ flex: 1; }}
            .badge {{ display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }}
            .badge-pending {{ background: #fef3c7; color: #92400e; }}
            .reason-box {{ background: white; padding: 15px; border-radius: 8px; margin-top: 15px; border-left: 4px solid #14b8a6; }}
            .action-btn {{ display: inline-block; padding: 12px 24px; background: #14b8a6; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2 style="margin: 0;">New Leave Request</h2>
                <p style="margin: 5px 0 0 0; opacity: 0.9;">Requires your approval</p>
            </div>
            <div class="content">
                <p>Dear {approver_name},</p>
                <p>A new leave request has been submitted and requires your approval:</p>
                
                <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <div class="detail-row">
                        <span class="detail-label">Employee</span>
                        <span class="detail-value"><strong>{employee_name}</strong></span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Leave Type</span>
                        <span class="detail-value">{leave_type}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">From</span>
                        <span class="detail-value">{start_date}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">To</span>
                        <span class="detail-value">{end_date}</span>
                    </div>
                    <div class="detail-row" style="border-bottom: none;">
                        <span class="detail-label">Total Days</span>
                        <span class="detail-value"><strong>{total_days}</strong> day(s)</span>
                    </div>
                </div>
                
                <div class="reason-box">
                    <strong>Reason:</strong><br>
                    {reason}
                </div>
                
                <p style="margin-top: 20px;">Please login to CLT Synapse to review and take action on this request.</p>
            </div>
            <div class="footer">
                <p>CLT Synapse ERP - Human Resources</p>
                <p>This is an automated notification. Please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    """

def get_leave_status_template(
    employee_name: str,
    leave_type: str,
    start_date: str,
    end_date: str,
    status: str,
    approver_name: str,
    comments: Optional[str] = None
) -> str:
    """Generate HTML template for leave status notification to employee"""
    status_color = "#10b981" if status == "approved" else "#ef4444" if status == "rejected" else "#f59e0b"
    status_text = status.upper()
    
    comments_html = ""
    if comments:
        comments_html = f"""
        <div class="reason-box" style="border-left-color: {status_color};">
            <strong>Comments from {approver_name}:</strong><br>
            {comments}
        </div>
        """
    
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, {status_color}, {status_color}dd); color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
            .content {{ background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }}
            .footer {{ background: #1f2937; color: #9ca3af; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; }}
            .detail-row {{ display: flex; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }}
            .detail-label {{ font-weight: bold; width: 140px; color: #6b7280; }}
            .detail-value {{ flex: 1; }}
            .status-badge {{ display: inline-block; padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: bold; background: {status_color}22; color: {status_color}; }}
            .reason-box {{ background: white; padding: 15px; border-radius: 8px; margin-top: 15px; border-left: 4px solid {status_color}; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2 style="margin: 0;">Leave Request {status_text}</h2>
                <p style="margin: 5px 0 0 0; opacity: 0.9;">Your leave request has been processed</p>
            </div>
            <div class="content">
                <p>Dear {employee_name},</p>
                <p>Your leave request has been <span class="status-badge">{status_text}</span> by {approver_name}.</p>
                
                <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <div class="detail-row">
                        <span class="detail-label">Leave Type</span>
                        <span class="detail-value">{leave_type}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">From</span>
                        <span class="detail-value">{start_date}</span>
                    </div>
                    <div class="detail-row" style="border-bottom: none;">
                        <span class="detail-label">To</span>
                        <span class="detail-value">{end_date}</span>
                    </div>
                </div>
                
                {comments_html}
                
                <p style="margin-top: 20px;">You can view the full details in your CLT Synapse SSHR portal.</p>
            </div>
            <div class="footer">
                <p>CLT Synapse ERP - Human Resources</p>
                <p>This is an automated notification. Please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    """

def get_regularization_request_template(
    employee_name: str,
    date: str,
    original_in: str,
    original_out: str,
    requested_in: str,
    requested_out: str,
    reason: str,
    approver_name: str
) -> str:
    """Generate HTML template for regularization request notification to approver"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
            .content {{ background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }}
            .footer {{ background: #1f2937; color: #9ca3af; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; }}
            .time-comparison {{ display: flex; gap: 20px; margin: 15px 0; }}
            .time-box {{ flex: 1; background: white; padding: 15px; border-radius: 8px; text-align: center; }}
            .time-box.original {{ border: 2px solid #e5e7eb; }}
            .time-box.requested {{ border: 2px solid #f59e0b; }}
            .time-label {{ font-size: 12px; color: #6b7280; margin-bottom: 5px; }}
            .time-value {{ font-size: 18px; font-weight: bold; }}
            .arrow {{ display: flex; align-items: center; justify-content: center; font-size: 24px; color: #f59e0b; }}
            .reason-box {{ background: white; padding: 15px; border-radius: 8px; margin-top: 15px; border-left: 4px solid #f59e0b; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2 style="margin: 0;">Attendance Regularization Request</h2>
                <p style="margin: 5px 0 0 0; opacity: 0.9;">Requires your approval</p>
            </div>
            <div class="content">
                <p>Dear {approver_name},</p>
                <p><strong>{employee_name}</strong> has submitted an attendance regularization request for <strong>{date}</strong>:</p>
                
                <h4 style="margin: 20px 0 10px 0; color: #374151;">Check-In Time</h4>
                <div class="time-comparison">
                    <div class="time-box original">
                        <div class="time-label">Original</div>
                        <div class="time-value">{original_in or '--:--'}</div>
                    </div>
                    <div class="arrow">→</div>
                    <div class="time-box requested">
                        <div class="time-label">Requested</div>
                        <div class="time-value" style="color: #f59e0b;">{requested_in}</div>
                    </div>
                </div>
                
                <h4 style="margin: 20px 0 10px 0; color: #374151;">Check-Out Time</h4>
                <div class="time-comparison">
                    <div class="time-box original">
                        <div class="time-label">Original</div>
                        <div class="time-value">{original_out or '--:--'}</div>
                    </div>
                    <div class="arrow">→</div>
                    <div class="time-box requested">
                        <div class="time-label">Requested</div>
                        <div class="time-value" style="color: #f59e0b;">{requested_out}</div>
                    </div>
                </div>
                
                <div class="reason-box">
                    <strong>Reason for Regularization:</strong><br>
                    {reason}
                </div>
                
                <p style="margin-top: 20px;">Please login to CLT Synapse to review and take action on this request.</p>
            </div>
            <div class="footer">
                <p>CLT Synapse ERP - Human Resources</p>
                <p>This is an automated notification. Please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    """

def get_regularization_status_template(
    employee_name: str,
    date: str,
    status: str,
    approver_name: str,
    comments: Optional[str] = None
) -> str:
    """Generate HTML template for regularization status notification to employee"""
    status_color = "#10b981" if status == "approved" else "#ef4444" if status == "rejected" else "#f59e0b"
    status_text = status.upper()
    
    comments_html = ""
    if comments:
        comments_html = f"""
        <div style="background: white; padding: 15px; border-radius: 8px; margin-top: 15px; border-left: 4px solid {status_color};">
            <strong>Comments from {approver_name}:</strong><br>
            {comments}
        </div>
        """
    
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, {status_color}, {status_color}dd); color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
            .content {{ background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }}
            .footer {{ background: #1f2937; color: #9ca3af; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; }}
            .status-badge {{ display: inline-block; padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: bold; background: {status_color}22; color: {status_color}; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2 style="margin: 0;">Regularization Request {status_text}</h2>
                <p style="margin: 5px 0 0 0; opacity: 0.9;">Your attendance regularization has been processed</p>
            </div>
            <div class="content">
                <p>Dear {employee_name},</p>
                <p>Your attendance regularization request for <strong>{date}</strong> has been <span class="status-badge">{status_text}</span> by {approver_name}.</p>
                
                {comments_html}
                
                <p style="margin-top: 20px;">You can view the full details in your CLT Synapse SSHR portal.</p>
            </div>
            <div class="footer">
                <p>CLT Synapse ERP - Human Resources</p>
                <p>This is an automated notification. Please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    """

# SLA Breach Email Templates

def get_sla_breach_alert_template(
    lead_name: str,
    lead_phone: str,
    lead_email: str,
    lead_source: str,
    assigned_to: str,
    sla_status: str,
    time_elapsed: str,
    sla_threshold: str
) -> str:
    """Generate HTML template for SLA breach notification"""
    status_color = "#ef4444" if sla_status == "breached" else "#f59e0b"
    
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, {status_color}, {status_color}cc); color: white; padding: 25px; border-radius: 12px 12px 0 0; }}
            .header h2 {{ margin: 0; font-size: 24px; }}
            .header p {{ margin: 5px 0 0 0; opacity: 0.9; }}
            .content {{ background: white; padding: 25px; border: 1px solid #e5e7eb; }}
            .footer {{ background: #1f2937; color: #9ca3af; padding: 15px; text-align: center; border-radius: 0 0 12px 12px; font-size: 12px; }}
            .alert-badge {{ display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: bold; background: {status_color}22; color: {status_color}; text-transform: uppercase; }}
            .lead-card {{ background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid {status_color}; }}
            .lead-detail {{ display: flex; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }}
            .lead-detail:last-child {{ border-bottom: none; }}
            .label {{ font-weight: 600; color: #6b7280; width: 120px; }}
            .value {{ flex: 1; color: #111827; }}
            .time-warning {{ background: {status_color}11; border: 1px solid {status_color}33; border-radius: 8px; padding: 15px; margin-top: 15px; }}
            .time-warning strong {{ color: {status_color}; }}
            .action-btn {{ display: inline-block; padding: 12px 28px; background: {status_color}; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 20px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <span class="alert-badge">⚠️ SLA {sla_status.upper()}</span>
                <h2 style="margin-top: 15px;">Lead Requires Immediate Attention</h2>
                <p>A lead has exceeded the SLA threshold</p>
            </div>
            <div class="content">
                <div class="lead-card">
                    <div class="lead-detail">
                        <span class="label">Lead Name</span>
                        <span class="value"><strong>{lead_name}</strong></span>
                    </div>
                    <div class="lead-detail">
                        <span class="label">Phone</span>
                        <span class="value">{lead_phone}</span>
                    </div>
                    <div class="lead-detail">
                        <span class="label">Email</span>
                        <span class="value">{lead_email or 'N/A'}</span>
                    </div>
                    <div class="lead-detail">
                        <span class="label">Source</span>
                        <span class="value">{lead_source}</span>
                    </div>
                    <div class="lead-detail">
                        <span class="label">Assigned To</span>
                        <span class="value">{assigned_to}</span>
                    </div>
                </div>
                
                <div class="time-warning">
                    <strong>⏱️ Time Elapsed: {time_elapsed}</strong><br>
                    <span style="color: #6b7280;">SLA Threshold: {sla_threshold}</span>
                </div>
                
                <p style="margin-top: 20px; color: #6b7280;">
                    Please take immediate action to contact this lead. Prolonged delays may result in lost business opportunities.
                </p>
                
                <a href="#" class="action-btn">View Lead in CRM →</a>
            </div>
            <div class="footer">
                <p>CLT Synapse ERP - Sales CRM</p>
                <p>This is an automated SLA alert. Please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    """

def get_daily_finance_report_template(
    report_date: str,
    sales_today: float,
    sales_today_count: int,
    sales_this_month: float,
    sales_this_month_count: int,
    treasury_balance: float,
    bank_accounts: list,
    total_expenses: float,
    expenses_this_month: float,
    pending_settlements: float,
    pending_verifications: int,
    top_sales_reps: list,
    currency: str = "AED"
) -> str:
    """Generate HTML template for daily finance report"""
    
    # Format numbers
    def fmt(n):
        return f"{n:,.2f}"
    
    # Bank accounts rows
    bank_rows = ""
    for bank in bank_accounts:
        bank_rows += f"""
        <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">{bank.get('bank_name', 'N/A')}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">{bank.get('account_name', 'N/A')}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; color: #10b981;">
                {currency} {fmt(bank.get('current_balance', bank.get('opening_balance', 0)))}
            </td>
        </tr>
        """
    
    # Top sales reps rows
    sales_rows = ""
    for i, rep in enumerate(top_sales_reps[:5], 1):
        sales_rows += f"""
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">{i}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">{rep.get('name', 'N/A')}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">{rep.get('enrollments', 0)}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #10b981;">
                {currency} {fmt(rep.get('revenue', 0))}
            </td>
        </tr>
        """
    
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #1f2937; background: #f3f4f6; margin: 0; padding: 0; }}
            .container {{ max-width: 700px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 30px; border-radius: 16px 16px 0 0; text-align: center; }}
            .header h1 {{ margin: 0; font-size: 28px; font-weight: 700; }}
            .header p {{ margin: 8px 0 0 0; opacity: 0.9; font-size: 14px; }}
            .content {{ background: white; padding: 30px; }}
            .footer {{ background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; border-radius: 0 0 16px 16px; font-size: 12px; }}
            
            .metric-grid {{ display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }}
            .metric-card {{ background: #f9fafb; border-radius: 12px; padding: 20px; border: 1px solid #e5e7eb; }}
            .metric-card.highlight {{ background: linear-gradient(135deg, #10b98111, #10b98105); border-color: #10b98133; }}
            .metric-card.warning {{ background: linear-gradient(135deg, #f59e0b11, #f59e0b05); border-color: #f59e0b33; }}
            .metric-card.danger {{ background: linear-gradient(135deg, #ef444411, #ef444405); border-color: #ef444433; }}
            .metric-label {{ font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }}
            .metric-value {{ font-size: 28px; font-weight: 700; margin-top: 5px; }}
            .metric-value.green {{ color: #10b981; }}
            .metric-value.amber {{ color: #f59e0b; }}
            .metric-value.red {{ color: #ef4444; }}
            .metric-sub {{ font-size: 12px; color: #9ca3af; margin-top: 5px; }}
            
            .section {{ margin: 25px 0; }}
            .section-title {{ font-size: 16px; font-weight: 700; color: #374151; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb; }}
            
            table {{ width: 100%; border-collapse: collapse; }}
            th {{ background: #f9fafb; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280; font-weight: 600; }}
            
            .summary-box {{ background: linear-gradient(135deg, #1f2937, #111827); color: white; border-radius: 12px; padding: 25px; margin-top: 25px; }}
            .summary-title {{ font-size: 14px; opacity: 0.8; margin-bottom: 10px; }}
            .summary-value {{ font-size: 36px; font-weight: 700; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📊 Daily Finance Report</h1>
                <p>{report_date}</p>
            </div>
            
            <div class="content">
                <!-- Key Metrics -->
                <div class="metric-grid">
                    <div class="metric-card highlight">
                        <div class="metric-label">Sales Today</div>
                        <div class="metric-value green">{currency} {fmt(sales_today)}</div>
                        <div class="metric-sub">{sales_today_count} enrollment(s)</div>
                    </div>
                    <div class="metric-card highlight">
                        <div class="metric-label">Sales This Month</div>
                        <div class="metric-value green">{currency} {fmt(sales_this_month)}</div>
                        <div class="metric-sub">{sales_this_month_count} enrollment(s)</div>
                    </div>
                    <div class="metric-card warning">
                        <div class="metric-label">Pending Settlements</div>
                        <div class="metric-value amber">{currency} {fmt(pending_settlements)}</div>
                        <div class="metric-sub">Awaiting bank settlement</div>
                    </div>
                    <div class="metric-card danger">
                        <div class="metric-label">Total Expenses (MTD)</div>
                        <div class="metric-value red">{currency} {fmt(expenses_this_month)}</div>
                        <div class="metric-sub">Month to date</div>
                    </div>
                </div>
                
                <!-- Treasury Balance -->
                <div class="summary-box">
                    <div class="summary-title">💰 Total Treasury Balance</div>
                    <div class="summary-value">{currency} {fmt(treasury_balance)}</div>
                </div>
                
                <!-- Bank Accounts -->
                <div class="section">
                    <div class="section-title">🏦 Bank Account Balances</div>
                    <table>
                        <thead>
                            <tr>
                                <th>Bank</th>
                                <th>Account</th>
                                <th style="text-align: right;">Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bank_rows if bank_rows else '<tr><td colspan="3" style="padding: 20px; text-align: center; color: #9ca3af;">No bank accounts configured</td></tr>'}
                        </tbody>
                    </table>
                </div>
                
                <!-- Top Performers -->
                <div class="section">
                    <div class="section-title">🏆 Top Sales Performers (This Month)</div>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 40px;">#</th>
                                <th>Sales Executive</th>
                                <th style="text-align: center;">Enrollments</th>
                                <th style="text-align: right;">Revenue</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sales_rows if sales_rows else '<tr><td colspan="4" style="padding: 20px; text-align: center; color: #9ca3af;">No sales data available</td></tr>'}
                        </tbody>
                    </table>
                </div>
                
                <!-- Pending Actions -->
                {f'''
                <div class="section" style="background: #fef3c7; border-radius: 8px; padding: 15px; border: 1px solid #fcd34d;">
                    <strong style="color: #92400e;">⚠️ Action Required:</strong>
                    <span style="color: #78350f;"> {pending_verifications} payment verification(s) pending approval</span>
                </div>
                ''' if pending_verifications > 0 else ''}
                
                <p style="margin-top: 25px; color: #6b7280; font-size: 13px; text-align: center;">
                    This report is automatically generated. For detailed analysis, please login to CLT Synapse ERP.
                </p>
            </div>
            
            <div class="footer">
                <p><strong>CLT Synapse ERP</strong> - Finance & Accounting</p>
                <p>Generated on {report_date} at 12:00 AM UAE Time</p>
                <p style="margin-top: 10px;">© 2026 CLT Academy. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """

# Async wrapper for sending emails (to be used in FastAPI)
async def send_email_async(
    to_email: str,
    subject: str,
    html_content: str,
    plain_content: Optional[str] = None,
    cc: Optional[List[str]] = None
) -> bool:
    """Async wrapper for send_email"""
    import asyncio
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, send_email, to_email, subject, html_content, plain_content, cc)


def get_employee_welcome_template(
    employee_name: str,
    employee_email: str,
    password: str,
    employee_id: str,
    joining_date: str,
    tenure_text: str,
    designation: str,
    department: str,
    role: str,
    hr_manager_name: str = "HR Team",
    hr_phone: str = ""
) -> str:
    """
    Generate welcome email template for new employees
    
    Args:
        employee_name: Full name of the employee
        employee_email: Company email (login ID)
        password: Initial password
        employee_id: Employee ID
        joining_date: Date of joining
        tenure_text: Human readable tenure (e.g., "Just joined" or "2 months")
        designation: Job title
        department: Department name
        role: System role
        hr_manager_name: Name of HR Manager
        hr_phone: HR phone number
    """
    # Format joining date nicely
    try:
        from datetime import datetime as dt
        join_dt = dt.fromisoformat(joining_date.replace('Z', '+00:00')) if 'T' in joining_date else dt.strptime(joining_date, '%Y-%m-%d')
        formatted_date = join_dt.strftime('%B %d, %Y')
    except:
        formatted_date = joining_date
    
    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to CLT Synapse</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <!-- Header with Logo -->
            <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 40px 30px; text-align: center;">
                <img src="https://clt-academy.com/wp-content/uploads/2023/07/CLT-Academy-Logo-1.png" alt="CLT Logo" style="height: 60px; margin-bottom: 20px;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Welcome to CLT Synapse</h1>
                <p style="color: #94a3b8; margin: 10px 0 0 0; font-size: 14px; letter-spacing: 1px;">AN CLT ECO SYSTEM</p>
            </div>
            
            <!-- Main Content -->
            <div style="padding: 40px 30px;">
                <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    Dear <strong>{employee_name}</strong>,
                </p>
                
                <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    We are thrilled to welcome you to the CLT family! Your journey with us begins today, 
                    and we're excited to have you on board.
                </p>
                
                <!-- Account Credentials Card -->
                <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid #0ea5e9;">
                    <h3 style="color: #0369a1; margin: 0 0 15px 0; font-size: 16px; display: flex; align-items: center;">
                        🔐 Your Login Credentials
                    </h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #64748b; font-size: 14px; width: 120px;">User ID:</td>
                            <td style="padding: 8px 0; color: #1e40af; font-size: 14px; font-weight: 600; font-family: 'Courier New', monospace;">{employee_email}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Password:</td>
                            <td style="padding: 8px 0; color: #1e40af; font-size: 14px; font-weight: 600; font-family: 'Courier New', monospace;">{password}</td>
                        </tr>
                    </table>
                    <p style="color: #ef4444; font-size: 12px; margin: 15px 0 0 0; padding: 10px; background: #fef2f2; border-radius: 6px;">
                        ⚠️ Please change your password after first login for security.
                    </p>
                </div>
                
                <!-- Employee Details Card -->
                <div style="background: #f8fafc; border-radius: 12px; padding: 25px; margin: 25px 0; border: 1px solid #e2e8f0;">
                    <h3 style="color: #334155; margin: 0 0 15px 0; font-size: 16px;">
                        📋 Your Employment Details
                    </h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 10px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #e2e8f0; width: 140px;">Employee ID:</td>
                            <td style="padding: 10px 0; color: #334155; font-size: 14px; border-bottom: 1px solid #e2e8f0; font-weight: 500;">{employee_id}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #e2e8f0;">Date of Joining:</td>
                            <td style="padding: 10px 0; color: #334155; font-size: 14px; border-bottom: 1px solid #e2e8f0; font-weight: 500;">{formatted_date}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #e2e8f0;">Tenure:</td>
                            <td style="padding: 10px 0; color: #334155; font-size: 14px; border-bottom: 1px solid #e2e8f0; font-weight: 500;">
                                <span style="background: #dcfce7; color: #166534; padding: 3px 10px; border-radius: 12px; font-size: 12px;">{tenure_text}</span>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #e2e8f0;">Department:</td>
                            <td style="padding: 10px 0; color: #334155; font-size: 14px; border-bottom: 1px solid #e2e8f0; font-weight: 500;">{department}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #e2e8f0;">Designation:</td>
                            <td style="padding: 10px 0; color: #334155; font-size: 14px; border-bottom: 1px solid #e2e8f0; font-weight: 500;">{designation}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; color: #64748b; font-size: 14px;">System Role:</td>
                            <td style="padding: 10px 0; color: #334155; font-size: 14px; font-weight: 500;">
                                <span style="background: #dbeafe; color: #1e40af; padding: 3px 10px; border-radius: 12px; font-size: 12px;">{role.replace('_', ' ').title()}</span>
                            </td>
                        </tr>
                    </table>
                </div>
                
                <!-- Login Button -->
                <div style="text-align: center; margin: 30px 0;">
                    <a href="https://hr-sync-dashboard.preview.emergentagent.com/login" 
                       style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 14px rgba(14, 165, 233, 0.3);">
                        Login to CLT Synapse →
                    </a>
                </div>
                
                <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0; text-align: center;">
                    If you have any questions, feel free to reach out to the HR team.
                </p>
            </div>
            
            <!-- HR Signature -->
            <div style="background: #f1f5f9; padding: 25px 30px; border-top: 1px solid #e2e8f0;">
                <p style="color: #334155; font-size: 14px; margin: 0 0 5px 0;">Best Regards,</p>
                <p style="color: #1e3a5f; font-size: 16px; font-weight: 600; margin: 0 0 3px 0;">{hr_manager_name}</p>
                <p style="color: #64748b; font-size: 13px; margin: 0 0 10px 0;">HR Manager</p>
                <div style="border-top: 1px solid #e2e8f0; padding-top: 10px; margin-top: 10px;">
                    <p style="color: #64748b; font-size: 12px; margin: 0;">
                        📧 <a href="mailto:hr@clt-academy.com" style="color: #0ea5e9; text-decoration: none;">hr@clt-academy.com</a>
                        {f'&nbsp;&nbsp;|&nbsp;&nbsp;📞 {hr_phone}' if hr_phone else ''}
                    </p>
                </div>
            </div>
            
            <!-- Footer -->
            <div style="background: #1e3a5f; padding: 20px 30px; text-align: center;">
                <img src="https://clt-academy.com/wp-content/uploads/2023/07/CLT-Academy-Logo-1.png" alt="CLT Logo" style="height: 35px; margin-bottom: 10px; opacity: 0.9;">
                <p style="color: #94a3b8; font-size: 11px; margin: 0;">
                    © 2026 CLT Academy. All rights reserved.
                </p>
                <p style="color: #64748b; font-size: 10px; margin: 5px 0 0 0;">
                    This is an automated message from CLT Synapse ERP.
                </p>
            </div>
        </div>
    </body>
    </html>
    """
