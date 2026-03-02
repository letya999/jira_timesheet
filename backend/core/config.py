
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Jira Timesheet API"
    DATABASE_URL: str
    REDIS_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days

    JIRA_URL: str
    JIRA_EMAIL: str
    JIRA_API_TOKEN: str

    # Business Logic Settings
    DEFAULT_HOURS_PER_DAY: float = 8.0
    MIN_HOURS_PER_DAY: float = 0.0
    MAX_HOURS_PER_DAY: float = 24.0

    # Rate Limiting Settings
    RATE_LIMIT_WINDOW_SECONDS: int = 60
    RATE_LIMIT_MAX_REQUESTS: int = 100

    # Frontend Settings (passed via /health or dedicated endpoint)
    POLLING_INTERVAL_MS: int = 5000

    # Slack Integration
    SLACK_BOT_TOKEN: str | None = None
    SLACK_SIGNING_SECRET: str | None = None
    SLACK_NOTIFICATIONS_CHANNEL: str | None = None

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding='utf-8', extra='ignore')

settings = Settings()
