import os
import streamlit as st
import pandas as pd
from datetime import date
from api_client import get_all_users, get_calendar_country, set_calendar_country, sync_holidays, fetch_holidays, add_holiday, delete_holiday
from i18n import t
from auth_utils import ensure_session

st.set_page_config(page_title="Settings", page_icon="logo.png", layout="wide")

# Check for session/cookies
token, _ = ensure_session()

st.title(f"⚙️ {t('settings.title')}")
st.markdown(t('settings.subtitle'))

if not token:
    st.warning(t('auth.please_login'))
    st.stop()

tab1, tab2 = st.tabs([t('settings.tab_users'), t('settings.tab_config')])

with tab1:
    st.subheader(t('settings.tab_users'))
    st.markdown(t('settings.users_desc'))
    
    # Pagination State
    if "users_page" not in st.session_state:
        st.session_state["users_page"] = 1

    page_size = 20

    # Fetch data for current page
    data = get_all_users(page=st.session_state["users_page"], size=page_size)
    users_list = data.get("items", [])
    total_count = data.get("total", 0)
    total_pages = data.get("pages", 1)

    st.write(t("settings.total_system_users", count=total_count))
    
    if users_list:
        df = pd.DataFrame(users_list)
        
        # Select columns to display for system users
        display_cols = ["id", "full_name", "email", "role", "jira_user_id", "weekly_quota"]
        existing_cols = [c for c in display_cols if c in df.columns]
        df_display = df[existing_cols].copy()
        
        st.dataframe(
            df_display,
            width="stretch",
            hide_index=True
        )

        # Pagination controls
        if total_pages > 1:
            p_col1, p_col2, p_col3, p_col4, p_col5 = st.columns([1, 1, 2, 1, 1])
            
            with p_col1:
                if st.button("« " + t("common.first"), key="sys_first", disabled=st.session_state["users_page"] == 1):
                    st.session_state["users_page"] = 1
                    st.rerun()
                    
            with p_col2:
                if st.button("‹ " + t("common.prev"), key="sys_prev", disabled=st.session_state["users_page"] == 1):
                    st.session_state["users_page"] -= 1
                    st.rerun()
                    
            with p_col3:
                st.write(f"{t('common.page')} {st.session_state['users_page']} {t('common.of')} {total_pages}")
                
            with p_col4:
                if st.button(t("common.next") + " ›", key="sys_next", disabled=st.session_state["users_page"] >= total_pages):
                    st.session_state["users_page"] += 1
                    st.rerun()
                    
            with p_col5:
                if st.button(t("common.last") + " »", key="sys_last", disabled=st.session_state["users_page"] >= total_pages):
                    st.session_state["users_page"] = total_pages
                    st.rerun()

    st.info(t("settings.users_note"))


with tab2:
    st.subheader(t("settings.calendar_title"))
    
    col1, col2 = st.columns([1, 2])
    
    with col1:
        current_country = get_calendar_country()
        # Common country codes. For a full list, we could use pycountry or similar, but let's keep it simple.
        countries = {
            "RU": "Russia",
            "US": "United States",
            "GB": "United Kingdom",
            "DE": "Germany",
            "KZ": "Kazakhstan",
            "BY": "Belarus",
            "UA": "Ukraine",
            "AE": "United Arab Emirates",
            "UZ": "Uzbekistan"
        }
        
        country_options = sorted(list(countries.keys()))
        try:
            default_idx = country_options.index(current_country)
        except ValueError:
            default_idx = 0
            
        new_country = st.selectbox(
            t("settings.instance_country"), 
            options=country_options, 
            index=default_idx,
            format_func=lambda x: f"{x} - {countries.get(x, x)}"
        )
        
        if new_country != current_country:
            if st.button(t("settings.update_country")):
                if set_calendar_country(new_country):
                    st.success(t("settings.country_updated", country=new_country))
                    st.rerun()
                else:
                    st.error(t("settings.failed_update_country"))

        st.divider()
        st.write(f"### {t('common.actions')}")
        if st.button(t("settings.sync_current")):
            with st.spinner(t("common.loading")):
                if sync_holidays():
                    st.success(t("common.success"))
                    st.rerun()
                else:
                    st.error(t("common.error"))
                    
        if st.button(t("settings.sync_next")):
            with st.spinner(t("common.loading")):
                if sync_holidays(date.today().year + 1):
                    st.success(t("common.success"))
                    st.rerun()
                    
    with col2:
        st.write(f"### {t('settings.holidays_title')}")
        
        # Date range for viewing holidays
        h_col1, h_col2 = st.columns(2)
        with h_col1:
            h_start = st.date_input(t("common.from"), value=date(date.today().year, 1, 1))
        with h_col2:
            h_end = st.date_input(t("common.to"), value=date(date.today().year, 12, 31))
            
        holidays_data = fetch_holidays(h_start, h_end)
        if holidays_data:
            h_df = pd.DataFrame(holidays_data)
            h_df = h_df.sort_values("date")
            st.dataframe(h_df[["date", "name", "is_holiday", "is_custom", "country_code"]], hide_index=True, width="stretch")
        else:
            st.info(t("common.not_found"))
            
        with st.expander(t("settings.add_holiday")):
            with st.form("add_holiday_form"):
                new_h_date = st.date_input(t("common.date"))
                new_h_name = st.text_input(t("common.name"))
                new_h_is_holiday = st.checkbox(t("common.yes"), value=True)
                
                if st.form_submit_button(t("common.save")):
                    if add_holiday(new_h_date, new_h_name, new_h_is_holiday):
                        st.success(t("settings.holiday_saved"))
                        st.rerun()
                    else:
                        st.error(t("common.error"))
                        
        with st.expander(t("settings.remove_holiday")):
            del_h_date = st.date_input(t("common.date"), key="del_h_date")
            if st.button(t("common.delete")):
                if delete_holiday(del_h_date):
                    st.success(t("settings.holiday_deleted"))
                    st.rerun()
                else:
                    st.error(t("common.error"))

    st.divider()
    st.subheader(t("settings.tab_config"))
    jira_url = os.getenv("JIRA_URL", "Not configured")
    st.write(f"Jira URL: {jira_url}")
    st.write(t("settings.coming_soon"))
