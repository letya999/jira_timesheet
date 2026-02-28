import streamlit as st
import pandas as pd
from datetime import datetime, timedelta, date
from api_client import (
    fetch_dashboard, fetch_departments, fetch_my_teams, 
    fetch_team_periods, approve_timesheet, get_me, get_employees
)
from auth_utils import ensure_session

# Check for session
token, _ = ensure_session()

st.set_page_config(page_title="Мои команды", layout="wide")

st.title("👥 Мои команды (Лист контроля)")

if not token:
    st.warning("Пожалуйста, войдите в систему на главной странице.")
    st.stop()

# Role check
headers = {"Authorization": f"Bearer {token}"}
user_info = get_me()
if not user_info or user_info.get("role") not in ["Admin", "PM", "CEO"]:
    st.error("У вас нет прав для просмотра этой страницы.")
    st.stop()

is_admin = user_info.get("role") in ["Admin", "CEO"]
is_pm = user_info.get("role") == "PM"
can_manage = is_admin or is_pm

# --- Main Page Filters (Not Sidebar) ---
st.subheader("Фильтры")
col_f1, col_f2, col_f3 = st.columns(3)

with col_f1:
    selected_date = st.date_input("Выберите неделю", datetime.now().date())
    start_of_week = selected_date - timedelta(days=selected_date.weekday())
    end_of_week = start_of_week + timedelta(days=6)

with col_f2:
    team_options = ["Все мои команды" if not is_admin else "Все команды"]
    team_map = {}
    
    if is_admin:
        depts = fetch_departments(_headers=headers)
        for d in depts:
            for div in d.get("divisions", []):
                for t in div.get("teams", []):
                    name = f"{d['name']} > {t['name']}"
                    team_options.append(name)
                    team_map[name] = t['id']
    else:
        # PM case
        my_teams = fetch_my_teams()
        for t in my_teams:
            name = t['name']
            team_options.append(name)
            team_map[name] = t['id']
                
    selected_team_label = st.selectbox("Команда", team_options)
    selected_team_id = team_map.get(selected_team_label)

with col_f3:
    show_zero_hours = st.checkbox("Показать сотрудников без часов", value=True)
    show_only_submitted = st.checkbox("Только отправленные")

st.info(f"Период контроля: **{start_of_week.strftime('%d.%m.%Y')}** — **{end_of_week.strftime('%d.%m.%Y')}**")

# --- Fetch Data ---
with st.spinner("Загрузка данных..."):
    # Pass token explicitly
    worklogs_raw = fetch_dashboard(start_of_week, end_of_week, team_id=selected_team_id)
    periods_raw = fetch_team_periods(start_of_week, end_of_week, team_id=selected_team_id)
    
    # Fetch Team Members
    all_members = []
    try:
        if selected_team_id:
            all_members = get_employees(size=1000, team_id=selected_team_id, _headers=headers).get("items", [])
        elif is_admin:
            # If Admin and All Teams - fetch all employees
            all_members = get_employees(size=1000, _headers=headers).get("items", [])
        else:
            # PM case
            my_teams_data = fetch_my_teams()
            for t in my_teams_data:
                res_emp = get_employees(size=1000, team_id=t['id'], _headers=headers)
                all_members.extend(res_emp.get("items", []))
    except Exception as e:
        st.error(f"Ошибка получения списка сотрудников: {e}")

# Process Data
df_logs = pd.DataFrame(worklogs_raw) if worklogs_raw else pd.DataFrame(columns=["User ID", "User", "Team", "Date", "Hours"])
if not df_logs.empty:
    df_logs['Date'] = pd.to_datetime(df_logs['Date']).dt.date

period_status_map = {p['user_id']: p for p in periods_raw}

# Build Table Columns
working_days = [start_of_week + timedelta(days=i) for i in range(7)]
day_cols = [d.strftime("%a %d") for d in working_days]

summary_data = []
seen_user_ids = set()

# 1. Add team members
for m in all_members:
    uid = m.get("user_id")
    if not uid: continue 
    seen_user_ids.add(uid)
    row = {
        "User ID": uid,
        "User": m['display_name'],
        "Team": m.get("team_name", selected_team_label if selected_team_id else "Команда"),
        "Total": 0.0, "Status": "OPEN"
    }
    user_logs = df_logs[df_logs["User ID"] == uid] if not df_logs.empty else pd.DataFrame()
    for i, d in enumerate(working_days):
        day_h = user_logs[user_logs["Date"] == d]["Hours"].sum() if not user_logs.empty else 0.0
        row[day_cols[i]] = day_h
        row["Total"] += day_h
    p = period_status_map.get(uid)
    if p:
        row["Status"] = p['status']
        row["period_id"] = p['id']
    summary_data.append(row)

# 2. Add remaining users from logs
if not df_logs.empty:
    for uid in df_logs["User ID"].unique():
        if uid not in seen_user_ids:
            u_logs = df_logs[df_logs["User ID"] == uid]
            row = {"User ID": uid, "User": u_logs["User"].iloc[0], "Team": u_logs["Team"].iloc[0], "Total": 0.0, "Status": "OPEN"}
            for i, d in enumerate(working_days):
                day_h = u_logs[u_logs["Date"] == d]["Hours"].sum(); row[day_cols[i]] = day_h; row["Total"] += day_h
            p = period_status_map.get(uid); 
            if p: 
                row["Status"] = p['status']
                row["period_id"] = p['id']
            summary_data.append(row)
            seen_user_ids.add(uid)

if not summary_data:
    st.warning("Нет сотрудников для отображения.")
    st.stop()

pivot_hours = pd.DataFrame(summary_data)
if show_only_submitted: pivot_hours = pivot_hours[pivot_hours["Status"] == "SUBMITTED"]
if not show_zero_hours: pivot_hours = pivot_hours[pivot_hours["Total"] > 0]

if pivot_hours.empty:
    st.info("Нет данных по заданным фильтрам.")
    st.stop()

# --- Display ---
st.subheader("📊 Сводка за неделю")

def style_status(val):
    colors = {"OPEN": "color: gray;", "SUBMITTED": "color: #007bff; font-weight: bold;", "APPROVED": "color: #28a745; font-weight: bold;", "REJECTED": "color: #dc3545; font-weight: bold;"}
    return colors.get(val, "")

def style_hours(v):
    if isinstance(v, (int, float)):
        if v >= 8: return 'background-color: #d4edda; color: #155724'
        if v > 0: return 'background-color: #fff3cd; color: #856404'
        return 'background-color: #f8d7da; color: #721c24'
    return ''

st.dataframe(
    pivot_hours[["User", "Team"] + day_cols + ["Total", "Status"]].style
        .applymap(style_hours, subset=day_cols)
        .applymap(style_status, subset=["Status"]),
    use_container_width=True
)

st.divider()
st.subheader("🕵️ Проверка и Утверждение")

# Bulk
if can_manage:
    submitted = pivot_hours[pivot_hours["Status"] == "SUBMITTED"]
    if not submitted.empty:
        if st.button(f"✅ Утвердить все отправленные ({len(submitted)})"):
            success = 0
            for _, row in submitted.iterrows():
                if approve_timesheet(row['period_id'], "APPROVED"): success += 1
            st.success(f"Успешно: {success}"); st.rerun()

# Individual
for _, row in pivot_hours.iterrows():
    uid = row["User ID"]
    status = row["Status"]
    emoji = {"OPEN": "⚪", "SUBMITTED": "🔵", "APPROVED": "🟢", "REJECTED": "🔴"}.get(status, "❓")
    with st.expander(f"{emoji} {row['User']} — {row['Total']:.1f} ч. ({status})"):
        col_det, col_act = st.columns([3, 2])
        with col_det:
            st.write("**Детализация:**")
            u_logs = df_logs[df_logs["User ID"] == uid] if not df_logs.empty else pd.DataFrame()
            if not u_logs.empty:
                # Group like in My_Timesheet
                grid_data = {} # Key: (Category, Name), Value: {date: hours}
                for _, wl in u_logs.iterrows():
                    cat = wl.get("Category") or "Jira Task"
                    if wl.get("Type") == "JIRA":
                        name = f"{wl.get('Issue Key')} {wl.get('Task')}".strip()
                    else:
                        name = wl.get("Description") or "No description"
                    
                    key = (cat, name)
                    if key not in grid_data:
                        grid_data[key] = {d: 0.0 for d in working_days}
                    
                    wl_date = wl["Date"]
                    if wl_date in grid_data[key]:
                        grid_data[key][wl_date] += wl["Hours"]
                
                rows_det = []
                for (cat, name), day_values in grid_data.items():
                    r = {"Category": cat, "Name": name}
                    for d in working_days:
                        r[d.strftime("%a %d")] = day_values[d]
                    r["Total"] = sum(day_values.values())
                    rows_det.append(r)
                
                df_det = pd.DataFrame(rows_det)
                st.dataframe(
                    df_det,
                    hide_index=True,
                    use_container_width=True,
                    column_config={
                        "Category": st.column_config.TextColumn(width="small"),
                        "Name": st.column_config.TextColumn(width="large"),
                        "Total": st.column_config.NumberColumn(format="%.1f", width="small"),
                        **{d: st.column_config.NumberColumn(format="%.1f", width="small") for d in day_cols}
                    }
                )
            else: st.info("Логов нет.")
        with col_act:
            st.write("**Управление:**")
            p = period_status_map.get(uid)
            if not p: st.warning("Период не инициирован.")
            else:
                st.write(f"Текущий статус: **{status}**")
                if p.get('comment'): st.info(f"Комментарий сотрудника: {p['comment']}")
                
                # Management actions
                new_comment = st.text_input("Ваш комментарий", key=f"c_{uid}")
                b1, b2, b3 = st.columns(3)
                with b1:
                    if st.button("Принять", key=f"a_{uid}", type="primary"):
                        if approve_timesheet(p['id'], "APPROVED", new_comment): st.rerun()
                with b2:
                    if st.button("Отклонить", key=f"r_{uid}"):
                        if approve_timesheet(p['id'], "REJECTED", new_comment): st.rerun()
                with b3:
                    if st.button("Вернуть", key=f"re_{uid}"): 
                        if approve_timesheet(p['id'], "OPEN", new_comment): st.rerun()
