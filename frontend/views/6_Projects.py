import streamlit as st
from api_client import (
    fetch_db_projects,
    get_headers,
    get_job_status,
    refresh_projects_from_jira,
    sync_all_projects_worklogs,
    sync_project_worklogs,
    update_project_status,
)
import time
from auth_utils import ensure_session
from i18n import t

st.set_page_config(page_title=t("projects.title"), page_icon="logo.png", layout="wide")

# Check for session/cookies
token, _ = ensure_session()

st.title(f"🏗️ {t('projects.title')}")
st.markdown(t("projects.subtitle"))

if not token:
    st.warning(t("auth.please_login"))
    st.stop()

# Actions
col1, col2 = st.columns(2)
with col1:
    if st.button(f"🔄 {t('projects.refresh_jira')}"):
        with st.spinner(t("common.loading")):
            if refresh_projects_from_jira():
                st.success(t("common.success"))
                st.rerun()
            else:
                st.error(t("common.error"))

with col2:
    if st.button(f"🚀 {t('projects.sync_all_active')}"):
        with st.spinner(t("projects.sync_pending")):
            result = sync_all_projects_worklogs()
            if result and result.get("status") == "success" and "job_id" in result:
                job_id = result["job_id"]
                # Poll for job completion
                while True:
                    job_info = get_job_status(job_id)
                    if not job_info or job_info.get("status") in ["complete", "aborted", "not_found"]:
                        if job_info and job_info.get("status") == "complete":
                            res_data = job_info.get("result", {})
                            st.success(t("projects.sync_success", count=res_data.get("synced", 0)))
                        else:
                            st.error(t("common.error"))
                        break
                    time.sleep(1)
            else:
                st.error(f"{t('common.error')}: {result.get('detail') if result else t('common.error')}")

st.divider()

# Search and Pagination State
if "projects_search" not in st.session_state:
    st.session_state["projects_search"] = ""
if "projects_page" not in st.session_state:
    st.session_state["projects_page"] = 1

search_query = st.text_input(f"🔍 {t('projects.search_hint')}", value=st.session_state["projects_search"])
if search_query != st.session_state["projects_search"]:
    st.session_state["projects_search"] = search_query
    st.session_state["projects_page"] = 1
    st.rerun()

page_size = 10

# Fetch data for current page
headers = get_headers()
data = fetch_db_projects(
    page=st.session_state["projects_page"], size=page_size, search=st.session_state["projects_search"], _headers=headers
)
projects_list = data.get("items", [])
total_count = data.get("total", 0)
total_pages = data.get("pages", 1)

if not projects_list and st.session_state["projects_page"] == 1:
    st.info(t("projects.no_projects_hint"))
else:
    st.write(f"{t('common.total')} {t('common.projects')}: **{total_count}**")

    # Custom display with toggles/buttons
    for project in projects_list:
        with st.container():
            p_col1, p_col2, p_col3, p_col4 = st.columns([1, 3, 1, 1])

            p_col1.write(f"**{project['key']}**")
            p_col2.write(project["name"])

            # Sync Toggle
            is_active = p_col3.toggle(t("common.sync"), value=project["is_active"], key=f"toggle_{project['id']}")
            if is_active != project["is_active"]:
                if update_project_status(project["id"], is_active):
                    st.toast(f"{t('common.update')}: {project['key']}")
                    st.rerun()
                else:
                    st.error(t("common.error"))

            # Manual Sync Button
            if project["is_active"]:
                if p_col4.button(t("projects.sync_now"), key=f"sync_{project['id']}"):
                    with st.spinner(t("projects.sync_pending")):
                        result = sync_project_worklogs(project["id"])
                        if result and result.get("status") == "success" and "job_id" in result:
                            job_id = result["job_id"]
                            # Poll for job completion
                            while True:
                                job_info = get_job_status(job_id)
                                if not job_info or job_info.get("status") in ["complete", "aborted", "not_found"]:
                                    if job_info and job_info.get("status") == "complete":
                                        res_data = job_info.get("result", {})
                                        st.success(t("projects.sync_success", count=res_data.get("synced", 0)))
                                    else:
                                        st.error(f"{t('common.error')} {project['key']}")
                                    break
                                time.sleep(1)
                        else:
                            st.error(f"{t('common.error')} {project['key']}")
        st.divider()

    # Pagination controls
    p_col1, p_col2, p_col3, p_col4, p_col5 = st.columns([1, 1, 2, 1, 1])

    with p_col1:
        if st.button("« " + t("common.first"), disabled=st.session_state["projects_page"] == 1, key="proj_first"):
            st.session_state["projects_page"] = 1
            st.rerun()

    with p_col2:
        if st.button("‹ " + t("common.prev"), disabled=st.session_state["projects_page"] == 1, key="proj_prev"):
            st.session_state["projects_page"] -= 1
            st.rerun()

    with p_col3:
        st.write(f"{t('common.page')} {st.session_state['projects_page']} {t('common.of')} {total_pages}")

    with p_col4:
        if st.button(
            t("common.next") + " ›", disabled=st.session_state["projects_page"] >= total_pages, key="proj_next"
        ):
            st.session_state["projects_page"] += 1
            st.rerun()

    with p_col5:
        if st.button(
            t("common.last") + " »", disabled=st.session_state["projects_page"] >= total_pages, key="proj_last"
        ):
            st.session_state["projects_page"] = total_pages
            st.rerun()
