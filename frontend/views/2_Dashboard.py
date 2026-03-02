from datetime import datetime, timedelta

import pandas as pd
import requests
import streamlit as st
from api_client import fetch_dashboard, get_export_url, get_headers
from auth_utils import ensure_session
from i18n import t

# Check for session/cookies
token, _ = ensure_session()

st.title(t("dashboard.title"))

if not token:
    st.warning(t("auth.please_login"))
    st.stop()

col1, col2 = st.columns(2)
with col1:
    start_date = st.date_input(t("journal.start_date"), datetime.now().date() - timedelta(days=30))
with col2:
    end_date = st.date_input(t("journal.end_date"), datetime.now().date())

st.write(t("home.dashboard_desc"))

data = fetch_dashboard(start_date, end_date)
if data:
    df = pd.DataFrame(data)
    # Ensure Date is datetime
    df['Date'] = pd.to_datetime(df['Date'])

    # Rename ParentUnit to Department if it exists for consistency
    if "ParentUnit" in df.columns and "Department" not in df.columns:
        df = df.rename(columns={"ParentUnit": "Department"})

    view_type = st.selectbox(t("dashboard.select_view"), [
        t("dashboard.exec_view"),
        t("dashboard.utilization_view"),
        t("dashboard.financial_view"),
        t("dashboard.raw_data")
    ])

    if view_type == t("dashboard.exec_view"):
        st.subheader(t("dashboard.exec_report_title"))

        display_mode = st.radio(
            t("dashboard.display_mode"),
            [t("dashboard.list_view"), t("dashboard.comparison_view")],
            horizontal=True
        )
        granularity = st.radio(
            t("dashboard.time_granularity"),
            [t("dashboard.month"), t("dashboard.releases")],
            horizontal=True
        )
        col_to_use = "Month" if granularity == t("dashboard.month") else "Releases"

        # Calculate Capex and Opex
        df['Capex'] = df.apply(lambda x: x['Hours'] if x['Category'] == 'Capex' else 0, axis=1)
        df['Opex'] = df.apply(lambda x: x['Hours'] if x['Category'] == 'Opex' else 0, axis=1)

        if display_mode == t("dashboard.list_view"):
            # Group by OrgUnit, User, and the selected granularity
            # Calculate Min/Max dates for "Activity Dates"
            user_dates = df.groupby("User")["Date"].agg(['min', 'max']).reset_index()
            user_dates['Dates'] = user_dates.apply(
                lambda x: f"{x['min'].strftime('%d.%m')} - {x['max'].strftime('%d.%m')}",
                axis=1
            )

            group_cols = ["OrgUnit", "User", "Department", col_to_use]
            agg_df = df.groupby(group_cols).agg({
                'Hours': 'sum',
                'Capex': 'sum',
                'Opex': 'sum'
            }).reset_index()

            agg_df = agg_df.merge(user_dates[['User', 'Dates']], on='User', how='left')

            display_df = agg_df.copy().rename(columns={
                "User": t("common.employee"),
                "Department": t("common.department"),
                "Dates": t("common.date"),
                col_to_use: t("common.period"),
                "Hours": t("common.hours"),
                "Capex": t("common.capex"),
                "Opex": t("common.opex")
            })

            rows = []
            for team, team_data in display_df.groupby("OrgUnit"):
                rows.append({
                    t("common.employee"): f"**{team}**",
                    t("common.date"): "",
                    t("common.department"): "",
                    t("common.period"): "",
                    t("common.hours"): team_data[t("common.hours")].sum(),
                    t("common.capex"): team_data[t("common.capex")].sum(),
                    t("common.opex"): team_data[t("common.opex")].sum(),
                    "is_header": True
                })
                for _, row in team_data.sort_values(t("common.employee")).iterrows():
                    rows.append({
                        t("common.employee"): row[t("common.employee")],
                        t("common.date"): row[t("common.date")],
                        t("common.department"): row[t("common.department")],
                        t("common.period"): row[t("common.period")],
                        t("common.hours"): row[t("common.hours")],
                        t("common.capex"): row[t("common.capex")],
                        t("common.opex"): row[t("common.opex")],
                        "is_header": False
                    })

            final_df = pd.DataFrame(rows)

            # Apply styling
            def apply_color(styler):
                # Color headers: if 'is_header' is True, make row bold and grey
                styler.apply(
                    lambda x: [
                        'background-color: #f0f2f6; font-weight: bold' if x['is_header'] else ''
                        for _ in x
                    ],
                    axis=1
                )
                # Color Capex (Green) and Opex (Red)
                styler.set_properties(subset=[t("common.capex")], **{'background-color': '#c6efce', 'color': '#006100'})
                styler.set_properties(subset=[t("common.opex")], **{'background-color': '#ffc7ce', 'color': '#9c0006'})
                return styler

            st.dataframe(
                final_df.style.pipe(apply_color),
                width="stretch",
                column_config={
                    "is_header": None, # Hides the column from the user
                    t("common.capex"): st.column_config.NumberColumn(format="%.1f"),
                    t("common.opex"): st.column_config.NumberColumn(format="%.1f"),
                    t("common.hours"): st.column_config.NumberColumn(format="%.1f", help=t("common.total")),
                }
            )

        else: # Release Comparison (Image 2)
            # Pivot table where Columns are Releases/Months
            pivot = df.pivot_table(
                index=["Department", "OrgUnit", "User"],
                columns=col_to_use,
                values="Hours",
                aggfunc="sum",
                fill_value=0
            ).reset_index()

            # Format to include OrgUnit Headers
            rows = []
            for team, team_data in pivot.groupby("OrgUnit"):
                # Header row
                header = {"User": f"**{team}**", "Department": "", "OrgUnit": team}
                for col in pivot.columns:
                    if col not in ["Department", "OrgUnit", "User"]:
                        header[col] = team_data[col].sum()
                rows.append(header)

                # Data rows
                for _, row in team_data.iterrows():
                    rows.append(row.to_dict())

            final_pivot = pd.DataFrame(rows).drop(columns=["OrgUnit"])
            final_pivot = final_pivot.rename(columns={
                "User": t("common.employee"),
                "Department": t("common.department")
            })

            st.dataframe(final_pivot, width="stretch")

    elif view_type == t("dashboard.utilization_view"):
        pivot = df.pivot_table(index="OrgUnit", columns="Type", values="Hours", aggfunc="sum", fill_value=0)
        st.dataframe(pivot)

    elif view_type == t("dashboard.financial_view"):
        pivot = df.pivot_table(
            index=["Department", "OrgUnit", "User"],
            columns="Category",
            values="Hours",
            aggfunc="sum",
            fill_value=0
        )
        st.dataframe(pivot)

    elif view_type == t("dashboard.raw_data"):
        st.dataframe(df)

else:
    st.info(t("dashboard.no_data"))

st.divider()

if st.button(t("dashboard.prepare_export")):
    # Since we can't easily download directly via button click due to Streamlit architecture,
    # we make an API call to get bytes and use st.download_button
    export_url = get_export_url(start_date, end_date)
    headers = get_headers()
    response = requests.get(export_url, headers=headers)
    if response.status_code == 200:
        st.download_button(
            label=t("dashboard.download_excel"),
            data=response.content,
            file_name=f"Timesheet_Report_{start_date}_to_{end_date}.xlsx",
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
    else:
        st.error(t("dashboard.export_failed"))
