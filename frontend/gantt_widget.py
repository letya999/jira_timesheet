import calendar
import hashlib
from datetime import date, datetime, timedelta

import streamlit as st
from api_client import fetch_holidays
from dateutil.relativedelta import relativedelta
from i18n import t


def get_days_in_range(start_date: date, end_date: date):
    days = []
    curr = start_date
    while curr <= end_date:
        days.append(curr)
        curr += timedelta(days=1)
    return days


def get_user_color(user_name: str):
    """Generates a soft, pleasant color based on the user name."""
    hash_object = hashlib.md5(user_name.encode())
    hash_hex = hash_object.hexdigest()
    h = int(hash_hex[:3], 16) % 360
    s = 60 + (int(hash_hex[3:5], 16) % 20)
    lum = 65 + (int(hash_hex[5:7], 16) % 15)
    return f"hsl({h}, {s}%, {lum}%)"


def _get_gantt_styles(total_days: int):
    return f"""
    <style>
        .gantt-wrapper {{
            font-family: 'Inter', -apple-system, sans-serif;
            border: 1px solid #e0e0e0; border-radius: 12px;
            overflow-x: auto; background: #ffffff;
            box-shadow: 0 10px 25px rgba(0,0,0,0.08);
            display: flex; flex-direction: column; width: 100%; color: #2c3e50;
        }}
        .gantt-header-row {{
            display: flex; border-bottom: 2px solid #f0f0f0;
            background: #fcfcfc; position: sticky; top: 0; z-index: 100;
        }}
        .gantt-user-header {{
            width: 200px; min-width: 200px; border-right: 1px solid #eee;
            padding: 15px; font-weight: 700; font-size: 14px;
            display: flex; align-items: center; background: #fcfcfc;
            position: sticky; left: 0; z-index: 110; color: #666;
        }}
        .gantt-time-header {{ flex: 1; display: flex; flex-direction: column; }}
        .gantt-months {{
            display: grid; grid-template-columns: repeat({total_days}, minmax(25px, 1fr));
            border-bottom: 1px solid #eee;
        }}
        .gantt-month {{
            padding: 10px 5px; text-align: center; font-weight: 700;
            border-right: 1px solid #eee; font-size: 13px; background: #f8f9fa;
        }}
        .gantt-days {{ display: grid; grid-template-columns: repeat({total_days}, minmax(25px, 1fr)); }}
        .gantt-day {{
            text-align: center; padding: 8px 0; border-right: 1px solid #f0f0f0;
            font-size: 11px; display: flex; flex-direction: column; color: #777;
        }}
        .gantt-day.weekend, .gantt-day.holiday {{ background: #fdfdfd; color: #bbb; }}
        .gantt-day.holiday {{ color: #e07a5f; font-weight: bold; }}
        .gantt-day .dow {{ font-size: 9px; font-weight: 600; margin-top: 2px; }}
        .gantt-body {{ display: flex; flex-direction: column; max-height: 600px; overflow-y: auto; }}
        .gantt-row {{ display: flex; border-bottom: 1px solid #f0f0f0; height: 52px; }}
        .gantt-row:hover {{ background: #f9fbfe; }}
        .gantt-user-info {{
            width: 200px; min-width: 200px; border-right: 1px solid #eee;
            padding: 8px 15px; display: flex; align-items: center;
            background: #fff; position: sticky; left: 0; z-index: 50;
        }}
        .user-avatar {{
            width: 34px; height: 34px; border-radius: 10px; color: white;
            display: flex; align-items: center; justify-content: center;
            font-weight: 700; font-size: 14px; margin-right: 12px;
        }}
        .user-name {{ font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; }}
        .gantt-grid-container {{ flex: 1; display: grid; position: relative; }}
        .gantt-cell {{ border-right: 1px solid #f5f5f5; height: 100%; }}
        .gantt-cell.weekend-cell, .gantt-cell.holiday-cell {{ background: rgba(0, 0, 0, 0.015); }}
        .gantt-bars-container {{
            position: absolute; top: 0; left: 0; right: 0; bottom: 0;
            display: grid; grid-template-columns: repeat({total_days}, minmax(25px, 1fr));
            pointer-events: none; padding: 12px 0;
        }}
        .gantt-bar-wrapper {{ position: relative; padding: 0 1px; z-index: 10; }}
        .gantt-bar {{
            height: 28px; border-radius: 8px; pointer-events: auto;
            cursor: pointer; box-shadow: 2px 2px 5px rgba(0,0,0,0.1);
            position: relative; width: 100%;
        }}
        .gantt-bar:hover {{ transform: translateY(-2px); z-index: 1000; }}
        .gantt-tooltip {{
            visibility: hidden; width: 220px; background-color: #333; color: #fff;
            border-radius: 8px; padding: 12px; position: absolute; z-index: 2000;
            top: 125%; left: 50%; transform: translateX(-50%); opacity: 0;
            transition: opacity 0.3s; font-size: 12px; line-height: 1.5;
        }}
        .gantt-bar:hover .gantt-tooltip {{ visibility: visible; opacity: 1; }}
        .gantt-bar.pending {{
            opacity: 0.6;
            background-image: repeating-linear-gradient(45deg, transparent, transparent 10px,
                              rgba(255,255,255,0.3) 10px, rgba(255,255,255,0.3) 20px);
        }}
        @media (prefers-color-scheme: dark) {{
            .gantt-wrapper {{ background: #1a1a1b; border-color: #303030; color: #e1e1e1; }}
            .gantt-header-row, .gantt-user-header {{ background: #262627; border-color: #303030; }}
            .gantt-user-info {{ background: #1a1a1b; }}
            .gantt-tooltip {{ background-color: #eee; color: #222; }}
        }}
    </style>
    """


def _get_date_range(view_mode: str, base_date: date):
    if view_mode == "Day":
        return base_date, base_date
    if view_mode == "Week":
        start = base_date - timedelta(days=base_date.weekday())
        return start, start + timedelta(days=6)
    if view_mode == "Month":
        start = base_date.replace(day=1)
        _, num_days = calendar.monthrange(start.year, start.month)
        return start, start.replace(day=num_days)
    if view_mode == "Quarter":
        curr_q = (base_date.month - 1) // 3 + 1
        start = base_date.replace(month=3 * curr_q - 2, day=1)
        return start, start + relativedelta(months=3) - timedelta(days=1)
    return base_date.replace(month=1, day=1), base_date.replace(month=12, day=31)


def _get_holiday_dates(holiday_data):
    holiday_dates = {}
    for h in holiday_data or []:
        if h.get("is_holiday"):
            try:
                h_date = datetime.strptime(h["date"], "%Y-%m-%d").date()
                holiday_dates[h_date] = h.get("name", "Holiday")
            except (ValueError, TypeError):
                pass
    return holiday_dates


def _generate_gantt_headers(days, view_mode, holiday_dates, start_date):
    months_html, days_html = "", ""
    current_month, month_colspan = None, 0
    for d in days:
        if current_month != d.month:
            if current_month is not None:
                m_name = calendar.month_name[current_month]
                months_html += f"<div class='gantt-month' style='grid-column: span {month_colspan};'>{m_name}</div>"
            current_month, month_colspan = d.month, 1
        else:
            month_colspan += 1

        is_nw = d.weekday() >= 5 or d in holiday_dates
        cls = f"gantt-day {'weekend' if is_nw else ''} {'holiday' if d in holiday_dates else ''}".strip()
        if view_mode == "Year":
            days_html += f"<div class='{cls}'></div>"
        else:
            tip = f"{d.strftime('%b %d, %Y')}{' - ' + holiday_dates[d] if d in holiday_dates else ''}"
            days_html += (
                f"<div class='{cls}' title='{tip}'><div>{d.strftime('%d')}</div>"
                f"<div class='dow'>{calendar.day_abbr[d.weekday()][:2]}</div></div>"
            )

    if current_month is not None:
        m_label = f"{calendar.month_name[current_month]} {start_date.year if view_mode != 'Month' else ''}"
        months_html += f"<div class='gantt-month' style='grid-column: span {month_colspan};'>{m_label}</div>"
    return months_html, days_html


def _generate_user_row(u_name, user_leaves, days, start_date, end_date, holiday_dates, total_days):
    u_color = get_user_color(u_name)
    row_cells_list = []
    for i, d in enumerate(days):
        is_nw = d.weekday() >= 5 or d in holiday_dates
        cls = "weekend-cell" if is_nw else ""
        row_cells_list.append(f"<div class='gantt-cell {cls}' style='grid-column: {i + 1}'></div>")
    row_cells = "".join(row_cells_list)

    bars_html = ""
    for leaf in user_leaves:
        try:
            l_s = datetime.strptime(leaf["start_date"], "%Y-%m-%d").date()
            l_e = datetime.strptime(leaf["end_date"], "%Y-%m-%d").date()
        except (ValueError, TypeError):
            continue
        d_s, d_e = max(l_s, start_date), min(l_e, end_date)
        if d_s <= d_e:
            c_s, c_sp = (d_s - start_date).days + 1, (d_e - d_s).days + 1
            tip = (
                f"<div class='gantt-tooltip'><b>{t('leaves.' + leaf['type'].lower())}</b><br/>"
                f"{t('common.status')}: {t('common.status_' + leaf['status'].lower())}<br/>"
                f"{t('common.period')}: {leaf['start_date']} to {leaf['end_date']}</div>"
            )
            bars_html += (
                f"<div class='gantt-bar-wrapper' style='grid-column: {c_s} / span {c_sp};'>"
                f"<div class='gantt-bar {leaf['status'].lower()}' style='background: {u_color};'>{tip}</div></div>"
            )

    return f"""
    <div class="gantt-row">
        <div class="gantt-user-info">
            <div class="user-avatar" style="background: {u_color};">{u_name[0].upper()}</div>
            <div class="user-name" title="{u_name}">{u_name}</div>
        </div>
        <div class="gantt-grid-container" style="grid-template-columns: repeat({total_days}, minmax(25px, 1fr));">
            {row_cells}<div class="gantt-bars-container">{bars_html}</div>
        </div>
    </div>"""


def render_custom_gantt(leaves_data: list, view_mode: str = "Month", base_date: date = None):
    if base_date is None:
        base_date = date.today()
    start_date, end_date = _get_date_range(view_mode, base_date)
    days = get_days_in_range(start_date, end_date)
    total_days = len(days)

    holiday_dates = _get_holiday_dates(fetch_holidays(start_date, end_date))

    users = {}
    for leaf in leaves_data:
        u = leaf.get("user_full_name", f"User {leaf.get('user_id', 'Unknown')}")
        users.setdefault(u, []).append(leaf)

    months_html, days_html = _generate_gantt_headers(days, view_mode, holiday_dates, start_date)

    rows_html = ""
    for u_name in sorted(users.keys()):
        rows_html += _generate_user_row(
            u_name, users[u_name], days, start_date, end_date, holiday_dates, total_days
        )

    no_match = f"<div style='padding: 40px; text-align: center; color: #888;'>{t('leaves.no_match')}</div>"
    return f"""{_get_gantt_styles(total_days)}
    <div class="gantt-wrapper">
        <div class="gantt-header-row">
            <div class="gantt-user-header">{t("common.employee")}</div>
            <div class="gantt-time-header">
                <div class="gantt-months">{months_html}</div>
                <div class="gantt-days">{days_html}</div>
            </div>
        </div>
        <div class="gantt-body">{rows_html if rows_html else no_match}</div>
    </div>"""


def _get_gantt_title(bd, vm):
    if vm == "Day":
        return bd.strftime("%B %d, %Y")
    if vm == "Week":
        sw = bd - timedelta(days=bd.weekday())
        return f"{sw.strftime('%b %d')} - {(sw + timedelta(days=6)).strftime('%b %d, %Y')}"
    if vm == "Month":
        return f"{calendar.month_name[bd.month]} {bd.year}"
    if vm == "Quarter":
        return f"Q{(bd.month - 1) // 3 + 1} {bd.year}"
    return f"{bd.year}"


def _render_gantt_buttons():
    modes = ["Day", "Week", "Month", "Quarter", "Year"]
    c1, c2, c3, c4, _ = st.columns([1, 0.5, 0.5, 2, 2])
    with c1:
        idx = modes.index(st.session_state.gantt_view_mode)
        v_mode = st.selectbox(
            t("common.type"),
            modes,
            index=idx,
            format_func=lambda x: t(f"org.period_{x.lower()}"),
            label_visibility="collapsed",
        )
        if v_mode != st.session_state.gantt_view_mode:
            st.session_state.gantt_view_mode = v_mode
            st.rerun()

    def shift_date(delta):
        vm = st.session_state.gantt_view_mode
        bd = st.session_state.gantt_base_date
        if vm == "Day":
            st.session_state.gantt_base_date = bd + timedelta(days=1 * delta)
        elif vm == "Week":
            st.session_state.gantt_base_date = bd + timedelta(days=7 * delta)
        elif vm == "Month":
            st.session_state.gantt_base_date = bd + relativedelta(months=1 * delta)
        elif vm == "Quarter":
            st.session_state.gantt_base_date = bd + relativedelta(months=3 * delta)
        else:
            st.session_state.gantt_base_date = bd + relativedelta(years=1 * delta)
        st.rerun()

    with c2:
        if st.button("◀", key="gantt_prev", width="stretch"):
            shift_date(-1)
    with c3:
        if st.button("▶", key="gantt_next", width="stretch"):
            shift_date(1)
    with c4:
        if st.button(t("common.today"), type="primary", key="gantt_today", width="stretch"):
            st.session_state.gantt_base_date = date.today()
            st.rerun()


def render_gantt_with_controls(leaves_data):
    if "gantt_view_mode" not in st.session_state:
        st.session_state.gantt_view_mode = "Month"
    if "gantt_base_date" not in st.session_state:
        st.session_state.gantt_base_date = date.today()

    _render_gantt_buttons()

    bd, vm = st.session_state.gantt_base_date, st.session_state.gantt_view_mode
    st.markdown(f"#### {_get_gantt_title(bd, vm)}")
    grid_html = render_custom_gantt(leaves_data, vm, bd)
    st.components.v1.html(grid_html, height=500, scrolling=True)
