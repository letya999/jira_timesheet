import pytest
import re
from playwright.sync_api import Page, expect

def test_leaves_page_loads(page: Page):
    # Navigate directly to the Leave Requests page
    page.goto("http://localhost:8501/Leave_Requests")
    page.wait_for_timeout(3000)
    
    # Check if Streamlit app container rendered
    assert page.locator(".stApp").is_visible()
    
    # We could check for text but it depends on auth state
    body_text = page.locator("body").inner_text()
    assert len(body_text) > 0

def test_hr_module_loads(page: Page):
    # Navigate directly to HR Module page
    page.goto("http://localhost:8501/HR_Module")
    page.wait_for_timeout(3000)
    
    assert page.locator(".stApp").is_visible()
