import streamlit as st
from auth_utils import check_access

from ui_components import loading_skeleton, auto_refresh

def show_home():
    # Polling for live updates
    auto_refresh(interval_ms=30000, key="home_polling")
    
    st.markdown("""
        <style>
        .main-header {
            text-align: center;
            margin-bottom: 2rem;
        }
        .portal-container {
            padding: 1rem;
        }
        .card-container {
            background-color: #f8f9fa;
            border-radius: 12px;
            padding: 1.5rem;
            border: 1px solid #e9ecef;
            height: 250px;
            transition: all 0.3s ease;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }
        .card-container:hover {
            box-shadow: 0 10px 20px rgba(0,0,0,0.1);
            border-color: #0052cc;
            transform: translateY(-5px);
        }
        .card-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
        }
        .card-title {
            font-weight: bold;
            font-size: 1.2rem;
            color: #172b4d;
            margin-bottom: 0.5rem;
        }
        .card-desc {
            font-size: 0.9rem;
            color: #5e6c84;
            margin-bottom: 1rem;
        }
        </style>
    """, unsafe_allow_html=True)

    st.markdown("<div class='main-header'><h1>🚀 Jira Timesheet Portal</h1><p>Welcome to your resource management workspace</p></div>", unsafe_allow_html=True)

    # Define tiles configuration
    all_tiles = [
        {
            "title": "Journal",
            "icon": "📝",
            "desc": "Log your work hours, sync with Jira issues, and manage daily entries.",
            "page": "pages/1_Journal.py",
            "roles": ["Employee", "PM", "CEO", "Admin"]
        },
        {
            "title": "Dashboard",
            "icon": "📊",
            "desc": "Visual analytics of time distribution, team performance, and project status.",
            "page": "pages/2_Dashboard.py",
            "roles": ["PM", "CEO", "Admin"]
        },
        {
            "title": "Report Builder",
            "icon": "📈",
            "desc": "Generate detailed reports, filter data, and export to CSV/Excel.",
            "page": "pages/3_Report_Builder.py",
            "roles": ["Employee", "PM", "CEO", "Admin"]
        },
        {
            "title": "Control Sheet",
            "icon": "📋",
            "desc": "Monitor compliance and verify timesheets across the organization.",
            "page": "pages/8_Control_Sheet.py",
            "roles": ["PM", "CEO", "Admin"]
        },
        {
            "title": "Org Structure",
            "icon": "🌳",
            "desc": "Manage departments, divisions, and team hierarchies.",
            "page": "pages/4_Org_Structure.py",
            "roles": ["PM", "CEO", "Admin"]
        },
        {
            "title": "Employees",
            "icon": "👥",
            "desc": "Manage user roles, quotas, and Jira account mappings.",
            "page": "pages/5_Employees.py",
            "roles": ["PM", "CEO", "Admin"]
        },
        {
            "title": "Projects",
            "icon": "🏗️",
            "desc": "Configure project visibility and sync settings with Jira.",
            "page": "pages/6_Projects.py",
            "roles": ["PM", "CEO", "Admin"]
        },
        {
            "title": "Settings",
            "icon": "⚙️",
            "desc": "System-wide configurations and integration preferences.",
            "page": "pages/7_Settings.py",
            "roles": ["Admin"]
        }
    ]

    # Filter tiles based on access
    available_tiles = [t for t in all_tiles if check_access(t["roles"])]

    # Display tiles in a grid
    cols_per_row = 3
    for i in range(0, len(available_tiles), cols_per_row):
        cols = st.columns(cols_per_row)
        for j in range(cols_per_row):
            if i + j < len(available_tiles):
                tile = available_tiles[i + j]
                with cols[j]:
                    with st.container():
                        st.markdown(f"""
                            <div class='card-container'>
                                <div>
                                    <div class='card-icon'>{tile['icon']}</div>
                                    <div class='card-title'>{tile['title']}</div>
                                    <div class='card-desc'>{tile['desc']}</div>
                                </div>
                            </div>
                        """, unsafe_allow_html=True)
                        if st.button(f"Open {tile['title']}", key=f"btn_{tile['title']}", use_container_width=True):
                            st.switch_page(tile['page'])

if __name__ == "__main__":
    show_home()
