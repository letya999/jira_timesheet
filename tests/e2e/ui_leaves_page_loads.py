from playwright.sync_api import Page

def test_leaves_page_loads(page: Page):
    # Navigate directly to the Leave Requests page
    page.goto("http://localhost:8501/Leave_Requests")
    page.wait_for_timeout(3000)

    # Check if Streamlit app container rendered
    assert page.locator(".stApp").is_visible()

    # We could check for text but it depends on auth state
    body_text = page.locator("body").inner_text()
    assert len(body_text) > 0
