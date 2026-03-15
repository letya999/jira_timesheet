# DEPRECATED: migrated to React /app/employees
import pandas as pd
import streamlit as st
from api_client import (
    fetch_org_units,
    get_employees,
    get_headers,
    get_me,
    promote_user,
    sync_users_from_jira,
    update_employee,
)
from auth_utils import ensure_session
from i18n import t

st.set_page_config(page_title=t("common.employees"), page_icon="logo.png", layout="wide")

token, _ = ensure_session()
if not token:
    st.title(t("common.employees"))
    st.warning(t("auth.please_login"))
    st.stop()

st.title(f"👥 {t('employees.title')}")

user_info = get_me()
if not user_info:
    st.error(t("auth.please_login"))
    st.stop()

headers = get_headers()
units = fetch_org_units(_headers=headers)

# Flatten teams for easy selection
unit_map = {0: t("common.unassigned")}
for u in units:
    unit_map[u["id"]] = u["name"]

# Search and Pagination State
if "employees_search" not in st.session_state:
    st.session_state["employees_search"] = ""
if "employees_page" not in st.session_state:
    st.session_state["employees_page"] = 1

search_query = st.text_input(f"🔍 {t('employees.search_hint')}", value=st.session_state["employees_search"])
if search_query != st.session_state["employees_search"]:
    st.session_state["employees_search"] = search_query
    st.session_state["employees_page"] = 1
    st.rerun()

tab_list, tab_hier = st.tabs([f"📋 {t('employees.list_view')}", f"🗂️ {t('org.hierarchy_view')}"])

with tab_list:
    # Actions
    col_sync, col_spacer, col_save = st.columns([0.3, 0.5, 0.2])
    
    with col_sync:
        if st.button(f"🔄 {t('employees.sync_jira')}"):
            with st.spinner(t("common.loading")):
                result = sync_users_from_jira()
                if result and result.get("status") == "success":
                    st.success(t("employees.sync_success", count=result.get("synced", 0)))
                    st.rerun()
                else:
                    error_msg = result.get("message") if result else t("common.error")
                    st.error(t("employees.sync_failed", error=error_msg))

    page_size = 20
    data = get_employees(
        page=st.session_state["employees_page"],
        size=page_size,
        search=st.session_state["employees_search"],
        _headers=headers,
    )
    users_list = data.get("items", [])
    total_count = data.get("total", 0)
    total_pages = data.get("pages", 1)

    st.write(t("employees.total_employees", count=total_count))

    if users_list:
        # We'll use a data editor to allow changing teams
        df = pd.DataFrame(users_list)

        # Map org_unit_id to path for display
        df["OrgUnit"] = df["org_unit_id"].apply(lambda x: unit_map.get(x, t("common.unassigned")))
        df[t("employees.system_access")] = df["user_id"].apply(
            lambda x: "✅ " + t("employees.has_access") if x else "❌ " + t("employees.no_access")
        )

        # Prepare for editor
        create_col = t("employees.create_system_user")
        df[create_col] = False

        columns_to_show = ["id", "display_name", "email", "OrgUnit", "is_active", t("employees.system_access")]
        if user_info.get("role") == "Admin":
            columns_to_show.append(create_col)

        df_editor = df[columns_to_show].copy()

        col_config = {
            "id": st.column_config.NumberColumn("ID", disabled=True),
            "display_name": st.column_config.TextColumn(t("common.name"), disabled=True),
            "email": st.column_config.TextColumn(t("common.email"), disabled=True),
            "OrgUnit": st.column_config.SelectboxColumn(
                t("common.department"), options=list(unit_map.values()), required=True
            ),
            "is_active": st.column_config.CheckboxColumn(t("common.active")),
            t("employees.system_access"): st.column_config.TextColumn(t("employees.system_access"), disabled=True),
        }

        if user_info.get("role") == "Admin":
            col_config[create_col] = st.column_config.CheckboxColumn(create_col, default=False)

        edited_df = st.data_editor(
            df_editor,
            column_config=col_config,
            width="stretch",
            hide_index=True,
            key="employees_editor",
        )

        st.write("") # Spacer

        # Modal-like display for new system users
        if "last_created_users" in st.session_state:
            st.success(t("employees.temp_password_title"))
            
            creds_text = ""
            for new_u in st.session_state["last_created_users"]:
                creds_text += f"👤 {new_u['display_name']} ({new_u['email']})\n"
                creds_text += f"   Пароль: {new_u['temporary_password']}\n\n"
            
            st.code(creds_text, language="text")

            if st.button(t("common.close")):
                del st.session_state["last_created_users"]
                st.rerun()

        with col_save:
            save_clicked = st.button(t("employees.save_changes"), type="primary", use_container_width=True)

        if save_clicked:
            updated_names = []
            created_users = []

            for i, row in edited_df.iterrows():
                original_row = df_editor.iloc[i]
                original_user = df.iloc[i]
                
                # Update employee details
                if row["OrgUnit"] != original_row["OrgUnit"] or row["is_active"] != original_row["is_active"]:
                    new_org_unit_id = next((tid for tid, path in unit_map.items() if path == row["OrgUnit"]), None)
                    success = update_employee(
                        row["id"],
                        org_unit_id=new_org_unit_id if new_org_unit_id != 0 else None,
                        is_active=row["is_active"],
                    )
                    if success:
                        updated_names.append(row["display_name"])

                # Create system account
                if user_info.get("role") == "Admin" and row.get(create_col) and not original_row.get(create_col):
                    if not original_user["user_id"]: # Only if they don't have access already
                        res = promote_user(row["id"])
                        if res:
                            created_users.append(res)
                            updated_names.append(row["display_name"] + " (Аккаунт)")

            if created_users:
                st.session_state["last_created_users"] = created_users

            if updated_names or created_users:
                st.success(t("employees.update_success", names=", ".join(updated_names)))
                st.rerun()
            else:
                st.info(t("employees.no_changes"))

        st.divider()

        # Pagination
        if total_pages > 1:
            cols = st.columns(5)
            with cols[2]:
                st.write(f"{t('common.page')} {st.session_state['employees_page']} {t('common.of')} {total_pages}")
            if cols[1].button(t("common.prev"), disabled=st.session_state["employees_page"] == 1):
                st.session_state["employees_page"] -= 1
                st.rerun()
            if cols[3].button(t("common.next"), disabled=st.session_state["employees_page"] >= total_pages):
                st.session_state["employees_page"] += 1
                st.rerun()

with tab_hier:
    st.subheader(t("org.hierarchy_view"))

    all_emp_data = get_employees(page=1, size=1000, search=st.session_state["employees_search"], _headers=headers)
    all_emps = all_emp_data.get("items", [])

    def render_emps_in_unit(units_list, current_unit_id, level=0):
        indent = "&nbsp;" * (level * 8)
        current_unit = next((u for u in units_list if u["id"] == current_unit_id), None)
        if current_unit:
            st.markdown(f"{indent}📂 **{current_unit['name']}**")

            unit_emps = [e for e in all_emps if e.get("org_unit_id") == current_unit_id]
            for e in unit_emps:
                st.markdown(f"{indent}&nbsp;&nbsp;&nbsp;&nbsp;👤 {e['display_name']}")

            children = [u for u in units_list if u.get("parent_id") == current_unit_id]
            for child in children:
                render_emps_in_unit(units_list, child["id"], level + 1)

    root_units = [u for u in units if not u.get("parent_id")]
    for root in root_units:
        with st.expander(f"🏢 {root['name']}", expanded=True):
            render_emps_in_unit(units, root["id"], 1)

    unassigned = [e for e in all_emps if not e.get("org_unit_id")]
    if unassigned and (not st.session_state["employees_search"] or any(ue for ue in unassigned)):
        with st.expander(f"🗑️ {t('org.unassigned_count', count=len(unassigned))}"):
            for ue in unassigned:
                st.markdown(f"👤 {ue['display_name']} ({ue['email'] or t('common.no')})")
