
import streamlit as st
import pandas as pd
from api_client import (
    fetch_db_projects, 
    refresh_projects_from_jira, 
    update_project_status,
    sync_all_projects_worklogs,
    sync_project_worklogs
)
from auth_utils import ensure_session

st.set_page_config(page_title="Project Management", page_icon="🏗️", layout="wide")

# Check for session/cookies
token = ensure_session()

st.title("🏗️ Project Management")
st.markdown("Manage Jira projects available for synchronization.")

if not token:
    st.warning("Please log in first.")
    st.stop()

# Actions
col1, col2 = st.columns(2)
with col1:
    if st.button("🔄 Refresh Projects from Jira"):
        with st.spinner("Fetching projects..."):
            if refresh_projects_from_jira():
                st.success("Project list refreshed!")
                st.rerun()
            else:
                st.error("Failed to refresh projects.")

with col2:
    if st.button("🚀 Sync All Active Projects"):
        with st.spinner("Syncing worklogs..."):
            result = sync_all_projects_worklogs()
            if result and result.get("status") == "success":
                st.success(f"Synced {result.get('synced')} worklogs.")
            else:
                st.error(f"Sync failed: {result.get('detail') if result else 'Unknown error'}")

st.divider()

# Pagination State
if "projects_page" not in st.session_state:
    st.session_state["projects_page"] = 1

page_size = 10

# Fetch data for current page
data = fetch_db_projects(page=st.session_state["projects_page"], size=page_size)
projects_list = data.get("items", [])
total_count = data.get("total", 0)
total_pages = data.get("pages", 1)

if not projects_list and st.session_state["projects_page"] == 1:
    st.info("No projects found in DB. Click 'Refresh Projects from Jira' to fetch them.")
else:
    st.write(f"Total Projects: **{total_count}**")
    
    # Custom display with toggles/buttons
    for project in projects_list:
        with st.container():
            p_col1, p_col2, p_col3, p_col4 = st.columns([1, 3, 1, 1])
            
            p_col1.write(f"**{project['key']}**")
            p_col2.write(project['name'])
            
            # Sync Toggle
            is_active = p_col3.toggle("Sync", value=project['is_active'], key=f"toggle_{project['id']}")
            if is_active != project['is_active']:
                if update_project_status(project['id'], is_active):
                    st.toast(f"Updated {project['key']} status")
                    st.rerun()
                else:
                    st.error("Update failed")
            
            # Manual Sync Button
            if project['is_active']:
                if p_col4.button("Sync Now", key=f"sync_{project['id']}"):
                    with st.spinner(f"Syncing {project['key']}..."):
                        result = sync_project_worklogs(project['id'])
                        if result and result.get("status") == "success":
                            st.success(f"Synced {result.get('synced')} worklogs for {project['key']}")
                        else:
                            st.error(f"Failed to sync {project['key']}")
        st.divider()

    # Pagination controls
    p_col1, p_col2, p_col3, p_col4, p_col5 = st.columns([1, 1, 2, 1, 1])
    
    with p_col1:
        if st.button("« First", disabled=st.session_state["projects_page"] == 1, key="proj_first"):
            st.session_state["projects_page"] = 1
            st.rerun()
            
    with p_col2:
        if st.button("‹ Prev", disabled=st.session_state["projects_page"] == 1, key="proj_prev"):
            st.session_state["projects_page"] -= 1
            st.rerun()
            
    with p_col3:
        st.write(f"Page {st.session_state['projects_page']} of {total_pages}")
        
    with p_col4:
        if st.button("Next ›", disabled=st.session_state["projects_page"] >= total_pages, key="proj_next"):
            st.session_state["projects_page"] += 1
            st.rerun()
            
    with p_col5:
        if st.button("Last »", disabled=st.session_state["projects_page"] >= total_pages, key="proj_last"):
            st.session_state["projects_page"] = total_pages
            st.rerun()
