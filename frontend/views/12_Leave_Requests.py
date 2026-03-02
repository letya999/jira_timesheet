from datetime import date, datetime, timedelta

import pandas as pd
import streamlit as st
from api_client import (
    fetch_all_leaves,
    fetch_my_leaves,
    fetch_org_units,
    fetch_team_leaves,
    get_all_employees,
    get_me,
    submit_leave_request,
    update_leave_status,
)
from auth_utils import ensure_session
from gantt_widget import render_gantt_with_controls
from i18n import t

st.set_page_config(page_title=t("leaves.title", page_icon="logo.png"), layout="wide")

# Check for session
token, _ = ensure_session()

if not token:
    st.title(t("leaves.title"))
    st.warning(t("auth.please_login"))
    st.stop()

user_info = get_me()
if not user_info:
    st.error(t("auth.failed_user_info"))
    st.stop()

st.title(f"📅 {t('leaves.title')}")

is_admin = user_info.get("role") in ["Admin", "CEO"]

tab_titles = [t("leaves.my_leaves"), t("leaves.team_leaves")]
if is_admin:
    tab_titles.append(t("leaves.all_leaves_admin"))

tabs = st.tabs(tab_titles)

# --- MY LEAVES TAB ---
with tabs[0]:
    col1, col2 = st.columns([1, 2])

    with col1:
        st.subheader(t("leaves.submit_request"))
        with st.form("leave_request_form"):
            leave_type = st.selectbox(
                t("leaves.type"),
                options=["VACATION", "SICK_LEAVE", "DAY_OFF", "OTHER"],
                format_func=lambda x: t(f"leaves.{x.lower()}"),
            )
            start_date = st.date_input(t("leaves.start_date"), value=date.today())
            end_date = st.date_input(t("leaves.end_date"), value=date.today() + timedelta(days=1))
            reason = st.text_area(t("leaves.reason"), placeholder=t("leaves.optional"))

            submit_btn = st.form_submit_button(t("common.submit"), width="stretch", type="primary")

            if submit_btn:
                if end_date < start_date:
                    st.error(t("leaves.date_error"))
                else:
                    payload = {
                        "type": leave_type,
                        "start_date": start_date.isoformat(),
                        "end_date": end_date.isoformat(),
                        "reason": reason,
                    }
                    if submit_leave_request(payload):
                        st.success(t("leaves.request_submitted"))
                        st.rerun()
                    else:
                        st.error(t("leaves.request_failed"))

    with col2:
        st.subheader(t("leaves.my_leaves"))
        my_leaves = fetch_my_leaves()
        if my_leaves:
            df_my = pd.DataFrame(my_leaves)
            # Reorder and rename columns for display
            display_cols = ["type", "start_date", "end_date", "status", "comment"]
            df_display = df_my[display_cols].copy()
            df_display.columns = [
                t(f"leaves.{c}") if c in ["type", "start_date", "end_date", "status", "comment"] else c
                for c in display_cols
            ]

            st.dataframe(df_display, width="stretch", hide_index=True)
        else:
            st.info(t("leaves.no_requests"))

# --- TEAM LEAVES TAB ---
with tabs[1]:
    st.subheader(t("leaves.team_leaves"))
    team_leaves = fetch_team_leaves()
    all_company_leaves = fetch_all_leaves()

    if all_company_leaves:
        # 1. Filters Section
        with st.expander("🔍 " + t("common.filters"), expanded=False):
            f_col1, f_col2 = st.columns(2)
            f_col3, f_col4 = st.columns(2)

            with f_col1:
                # Employee search (Multi-select)
                employees = get_all_employees()
                emp_options = {
                    (e.get("display_name") or e.get("full_name") or f"User {e.get('user_id', e.get('id'))}"): e.get(
                        "user_id"
                    )
                    or e.get("id")
                    for e in employees
                }
                selected_emp_names = st.multiselect(
                    t("common.employees"), options=sorted(emp_options.keys()), placeholder=t("common.search")
                )
                selected_user_ids = [emp_options[name] for name in selected_emp_names]

            with f_col2:
                # Hierarchy filter
                org_units = fetch_org_units()
                unit_options = {u["name"]: u["id"] for u in org_units}
                selected_unit_names = st.multiselect(
                    t("common.department") if "department" in t("common.department") else "Org Unit",
                    options=sorted(unit_options.keys()),
                )
                selected_unit_ids = [unit_options[name] for name in selected_unit_names]

            with f_col3:
                # Status filter
                statuses = ["APPROVED", "PENDING", "REJECTED"]
                selected_statuses = st.multiselect(
                    t("leaves.status"),
                    options=statuses,
                    default=["APPROVED", "PENDING"],
                    format_func=lambda x: t(f"common.status_{x.lower()}"),
                )

            with f_col4:
                # Type filter
                types = ["VACATION", "SICK_LEAVE", "DAY_OFF", "OTHER"]
                selected_types = st.multiselect(
                    t("leaves.type"), options=types, default=types, format_func=lambda x: t(f"leaves.{x.lower()}")
                )

        # Apply Filters
        filtered_leaves = []
        for leaf in all_company_leaves:
            # Filter by User IDs
            if selected_user_ids and leaf["user_id"] not in selected_user_ids:
                continue

            # Filter by Org Units (using team_id in leaf if available, or fetching from employee data)
            if selected_unit_ids:
                # Team leaves usually have team_id or we can match via the employee list
                leaf_unit_id = leaf.get("team_id")
                if not leaf_unit_id:
                    # fallback: find unit from employee list
                    emp_data = next((e for e in employees if e["user_id"] == leaf["user_id"]), None)
                    leaf_unit_id = emp_data.get("team_id") if emp_data else None

                if leaf_unit_id not in selected_unit_ids:
                    continue

            # Filter by Status
            if selected_statuses and leaf["status"] not in selected_statuses:
                continue

            # Filter by Type
            if selected_types and leaf["type"] not in selected_types:
                continue

            filtered_leaves.append(leaf)

        # 1. Gantt Chart View
        st.markdown(f"### 📊 {t('leaves.gantt_chart')}")

        if filtered_leaves:
            render_gantt_with_controls(filtered_leaves)
        else:
            st.info(t("leaves.no_match"))

        st.divider()

        # 2. Approval List
        if team_leaves:
            st.markdown(f"### 📝 {t('leaves.team_leaves')} (Approvals)")
            for leaf in team_leaves:
                with st.container(border=True):
                    c1, c2, c3 = st.columns([0.4, 0.4, 0.2])
                    with c1:
                        st.markdown(f"**{leaf.get('user_full_name', 'Unknown')}**")
                        st.caption(f"{t('leaves.' + leaf['type'].lower())} | {leaf['start_date']} - {leaf['end_date']}")
                    with c2:
                        st.write(f"*{leaf['reason'] or t('common.not_found')}*")
                        status_color = (
                            "orange"
                            if leaf["status"] == "PENDING"
                            else "green"
                            if leaf["status"] == "APPROVED"
                            else "red"
                        )
                        st.markdown(
                            f"{t('common.status')}: **:{status_color}[{t('common.status_' + leaf['status'].lower())}]**"
                        )
                    with c3:
                        if leaf["status"] == "PENDING":
                            if st.button(t("leaves.approve"), key=f"app_{leaf['id']}", width="stretch"):
                                if update_leave_status(leaf["id"], "APPROVED"):
                                    st.success(t("common.success"))
                                    st.rerun()
                            if st.button(t("leaves.reject"), key=f"rej_{leaf['id']}", width="stretch"):
                                if update_leave_status(leaf["id"], "REJECTED"):
                                    st.rerun()
                        else:
                            st.button(t("leaves.approve"), disabled=True, key=f"app_d_{leaf['id']}", width="stretch")

    else:
        st.info(t("leaves.no_requests"))

# --- ALL LEAVES TAB (ADMIN) ---
if is_admin:
    with tabs[2]:
        st.subheader(t("leaves.all_leaves_admin"))
        all_leaves = fetch_all_leaves()

        if all_leaves:
            for leaf in all_leaves:
                exp_label = (
                    f"{leaf.get('user_full_name', t('common.unassigned'))} - "
                    f"{t('leaves.' + leaf['type'].lower())} "
                    f"({leaf['start_date']} {t('common.to').lower()} {leaf['end_date']}) - "
                    f"{t('common.status_' + leaf['status'].lower())}"
                )
                with st.expander(exp_label):
                    with st.form(f"edit_leaf_{leaf['id']}"):
                        c1, c2, c3 = st.columns(3)
                        with c1:
                            type_list = ["VACATION", "SICK_LEAVE", "DAY_OFF", "OTHER"]
                            idx_type = type_list.index(leaf["type"]) if leaf["type"] in type_list else 0
                            new_type = st.selectbox(
                                t("common.type"),
                                type_list,
                                index=idx_type,
                                format_func=lambda x: t(f"leaves.{x.lower()}"),
                                key=f"t_{leaf['id']}",
                            )

                            status_list = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"]
                            idx_status = status_list.index(leaf["status"]) if leaf["status"] in status_list else 0
                            new_status = st.selectbox(
                                t("common.status"),
                                status_list,
                                index=idx_status,
                                format_func=lambda x: t(f"common.status_{x.lower()}"),
                                key=f"s_{leaf['id']}",
                            )
                        with c2:
                            try:
                                s_date = datetime.strptime(leaf["start_date"], "%Y-%m-%d").date()
                                e_date = datetime.strptime(leaf["end_date"], "%Y-%m-%d").date()
                            except Exception:
                                s_date = date.today()
                                e_date = date.today()
                            new_start = st.date_input(t("common.from"), value=s_date, key=f"st_{leaf['id']}")
                            new_end = st.date_input(t("common.to"), value=e_date, key=f"en_{leaf['id']}")
                        with c3:
                            new_reason = st.text_area(
                                t("leaves.reason"), value=leaf["reason"] or "", height=68, key=f"r_{leaf['id']}"
                            )
                            new_comment = st.text_input(
                                t("leaves.comment"), value=leaf.get("comment") or "", key=f"c_{leaf['id']}"
                            )

                        if st.form_submit_button(t("common.save"), type="primary", use_container_width=True):
                            if new_end < new_start:
                                st.error(t("leaves.date_error"))
                            else:
                                if update_leave_status(
                                    leaf["id"],
                                    status=new_status,
                                    comment=new_comment,
                                    type=new_type,
                                    start_date=new_start.isoformat(),
                                    end_date=new_end.isoformat(),
                                    reason=new_reason,
                                ):
                                    st.success(t("common.success"))
                                    st.rerun()
                                else:
                                    st.error(t("common.error"))
        else:
            st.info(t("leaves.no_requests"))
