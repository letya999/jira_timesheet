
# Version: 1.2 - Added Approvals & Periods
import requests
import os
import streamlit as st
from datetime import date, datetime

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000/api/v1")

def login(email, password):
    data = {"username": email, "password": password}
    response = requests.post(f"{BACKEND_URL}/auth/login", data=data)
    if response.status_code == 200:
        return response.json()
    return None

def get_headers():
    token = st.session_state.get("token")
    if token:
        return {"Authorization": f"Bearer {token}"}
    return {}

def fetch_timesheet(start_date=None, end_date=None, project_id=None, sprint_id=None, release_id=None, category=None, dept_id=None, div_id=None, team_id=None, sort_order="desc", page=1, size=50):
    params = {}
    if start_date: params["start_date"] = start_date
    if end_date: params["end_date"] = end_date
    if project_id: params["project_id"] = project_id
    if sprint_id: params["sprint_id"] = sprint_id
    if release_id: params["release_id"] = release_id
    if category: params["category"] = category
    if dept_id: params["dept_id"] = dept_id
    if div_id: params["div_id"] = div_id
    if team_id: params["team_id"] = team_id
    params["sort_order"] = sort_order
    params["page"] = page
    params["size"] = size
    
    response = requests.get(
        f"{BACKEND_URL}/timesheet/",
        params=params,
        headers=get_headers()
    )
    if response.status_code == 200:
        return response.json()
    return {"items": [], "total": 0, "page": 1, "size": 50, "pages": 0}

def add_manual_log(date, hours, category, description, user_id=None, issue_id=None):
    data = {
        "date": date.isoformat(),
        "hours": hours,
        "category": category,
        "description": description
    }
    if user_id: data["user_id"] = user_id
    if issue_id: data["issue_id"] = issue_id
    
    response = requests.post(
        f"{BACKEND_URL}/timesheet/manual",
        json=data,
        headers=get_headers()
    )
    return response.status_code == 200

def search_issues(search_query):
    response = requests.get(
        f"{BACKEND_URL}/projects/issues",
        params={"search": search_query},
        headers=get_headers()
    )
    if response.status_code == 200:
        return response.json()
    return []

def fetch_dashboard(start_date, end_date):
    response = requests.get(
        f"{BACKEND_URL}/reports/dashboard",
        params={"start_date": start_date, "end_date": end_date},
        headers=get_headers()
    )
    if response.status_code == 200:
        return response.json().get("data", [])
    return []

def fetch_custom_report(payload):
    response = requests.post(
        f"{BACKEND_URL}/reports/custom",
        json=payload,
        headers=get_headers()
    )
    if response.status_code == 200:
        return response.json().get("data", [])
    return []

@st.cache_data(ttl=600)
def fetch_report_categories(_headers=None):
    response = requests.get(f"{BACKEND_URL}/reports/categories", headers=_headers)
    return response.json() if response.status_code == 200 else []

@st.cache_data(ttl=600)
def fetch_report_sprints(_headers=None):
    response = requests.get(f"{BACKEND_URL}/reports/sprints", headers=_headers)
    return response.json() if response.status_code == 200 else []

@st.cache_data(ttl=600)
def get_all_employees(_headers=None):
    """Fetch all Jira users without pagination for filters."""
    response = requests.get(f"{BACKEND_URL}/org/employees", params={"size": 5000}, headers=_headers)
    if response.status_code == 200:
        return response.json().get("items", [])
    return []

def get_export_url(start_date, end_date):
    return f"{BACKEND_URL}/reports/export?start_date={start_date}&end_date={end_date}"

@st.cache_data(ttl=600)
def fetch_db_projects(page=1, size=50, search=None, _headers=None):
    params = {"page": page, "size": size}
    if search:
        params["search"] = search
    response = requests.get(
        f"{BACKEND_URL}/projects/", 
        params=params,
        headers=_headers
    )
    if response.status_code == 200:
        return response.json()
    return {"items": [], "total": 0, "page": 1, "size": 50, "pages": 0}

def refresh_projects_from_jira():
    st.cache_data.clear() # Clear cache when refreshing
    response = requests.post(f"{BACKEND_URL}/projects/refresh", headers=get_headers())
    return response.status_code == 200

def update_project_status(project_id, is_active):
    st.cache_data.clear() # Clear cache when updating
    data = {"is_active": is_active}
    response = requests.patch(
        f"{BACKEND_URL}/projects/{project_id}",
        json=data,
        headers=get_headers()
    )
    return response.status_code == 200

def sync_all_projects_worklogs():
    response = requests.post(f"{BACKEND_URL}/projects/sync-all", headers=get_headers())
    return response.json() if response.status_code == 200 else None

def sync_project_worklogs(project_id):
    response = requests.post(f"{BACKEND_URL}/projects/{project_id}/sync", headers=get_headers())
    return response.json() if response.status_code == 200 else None

@st.cache_data(ttl=3600)
def get_all_users(page=1, size=50, _headers=None):
    """Fetch user list from DB with pagination."""
    response = requests.get(
        f"{BACKEND_URL}/users/", 
        params={"page": page, "size": size},
        headers=_headers
    )
    if response.status_code == 200:
        return response.json()
    return {"items": [], "total": 0, "page": 1, "size": 50, "pages": 0}

def sync_users_from_jira():
    """Trigger sync with Jira."""
    st.cache_data.clear()
    response = requests.post(f"{BACKEND_URL}/users/sync", headers=get_headers())
    if response.status_code == 200:
        return response.json()
    return {"status": "error", "message": f"Sync failed with status {response.status_code}"}

def get_me():
    """Fetch current logged in user profile."""
    response = requests.get(f"{BACKEND_URL}/users/me", headers=get_headers())
    if response.status_code == 200:
        return response.json()
    return None

def get_employees(page=1, size=50, search=None, _headers=None):
    """Fetch Jira users (employees) from DB with pagination."""
    params = {"page": page, "size": size}
    if search:
        params["search"] = search
    response = requests.get(
        f"{BACKEND_URL}/org/employees", 
        params=params,
        headers=_headers
    )
    if response.status_code == 200:
        return response.json()
    return {"items": [], "total": 0, "page": 1, "size": 50, "pages": 0}

def fetch_departments(_headers=None):
    response = requests.get(f"{BACKEND_URL}/org/departments", headers=_headers)
    return response.json() if response.status_code == 200 else []

def fetch_my_teams():
    response = requests.get(f"{BACKEND_URL}/org/my-teams", headers=get_headers())
    return response.json() if response.status_code == 200 else []

def create_department(name):
    st.cache_data.clear()
    response = requests.post(f"{BACKEND_URL}/org/departments", json={"name": name}, headers=get_headers())
    return response.status_code == 200

def update_department(dept_id, name):
    st.cache_data.clear()
    response = requests.patch(f"{BACKEND_URL}/org/departments/{dept_id}", json={"name": name}, headers=get_headers())
    return response.status_code == 200

def delete_department(dept_id):
    st.cache_data.clear()
    response = requests.delete(f"{BACKEND_URL}/org/departments/{dept_id}", headers=get_headers())
    return response.status_code == 204

def create_division(name, department_id):
    st.cache_data.clear()
    response = requests.post(f"{BACKEND_URL}/org/divisions", json={"name": name, "department_id": department_id}, headers=get_headers())
    return response.status_code == 200

def update_division(div_id, name=None, department_id=None):
    st.cache_data.clear()
    payload = {}
    if name: payload["name"] = name
    if department_id: payload["department_id"] = department_id
    response = requests.patch(f"{BACKEND_URL}/org/divisions/{div_id}", json=payload, headers=get_headers())
    return response.status_code == 200

def delete_division(div_id):
    st.cache_data.clear()
    response = requests.delete(f"{BACKEND_URL}/org/divisions/{div_id}", headers=get_headers())
    return response.status_code == 204

def create_team(name, division_id):
    st.cache_data.clear()
    response = requests.post(f"{BACKEND_URL}/org/teams", json={"name": name, "division_id": division_id}, headers=get_headers())
    return response.status_code == 200

def update_team(team_id, name=None, division_id=None, pm_id=None, reporting_period=None):
    st.cache_data.clear()
    payload = {}
    if name: payload["name"] = name
    if division_id: payload["division_id"] = division_id
    if pm_id: payload["pm_id"] = pm_id
    if reporting_period: payload["reporting_period"] = reporting_period
    response = requests.patch(f"{BACKEND_URL}/org/teams/{team_id}", json=payload, headers=get_headers())
    return response.status_code == 200

def delete_team(team_id):
    st.cache_data.clear()
    response = requests.delete(f"{BACKEND_URL}/org/teams/{team_id}", headers=get_headers())
    return response.status_code == 204

def update_user(user_id, **kwargs):
    st.cache_data.clear()
    response = requests.patch(f"{BACKEND_URL}/users/{user_id}", json=kwargs, headers=get_headers())
    return response.status_code == 200

def update_employee(employee_id, team_id=None, is_active=None):
    st.cache_data.clear()
    payload = {}
    if team_id is not None: payload["team_id"] = team_id
    if is_active is not None: payload["is_active"] = is_active
    response = requests.patch(f"{BACKEND_URL}/org/employees/{employee_id}", json=payload, headers=get_headers())
    return response.status_code == 200

@st.cache_data(ttl=600)
def fetch_project_versions(project_id, _headers=None):
    response = requests.get(f"{BACKEND_URL}/projects/{project_id}/releases", headers=_headers)
    return response.json() if response.status_code == 200 else []

@st.cache_data(ttl=600)
def fetch_project_sprints(project_key, _headers=None):
    response = requests.get(f"{BACKEND_URL}/projects/{project_key}/sprints", headers=_headers)
    return response.json() if response.status_code == 200 else []

# Approval Workflow Functions
def get_my_period(target_date=None):
    params = {}
    if target_date:
        if isinstance(target_date, (date, datetime)):
            params["target_date"] = target_date.isoformat()
        else:
            params["target_date"] = target_date
    response = requests.get(
        f"{BACKEND_URL}/approvals/my-period",
        params=params,
        headers=get_headers()
    )
    if response.status_code == 200:
        return response.json()
    return None

def submit_timesheet(start_date, end_date):
    data = {
        "start_date": start_date.isoformat() if isinstance(start_date, (date, datetime)) else start_date,
        "end_date": end_date.isoformat() if isinstance(end_date, (date, datetime)) else end_date
    }
    response = requests.post(
        f"{BACKEND_URL}/approvals/submit",
        json=data,
        headers=get_headers()
    )
    return response.status_code == 200

def fetch_team_periods(team_id, start_date, end_date):
    params = {
        "team_id": team_id,
        "start_date": start_date.isoformat() if isinstance(start_date, (date, datetime)) else start_date,
        "end_date": end_date.isoformat() if isinstance(end_date, (date, datetime)) else end_date
    }
    response = requests.get(
        f"{BACKEND_URL}/approvals/team-periods",
        params=params,
        headers=get_headers()
    )
    if response.status_code == 200:
        return response.json()
    return []

def approve_timesheet(period_id, status, comment=None):
    data = {"status": status}
    if comment:
        data["comment"] = comment
    response = requests.post(
        f"{BACKEND_URL}/approvals/{period_id}/approve",
        json=data,
        headers=get_headers()
    )
    return response.status_code == 200
