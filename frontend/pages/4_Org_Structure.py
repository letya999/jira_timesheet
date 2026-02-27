import streamlit as st
from api_client import (
    fetch_departments, create_department, update_department, delete_department,
    create_division, update_division, delete_division,
    create_team, update_team, delete_team, get_headers
)
from auth_utils import ensure_session

st.set_page_config(page_title="Org Structure", layout="wide")

token, _ = ensure_session()
if not token:
    st.title("Org Structure")
    st.warning("Please login from the main page.")
    st.stop()

st.title("Organizational Structure")

headers = get_headers()
depts = fetch_departments(_headers=headers)

tab1, tab2 = st.tabs(["🌳 Hierarchy View", "⚙️ Manage Structure"])

with tab1:
    st.subheader("Company Hierarchy")
    if not depts:
        st.info("No departments found. Go to 'Manage Structure' to add one.")
    
    from api_client import get_employees
    emp_data = get_employees(page=1, size=1000, _headers=headers)
    all_emps = emp_data.get("items", [])

    for d in depts:
        dept_emps = [e for e in all_emps if any(e.get("team_id") == t["id"] for dv in d["divisions"] for t in dv["teams"])]
        with st.expander(f"🏢 **Department: {d['name']}**", expanded=True):
            if not d["divisions"]:
                st.write("  *No divisions*")
            for dv in d["divisions"]:
                st.markdown(f"&nbsp;&nbsp;&nbsp;&nbsp;📂 **Division: {dv['name']}**")
                if not dv["teams"]:
                    st.markdown("&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;*No teams*")
                for t in dv["teams"]:
                    team_emps = [e for e in all_emps if e.get("team_id") == t["id"]]
                    st.markdown(f"&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;👥 **Team: {t['name']}** ({len(team_emps)} members)")
                    for te in team_emps:
                        st.markdown(f"&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;👤 {te['display_name']}")
    
    unassigned = [e for e in all_emps if not e.get("team_id")]
    if unassigned:
        with st.expander(f"❓ Unassigned ({len(unassigned)})"):
            for ue in unassigned:
                st.markdown(f"👤 {ue['display_name']} ({ue['email'] or 'No Email'})")

with tab2:
    # 1. Departments Management
    st.header("Departments")
    with st.expander("➕ Add New Department"):
        new_dept_name = st.text_input("Department Name", key="new_dept")
        if st.button("Create Department"):
            if new_dept_name:
                if create_department(new_dept_name):
                    st.success(f"Created {new_dept_name}")
                    st.rerun()
                else: st.error("Failed")

    if depts:
        dept_to_edit = st.selectbox("Select Department to Edit/Delete", options=depts, format_func=lambda x: x["name"])
        col1, col2 = st.columns(2)
        with col1:
            new_name = st.text_input("New Name", value=dept_to_edit["name"])
            if st.button("Update Department Name"):
                if update_department(dept_to_edit["id"], new_name):
                    st.success("Updated")
                    st.rerun()
        with col2:
            st.warning("Danger Zone")
            if st.button("Delete Department", type="secondary"):
                if delete_department(dept_to_edit["id"]):
                    st.success("Deleted")
                    st.rerun()

    st.divider()
    # 2. Divisions Management
    st.header("Divisions")
    with st.expander("➕ Add New Division"):
        if depts:
            div_parent_dept = st.selectbox("Parent Department", options=depts, format_func=lambda x: x["name"], key="div_p")
            new_div_name = st.text_input("Division Name", key="new_div")
            if st.button("Create Division"):
                if new_div_name:
                    if create_division(new_div_name, div_parent_dept["id"]):
                        st.success(f"Created {new_div_name}")
                        st.rerun()
        else: st.info("Create a department first.")

    all_divisions = []
    for d in depts:
        for dv in d["divisions"]:
            dv["dept_name"] = d["name"]
            all_divisions.append(dv)

    if all_divisions:
        div_to_edit = st.selectbox("Select Division to Edit/Delete", options=all_divisions, format_func=lambda x: f"{x['dept_name']} -> {x['name']}")
        col1, col2 = st.columns(2)
        with col1:
            new_div_name_val = st.text_input("New Division Name", value=div_to_edit["name"])
            new_div_parent = st.selectbox("Move to Department", options=depts, index=[d["id"] for d in depts].index(div_to_edit["department_id"]), format_func=lambda x: x["name"])
            if st.button("Update Division"):
                if update_division(div_to_edit["id"], new_div_name_val, new_div_parent["id"]):
                    st.success("Updated")
                    st.rerun()
        with col2:
            st.warning("Danger Zone")
            if st.button("Delete Division"):
                if delete_division(div_to_edit["id"]):
                    st.success("Deleted")
                    st.rerun()

    st.divider()
    # 3. Teams Management
    st.header("Teams")
    from api_client import get_all_users
    all_users_data = get_all_users(size=1000, _headers=headers)
    all_users = all_users_data.get("items", [])
    user_options = {0: "None"}
    for u in all_users:
        user_options[u["id"]] = f"{u['full_name']} ({u['role']})"

    with st.expander("➕ Add New Team"):
        if all_divisions:
            team_parent_div = st.selectbox("Parent Division", options=all_divisions, format_func=lambda x: f"{x['dept_name']} -> {x['name']}", key="team_p")
            new_team_name = st.text_input("Team Name", key="new_team")
            new_team_pm = st.selectbox("Assign PM", options=list(user_options.keys()), format_func=lambda x: user_options[x], key="new_team_pm")
            new_team_period = st.selectbox("Reporting Period", options=["weekly", "bi-weekly", "monthly"], key="new_team_period")
            
            if st.button("Create Team"):
                if new_team_name:
                    # Note: create_team needs to support these new params
                    from api_client import BACKEND_URL, get_headers
                    import requests
                    payload = {
                        "name": new_team_name, 
                        "division_id": team_parent_div["id"],
                        "pm_id": new_team_pm if new_team_pm != 0 else None,
                        "reporting_period": new_team_period
                    }
                    response = requests.post(f"{BACKEND_URL}/org/teams", json=payload, headers=get_headers())
                    if response.status_code == 200:
                        st.success(f"Created {new_team_name}")
                        st.rerun()
                    else: st.error("Failed to create team")
        else: st.info("Create a division first.")

    all_teams = []
    for d in depts:
        for dv in d["divisions"]:
            for t in dv["teams"]:
                t["div_name"] = dv["name"]
                t["dept_name"] = d["name"]
                all_teams.append(t)

    if all_teams:
        team_to_edit = st.selectbox("Select Team to Edit/Delete", options=all_teams, format_func=lambda x: f"{x['dept_name']} -> {x['div_name']} -> {x['name']}")
        col1, col2 = st.columns(2)
        with col1:
            new_team_name_val = st.text_input("New Team Name", value=team_to_edit["name"])
            new_team_parent = st.selectbox("Move to Division", options=all_divisions, index=[dv["id"] for dv in all_divisions].index(team_to_edit["division_id"]), format_func=lambda x: f"{x['dept_name']} -> {x['name']}")
            
            # Get current PM index
            current_pm_id = team_to_edit.get("pm_id") or 0
            pm_list = list(user_options.keys())
            try:
                pm_index = pm_list.index(current_pm_id)
            except ValueError:
                pm_index = 0
                
            new_team_pm_val = st.selectbox("Assign PM", options=pm_list, index=pm_index, format_func=lambda x: user_options[x], key="edit_team_pm")
            
            # Period selection
            periods = ["weekly", "bi-weekly", "monthly"]
            curr_period = team_to_edit.get("reporting_period", "weekly")
            period_index = periods.index(curr_period) if curr_period in periods else 0
            new_team_period_val = st.selectbox("Reporting Period", options=periods, index=period_index, key="edit_team_period")

            if st.button("Update Team"):
                if update_team(
                    team_to_edit["id"], 
                    name=new_team_name_val, 
                    division_id=new_team_parent["id"],
                    pm_id=new_team_pm_val if new_team_pm_val != 0 else None,
                    reporting_period=new_team_period_val
                ):
                    st.success("Updated")
                    st.rerun()
        with col2:
            st.warning("Danger Zone")
            if st.button("Delete Team"):
                if delete_team(team_to_edit["id"]):
                    st.success("Deleted")
                    st.rerun()
