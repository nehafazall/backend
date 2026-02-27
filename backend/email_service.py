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
