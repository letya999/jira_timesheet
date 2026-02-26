import requests
import os
import streamlit as st

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

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