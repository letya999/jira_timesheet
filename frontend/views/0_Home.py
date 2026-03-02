import streamlit as st
from auth_utils import check_access
from i18n import t
from ui_components import auto_refresh


def show_home():
    # Polling for live updates
    auto_refresh(interval_ms=30000, key="home_polling")

    st.markdown(
        """
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
    """,
        unsafe_allow_html=True,
    )

    st.markdown(
        f"<div class='main-header'><h1>🚀 {t('home.title')}</h1><p>{t('home.welcome_text')}</p></div>",
        unsafe_allow_html=True,
    )

    # Define tiles configuration
    all_tiles = [
        {
            "title": t("common.journal"),
            "icon": "📝",
            "desc": t("home.journal_desc"),
            "page": "views/1_Journal.py",
            "roles": ["Employee", "PM", "CEO", "Admin"],
        },
        {
            "title": t("common.dashboard"),
            "icon": "📊",
            "desc": t("home.dashboard_desc"),
            "page": "views/2_Dashboard.py",
            "roles": ["PM", "CEO", "Admin"],
        },
        {
            "title": t("common.reports"),
            "icon": "📈",
            "desc": t("home.reports_desc"),
            "page": "views/3_Report_Builder.py",
            "roles": ["Employee", "PM", "CEO", "Admin"],
        },
        {
            "title": t("leaves.title"),
            "icon": "📅",
            "desc": t("leaves.title"),
            "page": "views/12_Leave_Requests.py",
            "roles": ["Employee", "PM", "CEO", "Admin"],
        },
        {
            "title": t("approvals.title"),
            "icon": "✅",
            "desc": t("approvals.title"),
            "page": "views/8_Approvals.py",
            "roles": ["PM", "CEO", "Admin"],
        },
        {
            "title": t("common.control_sheet"),
            "icon": "📋",
            "desc": t("home.control_sheet_desc"),
            "page": "views/8_Control_Sheet.py",
            "roles": ["PM", "CEO", "Admin"],
        },
        {
            "title": t("common.org_structure"),
            "icon": "🌳",
            "desc": t("home.org_structure_desc"),
            "page": "views/4_Org_Structure.py",
            "roles": ["PM", "CEO", "Admin"],
        },
        {
            "title": t("common.employees"),
            "icon": "👥",
            "desc": t("home.employees_desc"),
            "page": "views/5_Employees.py",
            "roles": ["PM", "CEO", "Admin"],
        },
        {
            "title": t("common.projects"),
            "icon": "🏗️",
            "desc": t("home.projects_desc"),
            "page": "views/6_Projects.py",
            "roles": ["PM", "CEO", "Admin"],
        },
        {
            "title": t("common.settings"),
            "icon": "⚙️",
            "desc": t("home.settings_desc"),
            "page": "views/7_Settings.py",
            "roles": ["Admin"],
        },
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
                        st.markdown(
                            f"""
                            <div class='card-container'>
                                <div>
                                    <div class='card-icon'>{tile["icon"]}</div>
                                    <div class='card-title'>{tile["title"]}</div>
                                    <div class='card-desc'>{tile["desc"]}</div>
                                </div>
                            </div>
                        """,
                            unsafe_allow_html=True,
                        )
                        if st.button(
                            t("home.open_btn", title=tile["title"]), key=f"btn_{tile['title']}", width="stretch"
                        ):
                            st.switch_page(tile["page"])


if __name__ == "__main__":
    show_home()
