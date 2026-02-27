import streamlit as st
import extra_streamlit_components as stx
from datetime import datetime, timedelta
import time

def get_manager():
    if "cookie_manager" not in st.session_state:
        st.session_state["cookie_manager"] = stx.CookieManager()
    return st.session_state["cookie_manager"]

def ensure_session():
    """Check for token in session_state, then in cookies."""
    # 1. Quick return if already in session
    if st.session_state.get("token"):
        return st.session_state["token"]

    # Prevent multiple calls to get_all in the same script run
    if st.session_state.get("cookies_checked_this_run"):
        return None

    cookie_manager = get_manager()
    
    try:
        # We use a unique key and mark that we've checked this run
        cookies = cookie_manager.get_all(key="auth_get_all")
        st.session_state["cookies_checked_this_run"] = True
        
        if cookies and "token" in cookies:
            st.session_state["token"] = cookies["token"]
            return st.session_state["token"]
    except Exception:
        pass
            
    return None

def set_token(token):
    cookie_manager = get_manager()
    st.session_state["token"] = token
    # Set expiration to 7 days
    expires_at = datetime.now() + timedelta(days=7)
    cookie_manager.set("token", token, expires_at=expires_at, key="set_token_cookie")

def delete_token():
    cookie_manager = get_manager()
    st.session_state["token"] = None
    cookie_manager.delete("token", key="delete_token_cookie")
