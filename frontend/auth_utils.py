import streamlit as st
import extra_streamlit_components as stx
from datetime import datetime, timedelta

def get_manager():
    if "cookie_manager" not in st.session_state:
        st.session_state["cookie_manager"] = stx.CookieManager()
    return st.session_state["cookie_manager"]

def ensure_session():
    """Check for token in session_state, then in cookies."""
    if "token" not in st.session_state:
        st.session_state["token"] = None
        
    if not st.session_state["token"]:
        cookie_manager = get_manager()
        token = cookie_manager.get(cookie="token")
        if token:
            st.session_state["token"] = token
            st.rerun()
            
    # Also handle the get_all case if needed
    if not st.session_state["token"]:
        cookie_manager = get_manager()
        cookies = cookie_manager.get_all()
        if cookies and "token" in cookies:
            st.session_state["token"] = cookies["token"]
            st.rerun()
            
    return st.session_state["token"]

def set_token(token):
    cookie_manager = get_manager()
    st.session_state["token"] = token
    cookie_manager.set("token", token, expires_at=datetime.now() + timedelta(days=7), key="set_token_cookie")

def delete_token():
    cookie_manager = get_manager()
    st.session_state["token"] = None
    cookie_manager.delete("token", key="delete_token_cookie")
