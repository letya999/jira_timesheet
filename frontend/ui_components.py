from collections.abc import Callable
from datetime import datetime

import streamlit as st
from i18n import t


def loading_skeleton(height: int = 200, count: int = 1):
    """Shows a simple gray skeleton to simulate loading."""
    style = f"""
        <style>
            @keyframes loading {{
                0% {{ background-position: 200% 0; }}
                100% {{ background-position: -200% 0; }}
            }}
        </style>
        <div style="
            background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
            background-size: 200% 100%; animation: loading 1.5s infinite;
            height: {height}px; border-radius: 8px; margin-bottom: 10px;
        "></div>
    """
    for _ in range(count):
        st.markdown(style, unsafe_allow_html=True)

def error_state(message: str, icon: str = "⚠️"):
    """Renders a consistent error state."""
    st.markdown(f"""
        <div style="padding: 2rem; border-radius: 8px; border: 1px solid #ff4b4b;
                    background-color: #fff5f5; text-align: center;">
            <div style="font-size: 3rem; margin-bottom: 1rem;">{icon}</div>
            <div style="color: #ff4b4b; font-weight: bold; font-size: 1.2rem;">{message}</div>
            <p style="color: #666; margin-top: 0.5rem;">{t('ui.try_refresh')}</p>
        </div>
    """, unsafe_allow_html=True)

def safe_api_call(func: Callable, *args, **kwargs):
    """Wrapper for API calls with basic error handling."""
    try:
        return func(*args, **kwargs), None
    except Exception as e:
        return None, str(e)

def auto_refresh(interval_ms: int, key: str):
    """Simple JS-based auto refresh."""
    st.components.v1.html(f"""
        <script>
            setTimeout(function() {{
                const btn = window.parent.document.querySelector('button[key="{key}"]');
                if (btn) btn.click();
            }}, {interval_ms});
        </script>
    """, height=0)

def _get_worklog_title(log: dict, jira_base_url: str):
    if log.get("type") == "JIRA":
        key = log.get("issue_key")
        summary = log.get("issue_summary") or "No summary"
        if key and key != "N/A":
            url = f"{jira_base_url}/browse/{key}"
            return f"##### [{key}]({url}) {summary}"
        return f"##### {summary}"
    desc = log.get("description") or t("common.description")
    return f"*{desc}*"

def worklog_card(log: dict, jira_base_url: str = "https://your-domain.atlassian.net"):
    """Renders a consistent card for a worklog entry."""
    with st.container(border=True):
        col1, col2 = st.columns([0.8, 0.2])
        with col1:
            name, jid = log.get("user_name", "Unknown"), log.get("jira_account_id")
            link = f"{jira_base_url}/jira/people/{jid}" if jid else "#"
            st.markdown(f"**<a href='{link}' target='_blank'>{name}</a> "
                        f"{t('ui.logged_hours', hours=log['hours'])}**", unsafe_allow_html=True)
            st.markdown(_get_worklog_title(log, jira_base_url))
            st.caption(f"**{t('common.project')}:** {log.get('project_name', 'N/A')} | "
                       f"**{t('common.category')}:** {log.get('category', 'N/A')}")
        with col2:
            at_str = log.get("source_created_at") or log.get("created_at")
            st.write(f"**{t('ui.logged_at')}**")
            if at_str:
                try:
                    dt = datetime.fromisoformat(at_str.replace("Z", "+00:00"))
                    st.write(dt.strftime('%Y-%m-%d %H:%M'))
                except (ValueError, TypeError):
                    st.write("*N/A*")
            else:
                st.write("*N/A*")
            st.caption(f"**{t('ui.work_date')}** {log['date']}")

def pagination_ui(current_page: int, total_pages: int, on_change: Callable):
    """Renders a standard pagination row."""
    if total_pages <= 1:
        return
    st.markdown("---")
    cols = st.columns([1, 1, 3, 1, 1])
    if cols[1].button(t("common.prev"), disabled=current_page <= 1, key=f"prev_{current_page}"):
        on_change(current_page - 1)
        st.rerun()
    cols[2].write(f"{t('common.page')} {current_page} {t('common.of')} {total_pages}")
    if cols[3].button(t("common.next"), disabled=current_page >= total_pages, key=f"next_{current_page}"):
        on_change(current_page + 1)
        st.rerun()

def _render_notification_actions(ntype: str, entity_type: str | None, base_key: str):
    if entity_type == "TimesheetPeriod":
        if ntype == "timesheet_submitted":
            if st.button(f"📝 {t('ui.review_submission')}", key=f"rev_{base_key}", width="stretch"):
                st.switch_page("views/8_Control_Sheet.py")
        elif ntype in ["timesheet_approved", "timesheet_rejected"]:
            if st.button(f"🗓️ {t('ui.goto_my_timesheet')}", key=f"go_{base_key}", width="stretch"):
                st.switch_page("views/10_My_Timesheet.py")

def notification_card(notification: dict, on_mark_read: Callable | None = None, key_prefix: str = ""):
    """Renders a single notification card."""
    icons = {"info": "ℹ️", "success": "✅", "warning": "⚠️", "error": "🚨",
             "timesheet_submitted": "📥", "timesheet_approved": "🎉", "timesheet_rejected": "❌"}
    ntype = notification.get("type", "info")
    icon = icons.get(ntype, icons["info"])
    is_read, nid = notification.get("is_read", False), notification['id']
    base_key = f"{key_prefix}_{nid}" if key_prefix else str(nid)

    with st.container(border=True):
        c = st.columns([0.05, 0.70, 0.25])
        c[0].write(icon)
        with c[1]:
            st.markdown(f"**{notification['title']}**\n\n{notification['message']}")
            at = notification.get("created_at")
            if at:
                try:
                    dt = datetime.fromisoformat(at.replace("Z", "+00:00"))
                    st.caption(f"{dt.strftime('%Y-%m-%d %H:%M')} | From: {notification.get('sender_name', 'System')}")
                except Exception:
                    st.caption(f"From: {notification.get('sender_name', 'System')}")
            _render_notification_actions(ntype, notification.get("entity_type"), base_key)
        with c[2]:
            if not is_read and on_mark_read:
                if st.button(t("common.mark_read"), key=f"rd_{base_key}"):
                    on_mark_read(nid)
                    st.rerun()
            elif is_read:
                st.caption(t("common.mark_read"))

def notification_sidebar_summary(unread_count: int):
    """Renders a notification summary for the sidebar."""
    if unread_count > 0:
        st.sidebar.markdown(f"""
            <div style="padding: 10px; border-radius: 5px; text-align: center;
                        background-color: rgba(255, 75, 75, 0.1); border: 1px solid rgba(255, 75, 75, 0.2);">
                <span style="font-size: 1.2rem;">🔔</span>
                <b style="color: #ff4b4b;">{unread_count}</b> {t('sidebar.new_notifications', count=unread_count)}
            </div>
        """, unsafe_allow_html=True)
        if st.sidebar.button(t("notifications.mark_all_read"), width="stretch"):
            st.switch_page("views/11_Notifications.py")
