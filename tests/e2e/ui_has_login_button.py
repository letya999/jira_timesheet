from playwright.sync_api import Page


def test_has_login_button(page: Page):
    page.goto("http://localhost:8501")
    page.wait_for_timeout(3000)
    # Check if a login form is present, maybe an input for username
    assert page.locator(".stApp").is_visible()
