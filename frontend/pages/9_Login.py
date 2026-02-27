import streamlit as st
from auth_utils import set_token, get_cookie_manager, ensure_session
from api_client import login
import time

def show_login():
    st.markdown("""
        <style>
        .login-container {
            max-width: 400px;
            margin: 50px auto;
            padding: 2rem;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
            background-color: white;
        }
        .stButton>button {
            width: 100%;
            background-color: #0052cc;
            color: white;
            border: none;
            padding: 0.5rem;
            border-radius: 4px;
            cursor: pointer;
        }
        .stButton>button:hover {
            background-color: #0747a6;
        }
        h1, h3 {
            text-align: center;
        }
        </style>
    """, unsafe_allow_html=True)

    # Center-align content
    col1, col2, col3 = st.columns([1, 2, 1])
    
    with col2:
        st.markdown("<h1 style='color: #0052cc;'>🚀 Jira Timesheet</h1>", unsafe_allow_html=True)
        st.markdown("<h3>Enterprise Resource Management</h3>", unsafe_allow_html=True)
        st.markdown("<br>", unsafe_allow_html=True)
        
        with st.form("login_form", clear_on_submit=False):
            email = st.text_input("📧 Email Address", placeholder="name@company.com")
            password = st.text_input("🔒 Password", type="password", placeholder="••••••••")
            submit = st.form_submit_button("Sign In")
            
            if submit:
                if not email or not password:
                    st.error("⚠️ Please enter both email and password")
                else:
                    with st.spinner("Authenticating..."):
                        res = login(email, password)
                        if res and "access_token" in res:
                            token = res["access_token"]
                            cookie_manager = get_cookie_manager()
                            set_token(token, cookie_manager)
                            st.success("✅ Login successful! Redirecting...")
                            time.sleep(1)
                            st.rerun()
                        else:
                            st.error("❌ Invalid email or password")

if __name__ == "__main__":
    # If the script is run directly, it needs set_page_config
    try:
        st.set_page_config(page_title="Login - Jira Timesheet", layout="centered", page_icon="🔐")
    except Exception:
        pass # Already set in app.py if run as a page

    show_login()
