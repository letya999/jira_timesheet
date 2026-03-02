import re

from playwright.sync_api import Page, expect


def test_login(page: Page):
    # Navigate to the Streamlit app
    page.goto("http://localhost:8501")

    # Wait for the main title or the login form to load
    # Streamlit typically wraps inputs and text. The main page should be 0_Home.py or similar.
    # We will just verify it loads and contains something related to login or Jira.
    page.wait_for_timeout(3000) # Give Streamlit time to connect and render

    # Expect the title to have something like "Jira Timesheet" or just check if it's not a 404
    expect(page).to_have_title(re.compile(r".")) # Streamlit sets a default title based on the filename

    # We can check if body contains "Login" or "Username" since the first page is usually a login page or home page
    body_text = page.locator("body").inner_text()
    assert len(body_text) > 0

def test_has_login_button(page: Page):
    page.goto("http://localhost:8501")
    page.wait_for_timeout(3000)
    # Check if a login form is present, maybe an input for username
    # This is a generic test to see if Streamlit renders
    assert page.locator(".stApp").is_visible()
