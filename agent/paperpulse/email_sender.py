import os
import requests
from typing import List, Dict
from datetime import datetime
from jinja2 import Template
import logging

logger = logging.getLogger(__name__)

EMAIL_TEMPLATE = """<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PaperPulse Daily Digest</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
            color: #1a1a1a;
            border-bottom: 3px solid #6366f1;
            padding-bottom: 10px;
            margin-bottom: 30px;
        }
        .paper {
            margin-bottom: 30px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #6366f1;
        }
        .paper-title {
            font-size: 18px;
            font-weight: 600;
            color: #1a1a1a;
            margin-bottom: 10px;
        }
        .paper-meta {
            font-size: 14px;
            color: #666;
            margin-bottom: 15px;
        }
        .paper-summary {
            color: #333;
            margin-bottom: 15px;
        }
        .paper-links a {
            color: #6366f1;
            text-decoration: none;
            margin-right: 15px;
            font-weight: 500;
        }
        .paper-links a:hover {
            text-decoration: underline;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            text-align: center;
            color: #666;
            font-size: 14px;
        }
        .footer a {
            color: #6366f1;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📚 Your PaperPulse Digest</h1>
        <p>Hello! Here are today's papers matching your interests:</p>
        
        {% for paper in papers %}
        <div class="paper">
            <div class="paper-title">{{ paper.title }}</div>
            <div class="paper-meta">
                By {{ paper.authors[:3] | join(", ") }}{% if paper.authors|length > 3 %} et al.{% endif %} • 
                {{ paper.published[:10] }}
            </div>
            <div class="paper-summary">{{ paper.summary }}</div>
            <div class="paper-links">
                <a href="{{ paper.url }}">View on arXiv</a>
                {% if include_pdf_link %}
                <a href="{{ paper.pdf_url }}">PDF</a>
                {% endif %}
            </div>
        </div>
        {% endfor %}
        
        <div class="footer">
            <p>You're receiving this because you subscribed to PaperPulse with keywords: {{ keywords | join(", ") }}</p>
            <p><a href="{{ unsubscribe_url }}">Unsubscribe</a> | <a href="{{ settings_url }}">Update preferences</a></p>
        </div>
    </div>
</body>
</html>"""

class EmailSender:
    def __init__(self, api_key: str, from_email: str, from_name: str = "PaperPulse"):
        self.api_key = api_key
        self.from_email = from_email
        self.from_name = from_name
        self.template = Template(EMAIL_TEMPLATE)
    
    def send_digest(
        self, 
        to_email: str, 
        papers: List[Dict], 
        keywords: List[str],
        include_pdf_link: bool = True,
        base_url: str = "https://paperpulse.ai"
    ) -> bool:
        """Send digest email to subscriber using Resend API"""
        try:
            html_content = self.template.render(
                papers=papers,
                keywords=keywords,
                include_pdf_link=include_pdf_link,
                unsubscribe_url=f"{base_url}/unsubscribe?email={to_email}",
                settings_url=f"{base_url}/settings"
            )
            
            # Use Resend API (compatible with our web app)
            response = requests.post(
                'https://api.resend.com/emails',
                headers={
                    'Authorization': f'Bearer {self.api_key}',
                    'Content-Type': 'application/json',
                },
                json={
                    'from': self.from_email,
                    'to': [to_email],
                    'subject': f"PaperPulse: {len(papers)} new papers for {datetime.now().strftime('%B %d')}",
                    'html': html_content,
                }
            )
            
            if response.status_code == 200:
                logger.info(f"Email sent to {to_email} successfully")
                return True
            else:
                logger.error(f"Failed to send email to {to_email}: {response.status_code} - {response.text}")
                return False
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False