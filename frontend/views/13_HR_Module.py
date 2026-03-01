import streamlit as st
import pandas as pd
import io
from datetime import datetime, date, timedelta
from api_client import get_me, fetch_all_leaves, get_employees
from i18n import t
from auth_utils import ensure_session

st.set_page_config(page_title=t("leaves.hr_module"), layout="wide")

# Check for session
token, _ = ensure_session()

if not token:
    st.title(t("leaves.hr_module"))
    st.warning(t("auth.please_login"))
    st.stop()

user_info = get_me()
if not user_info or user_info["role"] not in ["Admin", "CEO"]:
    st.error(t("auth.no_permission"))
    st.stop()

st.title(f"🏢 {t('leaves.hr_module')}")

# --- FILTERS ---
with st.expander(t("leaves.hr_filters"), expanded=True):
    col1, col2, col3 = st.columns(3)
    with col1:
        start_date = st.date_input(t("journal.start_date"), value=date.today().replace(day=1))
    with col2:
        end_date = st.date_input(t("journal.end_date"), value=date.today() + timedelta(days=60))
    with col3:
        status_options = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"]
        status_filter = st.multiselect(
            t("common.status"), 
            options=status_options, 
            default=["APPROVED", "PENDING"],
            format_func=lambda x: t(f"common.status_{x.lower()}")
        )

# --- FETCH DATA ---
leaves = fetch_all_leaves(start_date=start_date.isoformat(), end_date=end_date.isoformat())

if leaves:
    df = pd.DataFrame(leaves)
    
    # Filter by status
    if status_filter:
        df = df[df["status"].isin(status_filter)]
    
    # Clean up for display
    display_df = df[["user_full_name", "type", "start_date", "end_date", "status", "reason"]].copy()
    display_df["status"] = display_df["status"].apply(lambda x: t(f"common.status_{x.lower()}"))
    display_df["type"] = display_df["type"].apply(lambda x: t(f"leaves.{x.lower()}"))
    display_df.columns = [t("common.employee"), t("common.type"), t("common.from"), t("common.to"), t("common.status"), t("common.comment")]
    
    st.subheader(t("leaves.found_records", count=len(display_df)))
    st.dataframe(display_df, width="stretch", hide_index=True)
    
    # --- EXPORT ---
    st.divider()
    col_ex1, col_ex2 = st.columns(2)
    
    with col_ex1:
        # Excel Export
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            display_df.to_excel(writer, index=False, sheet_name='Leaves')
        processed_data = output.getvalue()
        
        st.download_button(
            label=f"📥 {t('leaves.export_excel')}",
            data=processed_data,
            file_name=f"leaves_report_{start_date}_{end_date}.xlsx",
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            width="stretch"
        )
        
    with col_ex2:
        # Google Sheets Placeholder/Instructions
        st.info(t("leaves.google_sheets_info"))
        if st.button(f"🔗 {t('leaves.export_google')}", width="stretch"):
            st.warning(t("leaves.google_sheets_warning"))

else:
    st.info(t("journal.no_logs_found"))

# --- STATS ---
if leaves:
    st.divider()
    st.subheader(t("leaves.quick_stats"))
    sc1, sc2, sc3 = st.columns(3)
    sc1.metric(t("leaves.vacation"), len(df[df["type"] == "VACATION"]))
    sc2.metric(t("leaves.sick_leave"), len(df[df["type"] == "SICK_LEAVE"]))
    sc3.metric(t("leaves.pending_approvals"), len(df[df["status"] == "PENDING"]))
