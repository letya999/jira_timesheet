import streamlit as st
import time
from typing import Callable, Optional
from i18n import t

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
            <p style="color: #666; margin-top: 0.5rem;">{t('ui.try_refresh')}</p>
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
            
            is_jira_task = log.get("type") == "JIRA"
            
            if is_jira_task:
                issue_key = log.get("issue_key")
                issue_summary = log.get("issue_summary") or "No summary"
                task_link_url = f"{jira_base_url}/browse/{issue_key}" if (issue_key and issue_key != "N/A") else "#"
                task_display = f"[{issue_key}]({task_link_url})" if (issue_key and issue_key != "N/A") else ""
                main_title = f"##### {task_display} {issue_summary}"
            else:
                description_text = log.get("description") or t("common.description")
                main_title = f"*{description_text}*"

            st.markdown(f"**<a href='{user_link}' target='_blank'>{user_name}</a> {t('ui.logged_hours', hours=log['hours'])}**", unsafe_allow_html=True)
            st.markdown(main_title)
            
            project_name = log.get("project_name", "N/A")
            st.caption(f"**{t('common.project')}:** {project_name} | **{t('common.category')}:** {log.get('category', 'N/A')}")

        with col2:
            # Show Logging Date prominently as requested
            source_at = log.get("source_created_at")
            db_at = log.get("created_at")
            logged_at_str = source_at or db_at
            
            if logged_at_str:
                try:
                    from datetime import datetime
                    # Clean up the string for ISO format if needed
                    dt_val = logged_at_str.replace("Z", "+00:00")
                    logged_dt = datetime.fromisoformat(dt_val)
                    st.write(f"**{t('ui.logged_at')}**")
                    st.write(f"{logged_dt.strftime('%Y-%m-%d %H:%M')}")
                except (ValueError, TypeError):
                    st.write(f"**{t('ui.logged_at')}** *N/A*")
            else:
                st.write(f"**{t('ui.logged_at')}** *N/A*")
            
            st.caption(f"**{t('ui.work_date')}** {log['date']}")

def pagination_ui(current_page: int, total_pages: int, on_change: Callable):
    """
    Renders a standard pagination row.
    """
    if total_pages <= 1:
        return

    st.markdown("---")
    cols = st.columns([1, 1, 3, 1, 1])
    with cols[1]:
        if st.button(t("common.prev"), disabled=current_page <= 1, key=f"prev_{current_page}"):
            on_change(current_page - 1)
            st.rerun()
    with cols[2]:
        st.write(f"{t('common.page')} {current_page} {t('common.of')} {total_pages}")
    with cols[3]:
        if st.button(t("common.next"), disabled=current_page >= total_pages, key=f"next_{current_page}"):
            on_change(current_page + 1)
            st.rerun()

def notification_card(notification: dict, on_mark_read: Optional[Callable] = None, key_prefix: str = ""):
    """
    Renders a single notification card.
    """
    from datetime import datetime
    
    # Define colors/icons based on type
    types = {
        "info": {"icon": "ℹ️", "color": "#2196F3"},
        "success": {"icon": "✅", "color": "#4CAF50"},
        "warning": {"icon": "⚠️", "color": "#FFC107"},
        "error": {"icon": "🚨", "color": "#F44336"},
        "timesheet_submitted": {"icon": "📥", "color": "#673AB7"},
        "timesheet_approved": {"icon": "🎉", "color": "#4CAF50"},
        "timesheet_rejected": {"icon": "❌", "color": "#F44336"},
    }
    
    ntype = notification.get("type", "info")
    style = types.get(ntype, types["info"])
    
    is_read = notification.get("is_read", False)
    
    # Create unique base key
    base_key = f"{key_prefix}_{notification['id']}" if key_prefix else str(notification['id'])
    
    with st.container(border=True):
        cols = st.columns([0.05, 0.70, 0.25])
        
        with cols[0]:
            st.write(style["icon"])
            
        with cols[1]:
            st.markdown(f"**{notification['title']}**")
            st.markdown(notification["message"])
            
            created_at = notification.get("created_at")
            if created_at:
                try:
                    dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                    st.caption(f"{dt.strftime('%Y-%m-%d %H:%M')} | From: {notification.get('sender_name', 'System')}")
                except:
                    st.caption(f"From: {notification.get('sender_name', 'System')}")
            
            # Action Buttons based on related entity
            if entity_type == "TimesheetPeriod":
                if ntype == "timesheet_submitted":
                    if st.button(f"📝 {t('ui.review_submission')}", key=f"review_{base_key}", width="stretch"):
                        st.switch_page("views/8_Control_Sheet.py")
                elif ntype in ["timesheet_approved", "timesheet_rejected"]:
                    if st.button(f"🗓️ {t('ui.goto_my_timesheet')}", key=f"goto_{base_key}", width="stretch"):
                        st.switch_page("views/10_My_Timesheet.py")
        
        with cols[2]:
            if not is_read and on_mark_read:
                if st.button(t("common.mark_read"), key=f"read_{base_key}"):
                    on_mark_read(notification["id"])
                    st.rerun()
            elif is_read:
                st.caption(t("common.mark_read"))

def notification_sidebar_summary(unread_count: int):
    """
    Renders a notification summary for the sidebar.
    """
    if unread_count > 0:
        st.sidebar.markdown(
            f"""
            <div style="
                padding: 10px;
                border-radius: 5px;
                background-color: rgba(255, 75, 75, 0.1);
                border: 1px solid rgba(255, 75, 75, 0.2);
                margin-bottom: 10px;
                text-align: center;
            ">
                <span style="font-size: 1.2rem;">🔔</span> 
                <b style="color: #ff4b4b;">{unread_count}</b> {t('sidebar.new_notifications', count=unread_count)}
            </div>
            """,
            unsafe_allow_html=True
        )
        if st.sidebar.button(t("notifications.mark_all_read"), width="stretch"):
            st.switch_page("views/11_Notifications.py")
