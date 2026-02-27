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
    # 1. If we have a token (and it's not the logout marker), return it
    current_token = st.session_state.get("token")
    if current_token:
        if current_token == "logged_out":
            return None
        return current_token

    cookie_manager = get_manager()
    
    # We don't sleep here anymore to avoid slowing down every function call.
    # The sleep is handled in the main entry point (app.py).
    
    try:
        cookies = cookie_manager.get_all(key="auth_get_all")
        if cookies and "token" in cookies:
            token = cookies["token"]
            if token and token != "None": # Sometimes cookies store "None" as string
                st.session_state["token"] = token
                st.rerun()
                return token
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
    st.session_state["token"] = "logged_out"
    cookie_manager.delete("token", key="delete_token_cookie")
    st.rerun()
