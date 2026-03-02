import streamlit as st
from api_client import fetch_notifications, mark_all_notifications_read, mark_notification_read
from auth_utils import ensure_session
from i18n import t
from ui_components import notification_card, pagination_ui

st.set_page_config(page_title=t("notifications.page_title"), page_icon="logo.png", layout="wide")

# Check for session
token, _ = ensure_session()

if not token:
    st.title(f"🔔 {t('notifications.title')}")
    st.warning(t("auth.please_login"))
    st.stop()

st.title(f"🔔 {t('notifications.title')}")

col1, col2 = st.columns([0.8, 0.2])
with col1:
    st.write(t("notifications.subtitle"))
with col2:
    if st.button(t("notifications.mark_all_read"), width="stretch", type="secondary"):
        if mark_all_notifications_read():
            st.toast(t("notifications.all_read_success"))
            st.rerun()

# Pagination state
if "notif_page" not in st.session_state:
    st.session_state.notif_page = 1

tab1, tab2 = st.tabs([f"🆕 {t('common.unread')}", f"📂 {t('common.all_notifications')}"])

with tab1:
    # Fetch only unread notifications (we can filter in frontend for simplicity or add backend param)
    # For now, we fetch all and filter to show the difference
    notifications_data = fetch_notifications(page=1, size=100) # Fetch more for filtering
    unread = [n for n in notifications_data.get("items", []) if not n.get("is_read")]

    if not unread:
        st.success(t("notifications.caught_up"))
    else:
        for notif in unread:
            notification_card(notif, on_mark_read=mark_notification_read, key_prefix="unread")

with tab2:
    notifications_data = fetch_notifications(page=st.session_state.notif_page, size=20)

    if not notifications_data or not notifications_data.get("items"):
        st.info(t("notifications.no_notifications"))
    else:
        for notif in notifications_data["items"]:
            notification_card(notif, on_mark_read=mark_notification_read, key_prefix="all")

        def on_page_change(new_page):
            st.session_state.notif_page = new_page

        pagination_ui(
            current_page=st.session_state.notif_page,
            total_pages=notifications_data.get("pages", 1),
            on_change=on_page_change
        )
