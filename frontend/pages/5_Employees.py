import streamlit as st
import pandas as pd
from api_client import (
    get_employees, sync_users_from_jira, fetch_departments, 
    update_employee, get_headers
)
from auth_utils import ensure_session

st.set_page_config(page_title="Employees", page_icon="👥", layout="wide")

token, _ = ensure_session()
if not token:
    st.title("Employees")
    st.warning("Please log in first.")
    st.stop()

st.title("👥 Employee Management")

headers = get_headers()
depts = fetch_departments(_headers=headers)

# Flatten teams for easy selection
all_teams = []
team_map = {0: "No Team"}
for d in depts:
    for dv in d["divisions"]:
        for t in dv["teams"]:
            all_teams.append({"id": t["id"], "name": t["name"], "path": f"{d['name']} > {dv['name']} > {t['name']}"})
            team_map[t["id"]] = f"{d['name']} > {dv['name']} > {t['name']}"

# Search and Pagination State
if "employees_search" not in st.session_state:
    st.session_state["employees_search"] = ""
if "employees_page" not in st.session_state:
    st.session_state["employees_page"] = 1

search_query = st.text_input("🔍 Search Employees (Name or Email)", value=st.session_state["employees_search"])
if search_query != st.session_state["employees_search"]:
    st.session_state["employees_search"] = search_query
    st.session_state["employees_page"] = 1
    st.rerun()

tab_list, tab_hier = st.tabs(["📋 List View", "🌳 Hierarchical View"])

with tab_list:
    # Actions
    if st.button("🔄 Sync Employees from Jira"):
        with st.spinner("Fetching users from Jira..."):
            result = sync_users_from_jira()
            if result and result.get("status") == "success":
                st.success(f"Successfully synced {result.get('synced', 0)} employees!")
                st.rerun()
            else:
                error_msg = result.get("message") if result else "Unknown error"
                st.error(f"Failed to sync users from Jira: {error_msg}")

    page_size = 20
    data = get_employees(
        page=st.session_state["employees_page"], 
        size=page_size, 
        search=st.session_state["employees_search"],
        _headers=headers
    )
    users_list = data.get("items", [])
    total_count = data.get("total", 0)
    total_pages = data.get("pages", 1)

    st.write(f"Total Employees: **{total_count}**")
    
    if users_list:
        # We'll use a data editor to allow changing teams
        df = pd.DataFrame(users_list)
        
        # Map team_id to path for display
        df["Team"] = df["team_id"].apply(lambda x: team_map.get(x, "No Team"))
        
        # Prepare for editor
        df_editor = df[["id", "display_name", "email", "Team", "is_active"]].copy()
        
        edited_df = st.data_editor(
            df_editor,
            column_config={
                "id": st.column_config.NumberColumn("ID", disabled=True),
                "display_name": st.column_config.TextColumn("Name", disabled=True),
                "email": st.column_config.TextColumn("Email", disabled=True),
                "Team": st.column_config.SelectboxColumn("Team", options=list(team_map.values()), required=True),
                "is_active": st.column_config.CheckboxColumn("Active")
            },
            use_container_width=True,
            hide_index=True,
            key="employees_editor"
        )

        if st.button("Save Changes", type="primary"):
            updated_names = []
            for i, row in edited_df.iterrows():
                original_row = df_editor.iloc[i]
                if row["Team"] != original_row["Team"] or row["is_active"] != original_row["is_active"]:
                    new_team_id = next((tid for tid, path in team_map.items() if path == row["Team"]), None)
                    if update_employee(row["id"], team_id=new_team_id, is_active=row["is_active"]):
                        updated_names.append(row["display_name"])
            
            if updated_names:
                st.success(f"✅ Successfully updated: {', '.join(updated_names)}")
                st.rerun()
            else:
                st.info("No changes detected.")

        # Pagination
        if total_pages > 1:
            cols = st.columns(5)
            with cols[2]:
                st.write(f"Page {st.session_state['employees_page']} of {total_pages}")
            if cols[1].button("Prev", disabled=st.session_state["employees_page"] == 1):
                st.session_state["employees_page"] -= 1
                st.rerun()
            if cols[3].button("Next", disabled=st.session_state["employees_page"] >= total_pages):
                st.session_state["employees_page"] += 1
                st.rerun()

with tab_hier:
    st.subheader("🌳 Hierarchical View (Who is Where)")
    
    # We need to fetch employees for hierarchical view. 
    all_emp_data = get_employees(
        page=1, 
        size=1000, # Increased to show most employees
        search=st.session_state["employees_search"], 
        _headers=headers
    )
    all_emps = all_emp_data.get("items", [])
    
    unassigned = [e for e in all_emps if not e.get("team_id")]
    
    for d in depts:
        # Check if department has any matching employees
        dept_emps = [e for e in all_emps if any(
            e.get("team_id") == t["id"] 
            for dv in d["divisions"] 
            for t in dv["teams"]
        )]
        
        if not dept_emps and st.session_state["employees_search"]:
            continue

        with st.expander(f"🏢 {d['name']}", expanded=True):
            for dv in d["divisions"]:
                div_emps = [e for e in all_emps if any(e.get("team_id") == t["id"] for t in dv["teams"])]
                if not div_emps and st.session_state["employees_search"]:
                    continue
                    
                st.markdown(f"&nbsp;&nbsp;&nbsp;&nbsp;📂 **{dv['name']}**")
                for t in dv["teams"]:
                    team_emps = [e for e in all_emps if e.get("team_id") == t["id"]]
                    if not team_emps and st.session_state["employees_search"]:
                        continue
                        
                    st.markdown(f"&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;👥 **Team: {t['name']}**")
                    for te in team_emps:
                        st.markdown(f"&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;👤 {te['display_name']} ({te['email'] or 'No Email'})")
    
    if unassigned and (not st.session_state["employees_search"] or any(ue for ue in unassigned)):
        with st.expander(f"❓ Unassigned ({len(unassigned)})"):
            for ue in unassigned:
                st.markdown(f"👤 {ue['display_name']} ({ue['email'] or 'No Email'})")
