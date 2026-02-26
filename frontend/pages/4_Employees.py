
import streamlit as st
import pandas as pd
from api_client import get_all_users, sync_users_from_jira

st.set_page_config(page_title="Employee Management", page_icon="👥", layout="wide")

st.title("👥 Employee Management")
st.markdown("Manage employees and their Jira account links.")

if "token" not in st.session_state:
    st.warning("Please log in first.")
    st.stop()

# Actions
col1, col2 = st.columns([1, 1])
with col1:
    if st.button("🔄 Sync Employees from Jira"):
        with st.spinner("Fetching users from Jira..."):
            result = sync_users_from_jira()
            if result and result.get("status") == "success":
                st.success(f"Successfully synced {result.get('synced')} users!")
                st.rerun()
            else:
                st.error("Failed to sync users from Jira.")

st.divider()

# Pagination State
if "employees_page" not in st.session_state:
    st.session_state["employees_page"] = 1

page_size = 20

# Fetch data for current page
data = get_all_users(page=st.session_state["employees_page"], size=page_size)
users_list = data.get("items", [])
total_count = data.get("total", 0)
total_pages = data.get("pages", 1)

if not users_list and st.session_state["employees_page"] == 1:
    st.info("No employees found in DB. Click 'Sync Employees from Jira' to fetch them.")
else:
    st.write(f"Total Employees: **{total_count}**")
    
    df = pd.DataFrame(users_list)
    
    # Select columns to display
    display_cols = ["id", "full_name", "email", "jira_account_id", "role", "weekly_quota"]
    existing_cols = [c for c in display_cols if c in df.columns]
    df_display = df[existing_cols].copy()
    
    st.dataframe(
        df_display,
        use_container_width=True,
        hide_index=True
    )

    # Pagination controls
    p_col1, p_col2, p_col3, p_col4, p_col5 = st.columns([1, 1, 2, 1, 1])
    
    with p_col1:
        if st.button("« First", disabled=st.session_state["employees_page"] == 1):
            st.session_state["employees_page"] = 1
            st.rerun()
            
    with p_col2:
        if st.button("‹ Prev", disabled=st.session_state["employees_page"] == 1):
            st.session_state["employees_page"] -= 1
            st.rerun()
            
    with p_col3:
        st.write(f"Page {st.session_state['employees_page']} of {total_pages}")
        
    with p_col4:
        if st.button("Next ›", disabled=st.session_state["employees_page"] >= total_pages):
            st.session_state["employees_page"] += 1
            st.rerun()
            
    with p_col5:
        if st.button("Last »", disabled=st.session_state["employees_page"] >= total_pages):
            st.session_state["employees_page"] = total_pages
            st.rerun()

    st.info("Note: Newly synced employees have the default password 'jira123'.")
