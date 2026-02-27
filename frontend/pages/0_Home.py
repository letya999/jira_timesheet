import streamlit as st
import time
from api_client import login
from auth_utils import ensure_session, set_token, delete_token, get_cookie_manager

def render_login(cookie_manager):
    st.subheader("Login")
    email = st.text_input("Email", key="login_email")
    password = st.text_input("Password", type="password", key="login_password")
    if st.button("Login"):
        if email and password:
            data = login(email, password)
            if data:
                set_token(data["access_token"], cookie_manager)
                st.success("Logged in successfully!")
                st.rerun()
            else:
                st.error("Invalid credentials")
        else:
            st.warning("Please enter both email and password")

def show_home():
    # Try to get token with wait allowed
    token, cookie_manager = ensure_session(allow_wait=True)

    st.title("Jira Timesheet System")
    st.write("Welcome to the internal Resource & Time Management Service.")

    if not token:
        st.info("Please login to access the system.")
        render_login(cookie_manager)
    else:
        st.success("You are logged in.")
        st.info("Use the sidebar to navigate through the system.")

if __name__ == "__main__":
    show_home()
