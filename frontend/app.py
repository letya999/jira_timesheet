import streamlit as st
from api_client import login
from auth_utils import ensure_session, set_token, delete_token

st.set_page_config(page_title="Jira Timesheet System", layout="wide")

# Check for session/cookies
token = ensure_session()

st.title("Jira Timesheet System")
st.write("Welcome to the internal Resource & Time Management Service.")

def render_login():
    st.subheader("Login")
    email = st.text_input("Email", key="login_email")
    password = st.text_input("Password", type="password", key="login_password")
    if st.button("Login"):
        if email and password:
            data = login(email, password)
            if data:
                set_token(data["access_token"])
                st.success("Logged in successfully!")
                st.rerun()
            else:
                st.error("Invalid credentials")
        else:
            st.warning("Please enter both email and password")

if not token:
    st.info("Please login to access the system.")
    render_login()
else:
    st.success("You are logged in.")
    if st.button("Logout"):
        delete_token()
        st.rerun()
