from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Jira Timesheet API"
    DATABASE_URL: str
    REDIS_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    DEBUG: bool = False

    JIRA_URL: str
    JIRA_EMAIL: str
    JIRA_API_TOKEN: str

    @field_validator("JIRA_URL")
    @classmethod
    def validate_jira_url(cls, v: str) -> str:
        # Strip spaces and trailing slash
        v = v.strip()
        if v.endswith("/"):
            v = v[:-1]
        return v

    @field_validator("JIRA_EMAIL", "JIRA_API_TOKEN")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        return v.strip() if v else v

    # Business Logic Settings
    DEFAULT_HOURS_PER_DAY: float = 8.0
    MIN_HOURS_PER_DAY: float = 0.0
    MAX_HOURS_PER_DAY: float = 24.0

    # Rate Limiting Settings
    RATE_LIMIT_WINDOW_SECONDS: int = 60
    RATE_LIMIT_MAX_REQUESTS: int = 100

    # Frontend Settings (passed via /health or dedicated endpoint)
    POLLING_INTERVAL_MS: int = 5000

    # App Version Info
    APP_VERSION: str = "0.1.0"

    # SSO / OIDC (Authentik)
    AUTHENTIK_CLIENT_ID: str | None = None
    AUTHENTIK_CLIENT_SECRET: str | None = None
    AUTHENTIK_OIDC_URL: str | None = None  # e.g., https://auth.example.com/application/o/jira-timesheet/
    AUTHENTIK_REDIRECT_URI: str | None = None  # e.g., http://localhost:8000/api/v1/auth/sso/callback

    # Slack Integration
    SLACK_BOT_TOKEN: str | None = None
    SLACK_SIGNING_SECRET: str | None = None
    SLACK_NOTIFICATIONS_CHANNEL: str | None = None

    model_config = SettingsConfigDict(
        env_file=(".env", ".env.dev", "../.env", "../.env.dev"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
print(f"DEBUG: Loaded JIRA_URL='{settings.JIRA_URL}' REDIS_URL='{settings.REDIS_URL}'")
