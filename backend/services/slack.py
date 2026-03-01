import httpx
from typing import Optional, List, Dict, Any
from core.config import settings
import logging

logger = logging.getLogger(__name__)

class SlackService:
    def __init__(self):
        self.base_url = "https://slack.com/api"
        self.headers = {
            "Authorization": f"Bearer {settings.SLACK_BOT_TOKEN}",
            "Content-Type": "application/json"
        }

    async def send_message(self, channel: str, text: str, blocks: Optional[List[Dict]] = None) -> bool:
        if not settings.SLACK_BOT_TOKEN:
            logger.warning("Slack bot token not configured")
            return False
            
        payload = {
            "channel": channel,
            "text": text
        }
        if blocks:
            payload["blocks"] = blocks
            
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{self.base_url}/chat.postMessage", json=payload, headers=self.headers)
            data = response.json()
            if not data.get("ok"):
                logger.error(f"Slack API error: {data.get('error')}")
                return False
            return True

    async def send_leave_request_notification(
        self, 
        user_name: str, 
        leave_type: str, 
        start_date: str, 
        end_date: str, 
        reason: str,
        leave_id: int
    ):
        """Sends an interactive leave request to the configured Slack channel."""
        if not settings.SLACK_NOTIFICATIONS_CHANNEL:
            return False
            
        text = f"New Leave Request from {user_name}"
        blocks = [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"👤 *{user_name}* requested a *{leave_type}*"
                }
            },
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"*Start:* {start_date}"},
                    {"type": "mrkdwn", "text": f"*End:* {end_date}"}
                ]
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*Reason:* {reason or 'No reason provided'}"
                }
            },
            {
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {"type": "plain_text", "text": "Approve"},
                        "style": "primary",
                        "value": f"approve_{leave_id}",
                        "action_id": "approve_leave"
                    },
                    {
                        "type": "button",
                        "text": {"type": "plain_text", "text": "Reject"},
                        "style": "danger",
                        "value": f"reject_{leave_id}",
                        "action_id": "reject_leave"
                    }
                ]
            }
        ]
        
        return await self.send_message(settings.SLACK_NOTIFICATIONS_CHANNEL, text, blocks)

slack_service = SlackService()
