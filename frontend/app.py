import streamlit as st
from api_client import login

st.set_page_config(page_title="Jira Timesheet System", layout="wide")

st.title("Jira Timesheet System")
st.write("Welcome to the internal Resource & Time Management Service.")

if "token" not in st.session_state:
    st.session_state["token"] = None

def render_login():
    st.subheader("Login")
    email = st.text_input("Email")
    password = st.text_input("Password", type="password")
    if st.button("Login"):
        if email and password:
            data = login(email, password)
            if data:
                st.session_state["token"] = data["access_token"]
                st.success("Logged in successfully!")
                st.rerun()
            else:
                st.error("Invalid credentials")

if not st.session_state["token"]:
    render_login()
else:
    st.write("You are logged in.")
    if st.button("Logout"):
        st.session_state["token"] = None
        st.rerun()