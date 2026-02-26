
import streamlit as st
import pandas as pd
from api_client import get_all_users

st.set_page_config(page_title="Settings", page_icon="⚙️", layout="wide")

st.title("⚙️ System Settings")
st.markdown("Manage system users and global configuration.")

if "token" not in st.session_state:
    st.warning("Please log in first.")
    st.stop()

tab1, tab2 = st.tabs(["System Users", "General Config"])

with tab1:
    st.subheader("System Users")
    st.markdown("Users who have access to this application.")
    
    # Pagination State
    if "users_page" not in st.session_state:
        st.session_state["users_page"] = 1

    page_size = 20

    # Fetch data for current page
    data = get_all_users(page=st.session_state["users_page"], size=page_size)
    users_list = data.get("items", [])
    total_count = data.get("total", 0)
    total_pages = data.get("pages", 1)

    st.write(f"Total System Users: **{total_count}**")
    
    if users_list:
        df = pd.DataFrame(users_list)
        
        # Select columns to display for system users
        display_cols = ["id", "full_name", "email", "role", "jira_user_id", "weekly_quota"]
        existing_cols = [c for c in display_cols if c in df.columns]
        df_display = df[existing_cols].copy()
        
        st.dataframe(
            df_display,
            use_container_width=True,
            hide_index=True
        )

        # Pagination controls
        if total_pages > 1:
            p_col1, p_col2, p_col3, p_col4, p_col5 = st.columns([1, 1, 2, 1, 1])
            
            with p_col1:
                if st.button("« First", key="sys_first", disabled=st.session_state["users_page"] == 1):
                    st.session_state["users_page"] = 1
                    st.rerun()
                    
            with p_col2:
                if st.button("‹ Prev", key="sys_prev", disabled=st.session_state["users_page"] == 1):
                    st.session_state["users_page"] -= 1
                    st.rerun()
                    
            with p_col3:
                st.write(f"Page {st.session_state['users_page']} of {total_pages}")
                
            with p_col4:
                if st.button("Next ›", key="sys_next", disabled=st.session_state["users_page"] >= total_pages):
                    st.session_state["users_page"] += 1
                    st.rerun()
                    
            with p_col5:
                if st.button("Last »", key="sys_last", disabled=st.session_state["users_page"] >= total_pages):
                    st.session_state["users_page"] = total_pages
                    st.rerun()

    st.info("Note: System users are those who can log in. Use 'Employee Management' to sync people from Jira.")

with tab2:
    st.subheader("General Configuration")
    st.write("Jira URL: " + st.secrets.get("JIRA_URL", "https://neuralab.atlassian.net"))
    st.write("Other settings coming soon...")
