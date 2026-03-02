from playwright.sync_api import Page


def test_hr_module_loads(page: Page):
    # Navigate directly to HR Module page
    page.goto("http://localhost:8501/HR_Module")
    page.wait_for_timeout(3000)

    assert page.locator(".stApp").is_visible()
