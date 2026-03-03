import streamlit as st
import vanna
from vanna.legacy.openai import OpenAI_Chat
from vanna.legacy.chromadb import ChromaDB_VectorStore
import pandas as pd
import os
import psycopg2
from auth_utils import check_access
from i18n import t

class MyVanna(ChromaDB_VectorStore, OpenAI_Chat):
    def __init__(self, config=None):
        # Default path for ChromaDB storage - MOVED OUTSIDE OF /app TO AVOID RE-RUNS
        storage_path = os.getenv("VANNA_STORAGE_PATH", "/vanna_storage")
        if not config:
            config = {}
        config['path'] = storage_path
        ChromaDB_VectorStore.__init__(self, config=config)
        OpenAI_Chat.__init__(self, config=config)

def get_db_conn_params():
    # Try to parse from DATABASE_URL first
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        try:
            import re
            match = re.match(r"postgresql(\+asyncpg)?://(?P<user>.*?):(?P<password>.*?)@(?P<host>.*?):(?P<port>\d+)/(?P<dbname>.*)", db_url)
            if match:
                return match.groupdict()
        except Exception:
            pass
    
    return {
        "user": os.getenv("POSTGRES_USER", "user"),
        "password": os.getenv("POSTGRES_PASSWORD", "password"),
        "host": os.getenv("POSTGRES_HOST", "db"),
        "port": os.getenv("POSTGRES_PORT", "5432"),
        "dbname": os.getenv("POSTGRES_DB", "timesheet")
    }

def init_vanna(api_key):
    vn = MyVanna(config={'api_key': api_key, 'model': 'gpt-4o'})
    params = get_db_conn_params()
    vn.connect_to_postgres(
        host=params['host'],
        dbname=params['dbname'],
        user=params['user'],
        password=params['password'],
        port=params['port']
    )
    return vn

def show_chat():
    st.title("🤖 AI Data Chat")
    st.markdown("Ask questions about your Jira Timesheet data in natural language.")

    if "openai_api_key" not in st.session_state:
        st.session_state.openai_api_key = os.getenv("OPENAI_API_KEY", "")

    # Configuration in expanders instead of sidebar
    col1, col2 = st.columns(2)
    with col1:
        with st.expander("⚙️ Settings"):
            api_key = st.text_input("OpenAI API Key", value=st.session_state.openai_api_key, type="password")
            if api_key:
                st.session_state.openai_api_key = api_key
            
            if st.button("Reset Chat"):
                st.session_state.messages = []
                st.rerun()
    
    with col2:
        if check_access(["Admin"]):
            with st.expander("🎓 Admin Training"):
                if st.button("Train / Sync Schema"):
                    if not st.session_state.openai_api_key:
                        st.error("Please provide OpenAI API Key first.")
                    else:
                        with st.spinner("Training Vanna..."):
                            vn = init_vanna(st.session_state.openai_api_key)
                            train_vanna(vn)
                            st.success("Vanna trained successfully!")

    if not st.session_state.openai_api_key:
        st.warning("Please enter your OpenAI API Key in Settings to start.")
        st.stop()

    if "vn" not in st.session_state or st.session_state.get("vn_api_key") != st.session_state.openai_api_key:
        st.session_state.vn = init_vanna(st.session_state.openai_api_key)
        st.session_state.vn_api_key = st.session_state.openai_api_key

    vn = st.session_state.vn

    if "messages" not in st.session_state:
        st.session_state.messages = []

    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])
            if "df" in message:
                st.dataframe(message["df"])
            if "sql" in message:
                with st.expander("Show SQL"):
                    st.code(message["sql"], language="sql")

    if prompt := st.chat_input("How many hours did each user log last week?"):
        st.session_state.messages.append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.markdown(prompt)

        with st.chat_message("assistant"):
            with st.spinner("Thinking..."):
                try:
                    sql = vn.generate_sql(prompt)
                    df = vn.run_sql(sql)
                    try:
                        answer = vn.generate_summary(prompt, df)
                    except Exception:
                        answer = "Here are the results for your query."
                    
                    st.markdown(answer)
                    if not df.empty:
                        st.dataframe(df)
                    
                    with st.expander("Show SQL"):
                        st.code(sql, language="sql")
                    
                    st.session_state.messages.append({
                        "role": "assistant", 
                        "content": answer, 
                        "df": df,
                        "sql": sql
                    })
                except Exception as e:
                    st.error(f"Error: {str(e)}")
                    st.session_state.messages.append({
                        "role": "assistant", 
                        "content": f"Sorry, I couldn't process that. Error: {str(e)}"
                    })

def train_vanna(vn):
    # Extensive Training with metadata for EVERY column
    
    # 1. Jira Users (Employees)
    vn.train(ddl="""
        CREATE TABLE jira_users (
            id SERIAL PRIMARY KEY, -- Unique internal ID
            jira_account_id VARCHAR(255) UNIQUE NOT NULL, -- Jira internal account ID
            display_name VARCHAR(255) NOT NULL, -- Full name of the employee
            email VARCHAR(255), -- Email address
            avatar_url VARCHAR(512), -- Profile picture URL
            is_active BOOLEAN DEFAULT TRUE, -- Whether the employee is currently working
            weekly_quota INTEGER DEFAULT 40, -- Expected hours per week
            org_unit_id INTEGER REFERENCES org_units(id) -- Team or Department ID
        );
        COMMENT ON TABLE jira_users IS 'Employees whose time is tracked in the system';
        COMMENT ON COLUMN jira_users.display_name IS 'Full name of the employee';
        COMMENT ON COLUMN jira_users.weekly_quota IS 'Contractual hours expected per week';
    """)

    # 2. Worklogs (Time entries)
    vn.train(ddl="""
        CREATE TABLE worklogs (
            id SERIAL PRIMARY KEY, -- Unique record ID
            jira_id VARCHAR(255), -- External Jira worklog ID
            type VARCHAR(50), -- Source type: JIRA or MANUAL
            date DATE NOT NULL, -- Date when the work was performed
            hours FLOAT NOT NULL, -- Duration in hours
            description VARCHAR(1024), -- Comment or task description
            status VARCHAR(50), -- Approval status: APPROVED, DRAFT, SUBMITTED, REJECTED
            category_id INTEGER REFERENCES worklog_categories(id), -- Link to work category
            jira_user_id INTEGER NOT NULL REFERENCES jira_users(id), -- Who performed the work
            issue_id INTEGER REFERENCES issues(id) -- On which task/issue
        );
        COMMENT ON TABLE worklogs IS 'Individual time logs performed by employees';
        COMMENT ON COLUMN worklogs.hours IS 'Number of hours spent on the task';
        COMMENT ON COLUMN worklogs.date IS 'The calendar date of the work performed';
    """)

    # 3. Projects
    vn.train(ddl="""
        CREATE TABLE projects (
            id SERIAL PRIMARY KEY, -- Internal ID
            jira_id VARCHAR(255), -- Jira internal ID
            key VARCHAR(50) UNIQUE NOT NULL, -- Project key (e.g., PROJ, MKT)
            name VARCHAR(255) NOT NULL, -- Display name of the project
            is_active BOOLEAN DEFAULT FALSE -- Whether the project is synced
        );
        COMMENT ON TABLE projects IS 'Jira projects synced to this system';
    """)

    # 4. Issues (Tasks)
    vn.train(ddl="""
        CREATE TABLE issues (
            id SERIAL PRIMARY KEY, -- Internal ID
            jira_id VARCHAR(255), -- Jira internal ID
            key VARCHAR(50) UNIQUE NOT NULL, -- Issue key (e.g., PROJ-123)
            summary VARCHAR(1024) NOT NULL, -- Task name/summary
            status VARCHAR(100), -- Jira status (To Do, Done, etc.)
            issue_type VARCHAR(50), -- Task, Story, Bug, Sub-task
            project_id INTEGER NOT NULL REFERENCES projects(id), -- Project link
            parent_id INTEGER REFERENCES issues(id) -- Parent task link for sub-tasks
        );
        COMMENT ON TABLE issues IS 'Individual tasks or tickets from Jira';
        COMMENT ON COLUMN issues.summary IS 'The name or title of the task';
    """)

    # 5. Org Units (Teams/Departments)
    vn.train(ddl="""
        CREATE TABLE org_units (
            id SERIAL PRIMARY KEY, -- Internal ID
            name VARCHAR(255) NOT NULL, -- Team or Department name
            parent_id INTEGER REFERENCES org_units(id), -- Parent unit for hierarchy
            reporting_period VARCHAR(50) -- weekly, biweekly, monthly
        );
        COMMENT ON TABLE org_units IS 'Organizational structure (Departments, Teams)';
    """)

    # 6. Categories (Capex/Opex)
    vn.train(ddl="""
        CREATE TABLE worklog_categories (
            id SERIAL PRIMARY KEY, -- Internal ID
            name VARCHAR(255) UNIQUE NOT NULL, -- Development, Meeting, etc.
            is_active BOOLEAN DEFAULT TRUE -- Whether category is available
        );
        COMMENT ON TABLE worklog_categories IS 'Standardized categories for time tracking';
    """)

    # 7. Sprints
    vn.train(ddl="""
        CREATE TABLE sprints (
            id SERIAL PRIMARY KEY,
            jira_id VARCHAR(255),
            name VARCHAR(255),
            state VARCHAR(50), -- active, closed, future
            start_date DATE,
            end_date DATE
        );
        COMMENT ON TABLE sprints IS 'Jira Sprints for agile tracking';
    """)

    # 8. Releases (Versions)
    vn.train(ddl="""
        CREATE TABLE releases (
            id SERIAL PRIMARY KEY,
            jira_id VARCHAR(255),
            name VARCHAR(255),
            project_id INTEGER REFERENCES projects(id),
            released BOOLEAN,
            release_date DATE
        );
        COMMENT ON TABLE releases IS 'Project releases or versions';
    """)

    # Documentation and Rules
    vn.train(documentation="""
        - Users/Employees: Found in 'jira_users'. Use 'display_name' for names.
        - Logging: Time is in 'worklogs.hours'.
        - Joining: worklogs -> jira_users (by jira_user_id), worklogs -> issues (by issue_id), issues -> projects (by project_id).
        - Teams: jira_users -> org_units (by org_unit_id).
        - Categories: worklogs -> worklog_categories (by category_id).
        - Capex: Usually means Development, Design, Research categories.
        - Opex: Usually means Meetings, Support, Documentation, Maintenance.
        - To find work for a project: JOIN worklogs ON worklogs.issue_id = issues.id JOIN issues ON issues.project_id = projects.id.
    """)

if __name__ == "__main__":
    show_chat()
