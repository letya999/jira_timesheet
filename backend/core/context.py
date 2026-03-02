from contextvars import ContextVar

# Context variable to store the current user ID for auditing purposes
user_id_ctx: ContextVar[int | None] = ContextVar("user_id_ctx", default=None)
ip_address_ctx: ContextVar[str | None] = ContextVar("ip_address_ctx", default=None)
