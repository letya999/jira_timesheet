import streamlit as st
from api_client import (
    assign_unit_role,
    create_approval_route,
    create_org_unit,
    create_role,
    delete_approval_route,
    delete_org_unit,
    delete_role,
    fetch_approval_routes,
    fetch_org_units,
    fetch_roles,
    fetch_unit_roles,
    get_all_users,
    get_headers,
    remove_unit_role,
    update_org_unit,
)
from auth_utils import ensure_session, get_user_role
from i18n import t

st.set_page_config(page_title=t("org.org_roles_management", page_icon="logo.png"), layout="wide")

token, _ = ensure_session()
if not token:
    st.title(t("common.org_structure"))
    st.warning(t("auth.please_login"))
    st.stop()

role = get_user_role()
if role != "Admin":
    st.title(t("common.org_structure"))
    st.error(t("org.access_denied"))
    st.stop()

st.title(t("org.management_title"))

headers = get_headers()

tab1, tab2, tab3 = st.tabs([
    t("org.company_hierarchy_tab"),
    t("org.manage_structure_roles_tab"),
    t("org.approval_workflows_tab")
])

def build_tree(units, parent_id=None):
    return [u for u in units if u.get("parent_id") == parent_id]

def render_node(unit, all_units, level=0):
    indent = "&nbsp;" * (level * 8)
    period = t(f"org.{unit.get('reporting_period', 'weekly')}")
    st.markdown(f"{indent}📂 **{unit['name']}** ({t('org.reporting_period')}: {period})")

    children = build_tree(all_units, unit["id"])
    for child in children:
        render_node(child, all_units, level + 1)

with tab1:
    st.subheader(t("org.current_hierarchy"))
    units = fetch_org_units(_headers=headers)
    if not units:
        st.info(t("org.no_units"))
    else:
        root_nodes = build_tree(units, None)
        for root in root_nodes:
            with st.expander(f"🏢 {root['name']}", expanded=True):
                children = build_tree(units, root["id"])
                for child in children:
                    render_node(child, units, 1)

with tab2:
    st.header(t("org.manage_units"))

    units = fetch_org_units(_headers=headers)
    unit_options = {u["id"]: u["name"] for u in units}
    unit_options[None] = t("org.none_root")

    with st.expander(t("org.add_unit")):
        new_name = st.text_input(t("org.unit_name"), key="new_unit")
        new_parent = st.selectbox(
            t("org.parent_unit"),
            options=list(unit_options.keys()),
            format_func=lambda x: unit_options[x],
            key="new_unit_parent"
        )
        new_period = st.selectbox(
            t("org.reporting_period"),
            ["weekly", "biweekly", "monthly"],
            format_func=lambda x: t(f"org.period_{x}"),
            key="new_unit_period"
        )

        if st.button(t("org.create_unit")):
            if new_name:
                if create_org_unit(new_name, new_parent, new_period):
                    st.success(f"{t('common.create')}: {new_name}")
                    st.rerun()

    if units:
        st.subheader(t("org.edit_delete_unit"))
        unit_to_edit = st.selectbox(
            t("org.select_unit"),
            options=units,
            format_func=lambda x: x["name"],
            key="edit_unit_select"
        )

        col1, col2 = st.columns(2)
        with col1:
            edit_name = st.text_input(t("common.name"), value=unit_to_edit["name"])

            valid_parents = {k: v for k, v in unit_options.items() if k != unit_to_edit["id"]}
            edit_parent = st.selectbox(
                t("org.parent_unit"),
                options=list(valid_parents.keys()),
                index=list(valid_parents.keys()).index(unit_to_edit.get("parent_id")),
                format_func=lambda x: valid_parents[x],
                key="edit_unit_parent"
            )
            edit_period = st.selectbox(
                t("org.reporting_period"),
                ["weekly", "biweekly", "monthly"],
                index=["weekly", "biweekly", "monthly"].index(
                    unit_to_edit.get("reporting_period", "weekly")
                ),
                format_func=lambda x: t(f"org.period_{x}"),
                key="edit_unit_period"
            )

            if st.button(t("org.update_unit")):
                if update_org_unit(unit_to_edit["id"], edit_name, edit_parent, edit_period):
                    st.success(t("common.success"))
                    st.rerun()
        with col2:
            st.warning(t("org.danger_zone"))
            if st.button(t("org.delete_unit"), type="primary"):
                if delete_org_unit(unit_to_edit["id"]):
                    st.success(t("common.delete"))
                    st.rerun()

    st.divider()

    st.header(t("org.manage_roles"))
    roles = fetch_roles(_headers=headers)

    with st.expander(t("org.add_role")):
        new_role_name = st.text_input(t("org.role_name"), key="new_role")
        if st.button(t("org.create_role")):
            if new_role_name:
                if create_role(new_role_name):
                    st.success(t("common.success"))
                    st.rerun()

    if roles:
        role_to_delete = st.selectbox(
            t("org.select_role_delete"),
            options=roles,
            format_func=lambda x: x["name"],
            key="delete_role_select"
        )
        if st.button(t("org.delete_role"), type="primary"):
            if role_to_delete.get("is_system"):
                st.error(t("org.cannot_delete_system_roles"))
            else:
                if delete_role(role_to_delete["id"]):
                    st.success(t("common.delete"))
                    st.rerun()

    st.divider()

    st.header(t("org.assign_roles_title"))
    if units and roles:
        selected_unit = st.selectbox(
            t("org.select_unit_assign"),
            options=units,
            format_func=lambda x: x["name"],
            key="assign_unit"
        )

        users_data = get_all_users(size=1000, _headers=headers)
        users = users_data.get("items", [])

        st.write(f"{t('org.manage_roles')} in **{selected_unit['name']}**:")
        assignments = fetch_unit_roles(selected_unit["id"])

        if assignments:
            for ass in assignments:
                u_name = next((u["full_name"] for u in users if u["id"] == ass["user_id"]), f"User ID {ass['user_id']}")
                r_name = ass["role"]["name"] if "role" in ass else f"Role {ass['role_id']}"
                col_a, col_b = st.columns([3, 1])
                with col_a:
                    st.write(f"- **{u_name}** is **{r_name}**")
                with col_b:
                    if st.button(t("common.delete"), key=f"del_ass_{ass['id']}"):
                        if remove_unit_role(ass["id"]):
                            st.rerun()
        else:
            st.info(t("org.no_roles_assigned"))

        with st.expander(t("org.assign_new_role")):
            user_id = st.selectbox(
                t("common.employee"),
                options=[u["id"] for u in users],
                format_func=lambda x: next(
                    (u["full_name"] for u in users if u["id"] == x), ""
                ),
                key="assign_role_user"
            )
            role_id = st.selectbox(
                t("common.role"),
                options=[r["id"] for r in roles],
                format_func=lambda x: next(
                    (r["name"] for r in roles if r["id"] == x), ""
                ),
                key="assign_role_role"
            )

            if st.button(t("org.assign_new_role")):
                if assign_unit_role(selected_unit["id"], user_id, role_id):
                    st.success(t("common.success"))
                    st.rerun()

with tab3:
    st.header(t("org.workflows_config"))
    st.write(t("org.workflows_desc"))

    units = fetch_org_units(_headers=headers)
    roles = fetch_roles(_headers=headers)

    if units and roles:
        sel_unit = st.selectbox(t("org.select_unit"), options=units, format_func=lambda x: x["name"], key="wf_unit")
        target_type = st.radio(t("org.target_type"), ["leave", "timesheet"], format_func=lambda x: t(f"org.target_{x}"))

        st.subheader(f"{t('org.workflows_config')}: {t('org.target_' + target_type)} in {sel_unit['name']}")
        routes = fetch_approval_routes(sel_unit["id"], target_type)

        if routes:
            for r in routes:
                r_name = r["role"]["name"] if "role" in r else f"Role {r['role_id']}"
                col_x, col_y = st.columns([3, 1])
                with col_x:
                    st.write(f"**Step {r['step_order']}:** Requires **{r_name}** {t('common.approve')}.")
                with col_y:
                    if st.button(t("common.delete"), key=f"del_rt_{r['id']}"):
                        if delete_approval_route(r["id"]):
                            st.rerun()
        else:
            st.info(t("approvals.period_not_initiated")) # Reusing a close enough key or could add a new one

        with st.form("add_route_form"):
            st.write(t("org.add_step"))
            step_order = st.number_input(t("org.step_order"), min_value=1, value=len(routes)+1)
            req_role = st.selectbox(
                t("org.required_role"),
                options=[r["id"] for r in roles],
                format_func=lambda x: next(
                    (rl["name"] for rl in roles if rl["id"] == x), ""
                ),
                key="wf_step_role"
            )

            if st.form_submit_button(t("org.add_step")):
                if create_approval_route(sel_unit["id"], target_type, step_order, req_role):
                    st.success(t("common.success"))
                    st.rerun()
