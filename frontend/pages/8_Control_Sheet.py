import streamlit as st
import pandas as pd
from datetime import datetime, timedelta
from api_client import fetch_dashboard, fetch_departments
from auth_utils import ensure_session

# Check for session
token, _ = ensure_session()

st.title("Лист контроля")

if not token:
    st.warning("Please login from the main page.")
    st.stop()

# Role check
from api_client import get_me
user_info = get_me()
if not user_info or user_info.get("role") not in ["Admin", "PM", "CEO"]:
    st.error("У вас нет прав для просмотра этой страницы.")
    st.stop()

# Filters
col1, col2 = st.columns(2)
with col1:
    # Select a date to determine the week
    selected_date = st.date_input("Выберите день недели", datetime.now().date())
    # Find Monday of that week
    start_of_week = selected_date - timedelta(days=selected_date.weekday())
    end_of_week = start_of_week + timedelta(days=4) # Friday
    
with col2:
    # Team filtering (using departments/teams)
    depts = fetch_departments()
    team_options = ["Все команды"]
    team_map = {}
    for d in depts:
        for div in d.get("divisions", []):
            for t in div.get("teams", []):
                name = f"{d['name']} > {t['name']}"
                team_options.append(name)
                team_map[name] = t['id']
                
    selected_team_label = st.selectbox("Команда", team_options)

show_activities = st.checkbox("Показать активности (детально по задачам)")

st.info(f"Период контроля: **{start_of_week.strftime('%d.%m.%Y')} (Пн)** — **{end_of_week.strftime('%d.%m.%Y')} (Пт)**")

# Fetch data for the whole week
data = fetch_dashboard(start_of_week, end_of_week)

if data:
    df = pd.DataFrame(data)
    df['Date'] = pd.to_datetime(df['Date']).dt.date
    
    # Filter by team if selected
    if selected_team_label != "Все команды":
        # We need to filter by team name or ID. 
        # In fetch_dashboard, 'Team' is the team name.
        team_name_only = selected_team_label.split(" > ")[-1]
        df = df[df['Team'] == team_name_only]

    if df.empty:
        st.warning("Нет данных для выбранных фильтров.")
    else:
        # Create a list of working days
        working_days = [start_of_week + timedelta(days=i) for i in range(5)]
        day_names = ["Пн", "Вт", "Ср", "Чт", "Пт"]
        day_cols = [f"{day_names[i]} ({d.strftime('%d.%m')})" for i, d in enumerate(working_days)]

        # Prepare pivot for hours
        pivot_hours = df.pivot_table(
            index=["User", "Team"],
            columns="Date",
            values="Hours",
            aggfunc="sum",
            fill_value=0
        ).reset_index()

        # Ensure all working days are present in columns
        for d in working_days:
            if d not in pivot_hours.columns:
                pivot_hours[d] = 0.0

        # Calculate Total
        pivot_hours["Итого (нед)"] = pivot_hours[working_days].sum(axis=1)

        # Build the display table
        display_rows = []
        for _, row in pivot_hours.iterrows():
            display_row = {
                "Сотрудник": row["User"],
                "Команда": row["Team"]
            }
            for i, d in enumerate(working_days):
                val = row[d]
                display_row[day_cols[i]] = val
            
            display_row["Итого (нед)"] = row["Итого (нед)"]
            display_rows.append(display_row)

        final_df = pd.DataFrame(display_rows)

        # Styling
        def style_hours(v):
            if isinstance(v, (int, float)):
                if v >= 8: return 'background-color: #c6efce; color: #006100' # Green
                if v > 0: return 'background-color: #ffeb9c; color: #9c5700' # Yellow
                return 'background-color: #ffc7ce; color: #9c0006' # Red
            return ''

        st.subheader("Сводка часов за неделю")
        st.dataframe(
            final_df.style.applymap(style_hours, subset=day_cols),
            width="stretch",
            column_config={
                "Итого (нед)": st.column_config.NumberColumn(format="%.1f")
            }
        )

        if show_activities:
            st.divider()
            st.subheader("Детальные активности")
            
            # Group by User and Day to show tasks
            for user in final_df["Сотрудник"].unique():
                with st.expander(f"Активности: {user}"):
                    user_df = df[df['User'] == user]
                    if not user_df.empty:
                        # Show a small table for the week
                        act_pivot = user_df.pivot_table(
                            index=["Task", "Category"],
                            columns="Date",
                            values="Hours",
                            aggfunc="sum",
                            fill_value=0
                        )
                        # Ensure all days
                        for d in working_days:
                            if d not in act_pivot.columns:
                                act_pivot[d] = 0.0
                        
                        # Reorder and rename columns
                        act_pivot = act_pivot[working_days]
                        act_pivot.columns = day_cols
                        st.table(act_pivot)
                    else:
                        st.write("Нет записей.")

else:
    st.info("Нет данных за выбранную неделю.")
