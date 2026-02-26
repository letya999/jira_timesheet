
# Version: 1.1 - Added user sync functions
import requests
import os
import streamlit as st

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

def fetch_timesheet(start_date, end_date):
    response = requests.get(
        f"{BACKEND_URL}/timesheet/",
        params={"start_date": start_date, "end_date": end_date},
        headers=get_headers()
    )
    if response.status_code == 200:
        return response.json()
    return {"jira_logs": [], "manual_logs": []}

def add_manual_log(date, hours, category, description):
    data = {
        "date": date.isoformat(),
        "time_spent_hours": hours,
        "category": category,
        "description": description
    }
    response = requests.post(
        f"{BACKEND_URL}/timesheet/manual",
        json=data,
        headers=get_headers()
    )
    return response.status_code == 200

def fetch_dashboard(start_date, end_date):
    response = requests.get(
        f"{BACKEND_URL}/reports/dashboard",
        params={"start_date": start_date, "end_date": end_date},
        headers=get_headers()
    )
    if response.status_code == 200:
        return response.json().get("data", [])
    return []

def get_export_url(start_date, end_date):
    return f"{BACKEND_URL}/reports/export?start_date={start_date}&end_date={end_date}"

def fetch_db_projects(page=1, size=50):
    response = requests.get(
        f"{BACKEND_URL}/projects/", 
        params={"page": page, "size": size},
        headers=get_headers()
    )
    if response.status_code == 200:
        return response.json()
    return {"items": [], "total": 0, "page": 1, "size": 50, "pages": 0}

def refresh_projects_from_jira():
    response = requests.post(f"{BACKEND_URL}/projects/refresh", headers=get_headers())
    return response.status_code == 200

def update_project_status(project_id, is_active):
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

def get_all_users(page=1, size=50):
    """Fetch user list from DB with pagination."""
    response = requests.get(
        f"{BACKEND_URL}/users/", 
        params={"page": page, "size": size},
        headers=get_headers()
    )
    if response.status_code == 200:
        return response.json()
    return {"items": [], "total": 0, "page": 1, "size": 50, "pages": 0}

def sync_users_from_jira():
    """Trigger sync with Jira."""
    response = requests.post(f"{BACKEND_URL}/users/sync", headers=get_headers())
    if response.status_code == 200:
        return response.json()
    return None