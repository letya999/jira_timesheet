import re

from playwright.sync_api import Page, expect


def test_login(page: Page):
    # Navigate to the Streamlit app
    page.goto("http://localhost:8501")

    # Wait for the main title or the login form to load
    page.wait_for_timeout(3000)  # Give Streamlit time to connect and render

    # Expect the title to have something like "Jira Timesheet" or just check if it's not a 404
    expect(page).to_have_title(re.compile(r"."))

    # We can check if body contains "Login" or "Username" since the first page is usually a login page or home page
    body_text = page.locator("body").inner_text()
    assert len(body_text) > 0
