import streamlit as st
import time
from typing import Callable, Optional

def loading_skeleton(height: int = 200, count: int = 1):
    """
    Shows a simple gray skeleton to simulate loading.
    """
    for _ in range(count):
        st.markdown(
            f"""
            <div style="
                background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                background-size: 200% 100%;
                animation: loading 1.5s infinite;
                height: {height}px;
                border-radius: 8px;
                margin-bottom: 10px;
            "></div>
            <style>
                @keyframes loading {{
                    0% {{ background-position: 200% 0; }}
                    100% {{ background-position: -200% 0; }}
                }}
            </style>
            """,
            unsafe_allow_html=True
        )

def error_state(message: str, icon: str = "⚠️"):
    """
    Renders a consistent error state.
    """
    st.markdown(
        f"""
        <div style="
            padding: 2rem;
            border-radius: 8px;
            border: 1px solid #ff4b4b;
            background-color: #fff5f5;
            text-align: center;
        ">
            <div style="font-size: 3rem; margin-bottom: 1rem;">{icon}</div>
            <div style="color: #ff4b4b; font-weight: bold; font-size: 1.2rem;">{message}</div>
            <p style="color: #666; margin-top: 0.5rem;">Try refreshing the page or check your connection.</p>
        </div>
        """,
        unsafe_allow_html=True
    )

def safe_api_call(func: Callable, *args, **kwargs):
    """
    Wrapper for API calls with basic error handling and return value safety.
    """
    try:
        result = func(*args, **kwargs)
        return result, None
    except Exception as e:
        return None, str(e)

def auto_refresh(interval_ms: int, key: str):
    # ... (existing code)
    pass

def worklog_card(log: dict, jira_base_url: str = "https://your-domain.atlassian.net"):
    """
    Renders a consistent card for a worklog entry.
    """
    with st.container(border=True):
        col1, col2 = st.columns([0.8, 0.2])
        
        with col1:
            user_name = log.get("user_name", "Unknown")
            jira_account_id = log.get("jira_account_id")
            user_link = f"{jira_base_url}/jira/people/{jira_account_id}" if jira_account_id else "#"
            
            issue_key = log.get("issue_key")
            is_jira_task = log.get("category") == "Jira Task" or issue_key
            
            if is_jira_task:
                issue_summary = log.get("issue_summary") or "No summary"
                task_link_url = f"{jira_base_url}/browse/{issue_key}" if issue_key else "#"
                task_display = f"[{issue_key}]({task_link_url})" if issue_key else ""
                main_title = f"##### {task_display} {issue_summary}"
            else:
                description_text = log.get("description") or "No description"
                main_title = f"*{description_text}*"

            st.markdown(f"**<a href='{user_link}' target='_blank'>{user_name}</a> logged {log['hours']}h**", unsafe_allow_html=True)
            st.markdown(main_title)
            
            project_name = log.get("project_name", "N/A")
            st.caption(f"**Project:** {project_name} | **Category:** {log.get('category', 'N/A')}")

        with col2:
            created_at_str = log.get("source_created_at")
            if created_at_str:
                try:
                    from datetime import datetime
                    created_dt = datetime.fromisoformat(created_at_str)
                    st.write(f"Logged: {created_dt.strftime('%Y-%m-%d %H:%M')}")
                except (ValueError, TypeError):
                    st.write("Logged: *N/A*")
            
            st.caption(f"Work Date: {log['date']}")

def pagination_ui(current_page: int, total_pages: int, on_change: Callable):
    """
    Renders a standard pagination row.
    """
    if total_pages <= 1:
        return

    st.markdown("---")
    cols = st.columns([1, 1, 3, 1, 1])
    with cols[1]:
        if st.button("Previous", disabled=current_page <= 1, key=f"prev_{current_page}"):
            on_change(current_page - 1)
            st.rerun()
    with cols[2]:
        st.write(f"Page {current_page} of {total_pages}")
    with cols[3]:
        if st.button("Next", disabled=current_page >= total_pages, key=f"next_{current_page}"):
            on_change(current_page + 1)
            st.rerun()
