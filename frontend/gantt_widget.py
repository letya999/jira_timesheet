import streamlit as st
from datetime import datetime, timedelta, date
from dateutil.relativedelta import relativedelta
import calendar
import hashlib
from i18n import t
from api_client import fetch_holidays

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
    # Use parts of the hash to create an HSL color (soft/pastel)
    h = int(hash_hex[:3], 16) % 360
    s = 60 + (int(hash_hex[3:5], 16) % 20) # 60-80%
    l = 65 + (int(hash_hex[5:7], 16) % 15) # 65-80%
    return f"hsl({h}, {s}%, {l}%)"

def render_custom_gantt(leaves_data: list, view_mode: str = "Month", base_date: date = None):
    """
    Renders a custom HTML/CSS Gantt/Calendar hybrid widget.
    leaves_data: list of dicts with keys: user_full_name, start_date (YYYY-MM-DD), end_date (YYYY-MM-DD), status, type
    view_mode: 'Day', 'Week', 'Month', 'Quarter', 'Year'
    """
    if base_date is None:
        base_date = date.today()

    if view_mode == "Day":
        start_date = base_date
        end_date = base_date
    elif view_mode == "Week":
        # Start of week (Monday)
        start_date = base_date - timedelta(days=base_date.weekday())
        end_date = start_date + timedelta(days=6)
    elif view_mode == "Month":
        start_date = base_date.replace(day=1)
        _, num_days = calendar.monthrange(start_date.year, start_date.month)
        end_date = start_date.replace(day=num_days)
    elif view_mode == "Quarter":
        curr_quarter = (base_date.month - 1) // 3 + 1
        start_month = 3 * curr_quarter - 2
        start_date = base_date.replace(month=start_month, day=1)
        end_date = start_date + relativedelta(months=3) - timedelta(days=1)
    else: # Year
        start_date = base_date.replace(month=1, day=1)
        end_date = base_date.replace(month=12, day=31)

    days = get_days_in_range(start_date, end_date)
    total_days = len(days)

    holiday_data = fetch_holidays(start_date, end_date)
    holiday_dates = {}
    if holiday_data:
        for h in holiday_data:
            if h.get("is_holiday"):
                try:
                    h_date = datetime.strptime(h["date"], "%Y-%m-%d").date()
                    holiday_dates[h_date] = h.get("name", "Holiday")
                except (ValueError, TypeError):
                    pass

    # Group leaves by user
    users = {}
    for leaf in leaves_data:
        user = leaf.get("user_full_name", f"User {leaf.get('user_id', 'Unknown')}")
        if user not in users:
            users[user] = []
        users[user].append(leaf)

    # Sort users alphabetically
    sorted_users = sorted(users.keys())

    # Build Header HTML
    months_html = ""
    days_html = ""
    
    current_month = None
    month_colspan = 0
    
    for d in days:
        if current_month != d.month:
            if current_month is not None:
                month_name = calendar.month_name[current_month]
                months_html += f"<div class='gantt-month' style='grid-column: span {month_colspan};'>{month_name}</div>"
            current_month = d.month
            month_colspan = 1
        else:
            month_colspan += 1
            
        is_weekend = d.weekday() >= 5
        is_holiday = d in holiday_dates
        is_non_working = is_weekend or is_holiday
        
        # We can apply an additional class or just use the same weekend styling
        weekend_class = "weekend" if is_non_working else ""
        holiday_class = "holiday" if is_holiday else ""
        css_classes = f"gantt-day {weekend_class} {holiday_class}".strip()
        
        day_str = d.strftime("%d")
        dow_str = calendar.day_abbr[d.weekday()][:2]
        
        if view_mode == "Year":
            days_html += f"<div class='{css_classes}'></div>"
        else:
            d_str = d.strftime("%b %d, %Y")
            tooltip_str = d_str
            if is_holiday:
                tooltip_str += f" - {holiday_dates[d]}"
                
            days_html += f"<div class='{css_classes}' title='{tooltip_str}'><div>{day_str}</div><div class='dow'>{dow_str}</div></div>"
            
    if current_month is not None:
        month_name = calendar.month_name[current_month]
        month_label = f"{month_name} {start_date.year if view_mode != 'Month' else ''}"
        months_html += f"<div class='gantt-month' style='grid-column: span {month_colspan};'>{month_label}</div>"

    # Build Rows HTML
    rows_html = ""
    for user_name in sorted_users:
        user_leaves = users[user_name]
        user_color = get_user_color(user_name)
        
        row_cells = ""
        for i, d in enumerate(days):
            is_weekend = d.weekday() >= 5
            is_holiday = d in holiday_dates
            is_non_working = is_weekend or is_holiday
            
            weekend_class = "weekend-cell" if is_non_working else ""
            holiday_class = "holiday-cell" if is_holiday else ""
            css_classes = f"gantt-cell {weekend_class} {holiday_class}".strip()
            
            row_cells += f"<div class='{css_classes}' style='grid-column: {i+1}'></div>"
            
        # Place leaves exactly where they belong
        bars_html = ""
        for leaf in user_leaves:
            # Parse dates
            try:
                l_start = datetime.strptime(leaf["start_date"], "%Y-%m-%d").date()
                l_end = datetime.strptime(leaf["end_date"], "%Y-%m-%d").date()
            except (ValueError, TypeError):
                continue
            
            # Clip limits to view
            draw_start = max(l_start, start_date)
            draw_end = min(l_end, end_date)
            
            if draw_start <= draw_end:
                col_start = (draw_start - start_date).days + 1
                col_span = (draw_end - draw_start).days + 1
                
                status_class = leaf["status"].lower()
                type_class = leaf["type"].lower()
                
                # Tooltip content
                tooltip_html = f"""
                <div class='gantt-tooltip'>
                    <b>{t('leaves.' + leaf['type'].lower())}</b><br/>
                    {t('common.status')}: {t('common.status_' + leaf['status'].lower())}<br/>
                    {t('common.period')}: {leaf['start_date']} {t('common.to').lower()} {leaf['end_date']}<br/>
                    {t('common.comment')}: {leaf.get('reason') or t('common.na')}
                </div>
                """
                
                bars_html += f"""
                <div class='gantt-bar-wrapper' style='grid-column: {col_start} / span {col_span};'>
                    <div class='gantt-bar {status_class} {type_class}' style='background: {user_color};'>
                        {tooltip_html}
                    </div>
                </div>
                """

        rows_html += f"""
        <div class="gantt-row">
            <div class="gantt-user-info">
                <div class="user-avatar" style="background: {user_color};">{user_name[0].upper()}</div>
                <div class="user-name" title="{user_name}">{user_name}</div>
            </div>
            <div class="gantt-grid-container" style="grid-template-columns: repeat({total_days}, minmax(25px, 1fr));">
                {row_cells}
                <div class="gantt-bars-container">
                    {bars_html}
                </div>
            </div>
        </div>
        """

    html = f"""
    <style>
        .gantt-wrapper {{
            font-family: 'Inter', -apple-system, sans-serif;
            border: 1px solid #e0e0e0;
            border-radius: 12px;
            overflow-x: auto;
            overflow-y: hidden;
            background: #ffffff;
            box-shadow: 0 10px 25px rgba(0,0,0,0.08);
            display: flex;
            flex-direction: column;
            width: 100%;
            color: #2c3e50;
        }}
        .gantt-header-row {{
            display: flex;
            border-bottom: 2px solid #f0f0f0;
            background: #fcfcfc;
            position: sticky;
            top: 0;
            z-index: 100;
        }}
        .gantt-user-header {{
            width: 200px;
            min-width: 200px;
            border-right: 1px solid #eee;
            padding: 15px;
            font-weight: 700;
            font-size: 14px;
            display: flex;
            align-items: center;
            background: #fcfcfc;
            position: sticky;
            left: 0;
            z-index: 110;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        .gantt-time-header {{
            flex: 1;
            display: flex;
            flex-direction: column;
        }}
        .gantt-months {{
            display: grid;
            grid-template-columns: repeat({total_days}, minmax(25px, 1fr));
            border-bottom: 1px solid #eee;
        }}
        .gantt-month {{
            padding: 10px 5px;
            text-align: center;
            font-weight: 700;
            border-right: 1px solid #eee;
            font-size: 13px;
            color: #333;
            background: #f8f9fa;
        }}
        .gantt-days {{
            display: grid;
            grid-template-columns: repeat({total_days}, minmax(25px, 1fr));
        }}
        .gantt-day {{
            text-align: center;
            padding: 8px 0;
            border-right: 1px solid #f0f0f0;
            font-size: 11px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            color: #777;
        }}
        .gantt-day.weekend, .gantt-day.holiday {{
            background: #fdfdfd;
            color: #bbb;
        }}
        .gantt-day.holiday {{
            color: #e07a5f; /* slightly tinted for holiday */
            font-weight: bold;
        }}
        .gantt-day .dow {{
            font-size: 9px;
            font-weight: 600;
            margin-top: 2px;
            text-transform: uppercase;
        }}
        .gantt-body {{
            display: flex;
            flex-direction: column;
            max-height: 600px;
            min-height: 250px;
            overflow-y: auto;
        }}
        .gantt-row {{
            display: flex;
            border-bottom: 1px solid #f0f0f0;
            transition: background 0.2s;
            height: 52px;
        }}
        .gantt-row:hover {{
            background: #f9fbfe;
        }}
        .gantt-user-info {{
            width: 200px;
            min-width: 200px;
            border-right: 1px solid #eee;
            padding: 8px 15px;
            display: flex;
            align-items: center;
            background: #fff;
            position: sticky;
            left: 0;
            z-index: 50;
        }}
        .user-avatar {{
            width: 34px;
            height: 34px;
            border-radius: 10px;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 14px;
            margin-right: 12px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }}
        .user-name {{
            font-size: 13px;
            font-weight: 600;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            color: #444;
        }}
        .gantt-grid-container {{
            flex: 1;
            display: grid;
            position: relative;
        }}
        .gantt-cell {{
            border-right: 1px solid #f5f5f5;
            height: 100%;
        }}
        .gantt-cell.weekend-cell, .gantt-cell.holiday-cell {{
            background: rgba(0, 0, 0, 0.015);
        }}
        .gantt-cell.holiday-cell {{
            background: rgba(224, 122, 95, 0.05); /* very light tint for holiday background */
        }}
        .gantt-bars-container {{
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            display: grid;
            grid-template-columns: repeat({total_days}, minmax(25px, 1fr));
            pointer-events: none;
            padding: 12px 0;
        }}
        .gantt-bar-wrapper {{
            position: relative;
            padding: 0 1px;
            z-index: 10;
        }}
        .gantt-bar {{
            height: 28px;
            border-radius: 8px;
            pointer-events: auto;
            cursor: pointer;
            box-shadow: 2px 2px 5px rgba(0,0,0,0.1);
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            position: relative;
            width: 100%;
        }}
        .gantt-bar:hover {{
            transform: translateY(-2px);
            z-index: 1000;
            box-shadow: 0 8px 16px rgba(0,0,0,0.2);
        }}
        
        /* Tooltip Logic */
        .gantt-tooltip {{
            visibility: hidden;
            width: 220px;
            background-color: #333;
            color: #fff;
            text-align: left;
            border-radius: 8px;
            padding: 12px;
            position: absolute;
            z-index: 2000;
            top: 125%;
            left: 50%;
            transform: translateX(-50%);
            opacity: 0;
            transition: opacity 0.3s, visibility 0.3s;
            font-size: 12px;
            line-height: 1.5;
            box-shadow: 0 10px 20px rgba(0,0,0,0.3);
            pointer-events: none;
        }}
        .gantt-tooltip::after {{
            content: "";
            position: absolute;
            bottom: 100%;
            left: 50%;
            margin-left: -5px;
            border-width: 5px;
            border-style: solid;
            border-color: transparent transparent #333 transparent;
        }}
        .gantt-bar:hover .gantt-tooltip {{
            visibility: visible;
            opacity: 1;
        }}
        
        .gantt-bar.pending {{
            opacity: 0.6;
            background-image: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.3) 10px, rgba(255,255,255,0.3) 20px);
        }}
        
        /* Dark mode */
        @media (prefers-color-scheme: dark) {{
            .gantt-wrapper {{ background: #1a1a1b; border-color: #303030; color: #e1e1e1; }}
            .gantt-header-row, .gantt-user-header {{ background: #262627; border-color: #303030; color: #aaa; }}
            .gantt-month {{ background: #2d2d2e; border-color: #303030; color: #ddd; }}
            .gantt-day {{ border-color: #2a2a2a; color: #888; }}
            .gantt-day.weekend {{ background: #222; color: #555; }}
            .gantt-row {{ border-color: #2a2a2a; }}
            .gantt-row:hover {{ background: #2d2d30; }}
            .gantt-user-info {{ background: #1a1a1b; border-color: #303030; }}
            .gantt-user-name {{ color: #ccc; }}
            .gantt-cell {{ border-color: #252525; }}
            .gantt-cell.weekend-cell {{ background: rgba(255,255,255,0.01); }}
            .gantt-cell.holiday-cell {{ background: rgba(224, 122, 95, 0.08); }}
            .gantt-day.holiday {{ color: #f28b82; }}
            .gantt-tooltip {{ background-color: #eee; color: #222; }}
            .gantt-tooltip::after {{ border-color: transparent transparent #eee transparent; }}
        }}
    </style>
    
    <div class="gantt-wrapper">
        <div class="gantt-header-row">
            <div class="gantt-user-header">{t('common.employee')}</div>
            <div class="gantt-time-header">
                <div class="gantt-months">
                    {months_html}
                </div>
                <div class="gantt-days">
                    {days_html}
                </div>
            </div>
        </div>
        <div class="gantt-body">
            {rows_html if rows_html else f"<div style='padding: 40px; text-align: center; color: #888; font-style: italic;'>{t('leaves.no_match')}</div>"}
        </div>
    </div>
    """
    
    return html

def render_gantt_with_controls(leaves_data):
    # Setup state
    if "gantt_view_mode" not in st.session_state:
        st.session_state.gantt_view_mode = "Month"
    if "gantt_base_date" not in st.session_state:
        st.session_state.gantt_base_date = date.today()
        
    modes = ["Day", "Week", "Month", "Quarter", "Year"]
    
    col1, col2, col3, col4, col5 = st.columns([1, 0.5, 0.5, 2, 2])
    
    with col1:
        view_mode = st.selectbox(
            t("common.type"), 
            modes, 
            index=modes.index(st.session_state.gantt_view_mode),
            format_func=lambda x: t(f"org.period_{x.lower()}"),
            label_visibility="collapsed"
        )
        if view_mode != st.session_state.gantt_view_mode:
            st.session_state.gantt_view_mode = view_mode
            st.rerun()
            
    with col2:
        if st.button("◀", key="gantt_prev", width="stretch"):
            vm = st.session_state.gantt_view_mode
            if vm == "Day":
                st.session_state.gantt_base_date -= timedelta(days=1)
            elif vm == "Week":
                st.session_state.gantt_base_date -= timedelta(days=7)
            elif vm == "Month":
                st.session_state.gantt_base_date -= relativedelta(months=1)
            elif vm == "Quarter":
                st.session_state.gantt_base_date -= relativedelta(months=3)
            else:
                st.session_state.gantt_base_date -= relativedelta(years=1)
            st.rerun()
            
    with col3:
        if st.button("▶", key="gantt_next", width="stretch"):
            vm = st.session_state.gantt_view_mode
            if vm == "Day":
                st.session_state.gantt_base_date += timedelta(days=1)
            elif vm == "Week":
                st.session_state.gantt_base_date += timedelta(days=7)
            elif vm == "Month":
                st.session_state.gantt_base_date += relativedelta(months=1)
            elif vm == "Quarter":
                st.session_state.gantt_base_date += relativedelta(months=3)
            else:
                st.session_state.gantt_base_date += relativedelta(years=1)
            st.rerun()
            
    with col4:
        if st.button(t("common.today"), type="primary", key="gantt_today", width="stretch"):
            st.session_state.gantt_base_date = date.today()
            st.rerun()

    # Determine Title
    bd = st.session_state.gantt_base_date
    vm = st.session_state.gantt_view_mode
    if vm == "Day":
        title = bd.strftime("%B %d, %Y")
    elif vm == "Week":
        start_w = bd - timedelta(days=bd.weekday())
        end_w = start_w + timedelta(days=6)
        title = f"{start_w.strftime('%b %d')} - {end_w.strftime('%b %d, %Y')}"
    elif vm == "Month":
        title = f"{calendar.month_name[bd.month]} {bd.year}"
    elif vm == "Quarter":
        curr_quarter = (bd.month - 1) // 3 + 1
        title = f"Q{curr_quarter} {bd.year}"
    else:
        title = f"{bd.year}"
        
    st.markdown(f"#### {title}")
    
    # Render HTML
    grid_html = render_custom_gantt(leaves_data, st.session_state.gantt_view_mode, st.session_state.gantt_base_date)
    st.components.v1.html(grid_html, height=500, scrolling=True)
