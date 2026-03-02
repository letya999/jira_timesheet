# Version: 1.3 - Fixed headers for 401 Unauthorized
import os
from datetime import date, datetime

import requests
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


def fetch_timesheet(
    start_date=None,
    end_date=None,
    user_id=None,
    project_id=None,
    sprint_id=None,
    release_id=None,
    category=None,
    dept_id=None,
    div_id=None,
    org_unit_id=None,
    sort_order="desc",
    page=1,
    size=50,
):
    params = {
        "sort_order": sort_order,
        "page": page,
        "size": size,
    }
    optional_params = {
        "start_date": start_date,
        "end_date": end_date,
        "user_id": user_id,
        "project_id": project_id,
        "sprint_id": sprint_id,
        "release_id": release_id,
        "category": category,
        "dept_id": dept_id,
        "div_id": div_id,
        "org_unit_id": org_unit_id,
    }
    for key, value in optional_params.items():
        if value is not None:
            params[key] = value

    response = requests.get(f"{BACKEND_URL}/timesheet/", params=params, headers=get_headers())
    if response.status_code == 200:
        return response.json()
    return {"items": [], "total": 0, "page": 1, "size": 50, "pages": 0}


def add_manual_log(date, hours, category, description, user_id=None, issue_id=None):
    data = {"date": date.isoformat(), "hours": hours, "category": category, "description": description}
    if user_id:
        data["user_id"] = user_id
    if issue_id:
        data["issue_id"] = issue_id

    response = requests.post(f"{BACKEND_URL}/timesheet/manual", json=data, headers=get_headers())
    return response.status_code == 200


def search_issues(search_query):
    response = requests.get(f"{BACKEND_URL}/projects/issues", params={"search": search_query}, headers=get_headers())
    if response.status_code == 200:
        return response.json()
    return []


def fetch_dashboard(start_date, end_date, org_unit_id=None):
    params = {"start_date": start_date, "end_date": end_date}
    if org_unit_id:
        params["org_unit_id"] = org_unit_id
    response = requests.get(f"{BACKEND_URL}/reports/dashboard", params=params, headers=get_headers())
    if response.status_code == 200:
        return response.json().get("data", [])
    return []


def fetch_custom_report(payload):
    response = requests.post(f"{BACKEND_URL}/reports/custom", json=payload, headers=get_headers())
    if response.status_code == 200:
        return response.json().get("data", [])
    return []


@st.cache_data(ttl=600)
def fetch_report_categories(_headers=None):
    response = requests.get(f"{BACKEND_URL}/reports/categories", headers=_headers or get_headers())
    return response.json() if response.status_code == 200 else []


@st.cache_data(ttl=600)
def fetch_report_sprints(_headers=None):
    response = requests.get(f"{BACKEND_URL}/reports/sprints", headers=_headers or get_headers())
    return response.json() if response.status_code == 200 else []


@st.cache_data(ttl=600)
def get_all_employees(_headers=None):
    """Fetch all Jira users without pagination for filters."""
    response = requests.get(f"{BACKEND_URL}/org/employees", params={"size": 5000}, headers=_headers or get_headers())
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
    response = requests.get(f"{BACKEND_URL}/projects/", params=params, headers=_headers or get_headers())
    if response.status_code == 200:
        return response.json()
    return {"items": [], "total": 0, "page": 1, "size": 50, "pages": 0}


def refresh_projects_from_jira():
    st.cache_data.clear()  # Clear cache when refreshing
    response = requests.post(f"{BACKEND_URL}/projects/refresh", headers=get_headers())
    return response.status_code == 200


def update_project_status(project_id, is_active):
    st.cache_data.clear()  # Clear cache when updating
    data = {"is_active": is_active}
    response = requests.patch(f"{BACKEND_URL}/projects/{project_id}", json=data, headers=get_headers())
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
        f"{BACKEND_URL}/users/", params={"page": page, "size": size}, headers=_headers or get_headers()
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


def promote_user(jira_user_id):
    """Promote a Jira user to a system user."""
    st.cache_data.clear()
    response = requests.post(f"{BACKEND_URL}/users/promote/{jira_user_id}", headers=get_headers())
    if response.status_code == 200:
        return response.json()
    return None


def change_password(new_password):
    """Change current user's password."""
    payload = {"new_password": new_password}
    response = requests.post(f"{BACKEND_URL}/users/change-password", json=payload, headers=get_headers())
    return response.status_code == 200


def get_me():
    """Fetch current logged in user profile."""
    response = requests.get(f"{BACKEND_URL}/users/me", headers=get_headers())
    if response.status_code == 200:
        return response.json()
    return None


def get_employees(page=1, size=50, search=None, org_unit_id=None, _headers=None):
    """Fetch Jira users (employees) from DB with pagination."""
    params = {"page": page, "size": size}
    if search:
        params["search"] = search
    if org_unit_id:
        params["org_unit_id"] = org_unit_id
    response = requests.get(f"{BACKEND_URL}/org/employees", params=params, headers=_headers or get_headers())
    if response.status_code == 200:
        return response.json()
    return {"items": [], "total": 0, "page": 1, "size": 50, "pages": 0}


def fetch_departments(_headers=None):
    """DEPRECATED: Use fetch_org_units instead. Currently returns flat list of all units."""
    return fetch_org_units(_headers)


def fetch_my_teams():
    response = requests.get(f"{BACKEND_URL}/org/my-teams", headers=get_headers())
    return response.json() if response.status_code == 200 else []


def update_user(user_id, **kwargs):
    st.cache_data.clear()
    response = requests.patch(f"{BACKEND_URL}/users/{user_id}", json=kwargs, headers=get_headers())
    return response.status_code == 200


def update_employee(employee_id, org_unit_id=None, is_active=None):
    st.cache_data.clear()
    payload = {}
    if org_unit_id is not None:
        payload["team_id"] = org_unit_id
    if is_active is not None:
        payload["is_active"] = is_active
    response = requests.patch(f"{BACKEND_URL}/org/employees/{employee_id}", json=payload, headers=get_headers())
    return response.status_code == 200


@st.cache_data(ttl=600)
def fetch_project_versions(project_id, _headers=None):
    response = requests.get(f"{BACKEND_URL}/projects/{project_id}/releases", headers=_headers or get_headers())
    return response.json() if response.status_code == 200 else []


@st.cache_data(ttl=600)
def fetch_project_sprints(project_key, _headers=None):
    response = requests.get(f"{BACKEND_URL}/projects/{project_key}/sprints", headers=_headers or get_headers())
    return response.json() if response.status_code == 200 else []


# Approval Workflow Functions
def get_my_period(target_date=None):
    params = {}
    if target_date:
        if isinstance(target_date, (date, datetime)):
            params["target_date"] = target_date.isoformat()
        else:
            params["target_date"] = target_date
    response = requests.get(f"{BACKEND_URL}/approvals/my-period", params=params, headers=get_headers())
    if response.status_code == 200:
        return response.json()
    return None


def submit_timesheet(start_date, end_date):
    data = {
        "start_date": start_date.isoformat() if isinstance(start_date, (date, datetime)) else start_date,
        "end_date": end_date.isoformat() if isinstance(end_date, (date, datetime)) else end_date,
    }
    response = requests.post(f"{BACKEND_URL}/approvals/submit", json=data, headers=get_headers())
    return response.status_code == 200


def fetch_team_periods(start_date, end_date, org_unit_id=None):
    params = {
        "start_date": start_date.isoformat() if isinstance(start_date, (date, datetime)) else start_date,
        "end_date": end_date.isoformat() if isinstance(end_date, (date, datetime)) else end_date,
    }
    if org_unit_id:
        params["org_unit_id"] = org_unit_id
    response = requests.get(f"{BACKEND_URL}/approvals/team-periods", params=params, headers=get_headers())
    if response.status_code == 200:
        return response.json()
    return []


def approve_timesheet(period_id, status, comment=None):
    data = {"status": status}
    if comment:
        data["comment"] = comment
    response = requests.post(f"{BACKEND_URL}/approvals/{period_id}/approve", json=data, headers=get_headers())
    return response.status_code == 200


# Notifications
def fetch_notifications(page=1, size=20):
    params = {"page": page, "size": size}
    response = requests.get(f"{BACKEND_URL}/notifications/", params=params, headers=get_headers())
    if response.status_code == 200:
        return response.json()
    return {"items": [], "total": 0, "page": 1, "size": 20, "pages": 0}


def fetch_notification_stats():
    response = requests.get(f"{BACKEND_URL}/notifications/stats", headers=get_headers())
    if response.status_code == 200:
        return response.json()
    return {"unread_count": 0}


def mark_notification_read(notification_id, is_read=True):
    response = requests.patch(
        f"{BACKEND_URL}/notifications/{notification_id}", json={"is_read": is_read}, headers=get_headers()
    )
    return response.status_code == 200


def mark_all_notifications_read():
    response = requests.post(f"{BACKEND_URL}/notifications/mark-all-read", headers=get_headers())
    return response.status_code == 200


# Calendar & Holidays
def fetch_holidays(start_date, end_date):
    params = {
        "start_date": start_date.isoformat() if isinstance(start_date, (date, datetime)) else start_date,
        "end_date": end_date.isoformat() if isinstance(end_date, (date, datetime)) else end_date,
    }
    response = requests.get(f"{BACKEND_URL}/calendar/holidays", params=params, headers=get_headers())
    if response.status_code == 200:
        return response.json()
    return []


def sync_holidays(year=None):
    params = {}
    if year:
        params["year"] = year
    response = requests.post(f"{BACKEND_URL}/calendar/holidays/sync", params=params, headers=get_headers())
    return response.status_code == 200


def add_holiday(holiday_date, name, is_holiday=True):
    data = {
        "date": holiday_date.isoformat() if isinstance(holiday_date, (date, datetime)) else holiday_date,
        "name": name,
        "is_holiday": is_holiday,
    }
    response = requests.post(f"{BACKEND_URL}/calendar/holidays", json=data, headers=get_headers())
    return response.status_code == 200


def delete_holiday(holiday_date):
    date_str = holiday_date.isoformat() if isinstance(holiday_date, (date, datetime)) else holiday_date
    response = requests.delete(f"{BACKEND_URL}/calendar/holidays/{date_str}", headers=get_headers())
    return response.status_code == 200


def get_calendar_country():
    response = requests.get(f"{BACKEND_URL}/calendar/country", headers=get_headers())
    if response.status_code == 200:
        return response.json().get("country_code", "RU")
    return "RU"


def set_calendar_country(country_code):
    response = requests.post(
        f"{BACKEND_URL}/calendar/country", json={"country_code": country_code}, headers=get_headers()
    )
    return response.status_code == 200


# --- Leave Management ---


def fetch_my_leaves():
    response = requests.get(f"{BACKEND_URL}/leaves/my", headers=get_headers())
    if response.status_code == 200:
        return response.json()
    return []


def submit_leave_request(leave_data):
    response = requests.post(f"{BACKEND_URL}/leaves/", json=leave_data, headers=get_headers())
    return response.status_code == 200


def fetch_team_leaves():
    response = requests.get(f"{BACKEND_URL}/leaves/team", headers=get_headers())
    if response.status_code == 200:
        return response.json()
    return []


def fetch_all_leaves(start_date=None, end_date=None):
    params = {}
    if start_date:
        params["start_date"] = start_date
    if end_date:
        params["end_date"] = end_date
    response = requests.get(f"{BACKEND_URL}/leaves/all", params=params, headers=get_headers())
    if response.status_code == 200:
        return response.json()
    return []


def update_leave_status(leave_id, status=None, comment=None, **kwargs):
    payload = {}
    if status is not None:
        payload["status"] = status
    if comment is not None:
        payload["comment"] = comment
    payload.update(kwargs)
    response = requests.patch(f"{BACKEND_URL}/leaves/{leave_id}", json=payload, headers=get_headers())
    return response.status_code == 200


# --- Flexible Org & Roles ---
def fetch_org_units(_headers=None):
    response = requests.get(f"{BACKEND_URL}/org/units", headers=_headers or get_headers())
    return response.json() if response.status_code == 200 else []


def create_org_unit(name, parent_id=None, reporting_period="weekly"):
    payload = {"name": name, "reporting_period": reporting_period}
    if parent_id:
        payload["parent_id"] = parent_id
    response = requests.post(f"{BACKEND_URL}/org/units", json=payload, headers=get_headers())
    return response.status_code == 200


def update_org_unit(unit_id, name=None, parent_id=None, reporting_period=None):
    payload = {}
    if name:
        payload["name"] = name
    if parent_id is not None:
        payload["parent_id"] = parent_id
    if reporting_period:
        payload["reporting_period"] = reporting_period
    response = requests.patch(f"{BACKEND_URL}/org/units/{unit_id}", json=payload, headers=get_headers())
    return response.status_code == 200


def delete_org_unit(unit_id):
    response = requests.delete(f"{BACKEND_URL}/org/units/{unit_id}", headers=get_headers())
    return response.status_code == 204


def fetch_roles(_headers=None):
    response = requests.get(f"{BACKEND_URL}/org/roles", headers=_headers or get_headers())
    return response.json() if response.status_code == 200 else []


def create_role(name, is_system=False):
    response = requests.post(
        f"{BACKEND_URL}/org/roles", json={"name": name, "is_system": is_system}, headers=get_headers()
    )
    return response.status_code == 200


def delete_role(role_id):
    response = requests.delete(f"{BACKEND_URL}/org/roles/{role_id}", headers=get_headers())
    return response.status_code == 204


def fetch_approval_routes(unit_id, target_type=None):
    params = {}
    if target_type:
        params["target_type"] = target_type
    response = requests.get(f"{BACKEND_URL}/org/units/{unit_id}/approval-routes", params=params, headers=get_headers())
    return response.json() if response.status_code == 200 else []


def create_approval_route(unit_id, target_type, step_order, role_id):
    payload = {"org_unit_id": unit_id, "target_type": target_type, "step_order": step_order, "role_id": role_id}
    response = requests.post(f"{BACKEND_URL}/org/units/approval-routes", json=payload, headers=get_headers())
    return response.status_code == 200


def delete_approval_route(route_id):
    response = requests.delete(f"{BACKEND_URL}/org/units/approval-routes/{route_id}", headers=get_headers())
    return response.status_code == 204


def fetch_unit_roles(unit_id):
    response = requests.get(f"{BACKEND_URL}/org/units/{unit_id}/roles", headers=get_headers())
    return response.json() if response.status_code == 200 else []


def assign_unit_role(unit_id, user_id, role_id):
    payload = {"org_unit_id": unit_id, "user_id": user_id, "role_id": role_id}
    response = requests.post(f"{BACKEND_URL}/org/units/roles", json=payload, headers=get_headers())
    return response.status_code == 200


def remove_unit_role(assignment_id):
    response = requests.delete(f"{BACKEND_URL}/org/units/roles/{assignment_id}", headers=get_headers())
    return response.status_code == 204
