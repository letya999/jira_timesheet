import base64
import json
import time
from datetime import datetime, timedelta

import extra_streamlit_components as stx
import streamlit as st
from i18n import t


def get_cookie_manager():
    if "cookie_manager" not in st.session_state:
        st.session_state["cookie_manager"] = stx.CookieManager(key="auth_manager")
    return st.session_state["cookie_manager"]

def decode_jwt(token):
    try:
        _, payload_b64, _ = token.split(".")
        # Add padding if necessary
        missing_padding = len(payload_b64) % 4
        if missing_padding:
            payload_b64 += "=" * (4 - missing_padding)
        payload_json = base64.b64decode(payload_b64).decode("utf-8")
        return json.loads(payload_json)
    except Exception:
        return {}

def ensure_session(allow_wait=False):
    """
    ULTRA-STABLE VERSION: Memory -> URL -> Cookies -> JS Storage
    Returns (token, cookie_manager)
    """
    cookie_manager = get_cookie_manager()

    # 1. MEMORY - Instant
    current_token = st.session_state.get("token")
    if current_token:
        if current_token == "logged_out":
            return None, cookie_manager
        return current_token, cookie_manager

    # 2. URL - Instant on refresh
    qp_token = st.query_params.get("token")
    if qp_token:
        st.session_state["token"] = qp_token
        return qp_token, cookie_manager

    # 3. COOKIES - Async fallback
    try:
        cookies = cookie_manager.get_all()
        if cookies:
            token = cookies.get("token")
            if token and token != "None":
                st.session_state["token"] = token
                st.query_params["token"] = token
                st.rerun()
                return token, cookie_manager
    except Exception:
        pass

    # 4. JS BEACON - Restore from LocalStorage to URL
    js_beacon()

    # 5. Initialization wait (only once)
    if allow_wait and "init_checked" not in st.session_state:
        st.session_state["init_checked"] = True
        with st.spinner(t("auth.restoring_session")):
            time.sleep(1.2)
            st.rerun()

    return None, cookie_manager

def js_beacon():
    """Syncs localStorage with URL parameters and also provides global cross-tab sync."""
    import streamlit.components.v1 as components
    js_code = """
    <script>
    (function() {
        const urlParams = new URLSearchParams(window.parent.location.search);
        let urlToken = urlParams.get('token');
        let localToken = localStorage.getItem('auth_token');

        if (urlToken && urlToken !== localToken) {
            localStorage.setItem('auth_token', urlToken);
        } else if (!urlToken && localToken && localToken !== 'logged_out') {
            if (!window.parent.location.search.includes('logout')) {
                urlParams.set('token', localToken);
                window.parent.location.search = urlParams.toString();
            }
        }
    })();
    </script>
    """
    components.html(js_code, height=0, width=0)

def set_token(token, cookie_manager):
    st.session_state["token"] = token
    st.query_params["token"] = token

    # Save to Cookies
    expires_at = datetime.now() + timedelta(days=7)
    cookie_manager.set("token", token, expires_at=expires_at, key="set_token_cookie")

    # Save to LocalStorage via JS
    import streamlit.components.v1 as components
    components.html(f"<script>localStorage.setItem('auth_token', '{token}');</script>", height=0, width=0)

def delete_token(cookie_manager):
    st.session_state["token"] = "logged_out"
    if "token" in st.query_params:
        del st.query_params["token"]

    # Delete from cookies
    try:
        cookie_manager.delete("token", key="delete_token_cookie")
    except Exception:
        pass

    # Clear LocalStorage
    import streamlit.components.v1 as components
    components.html("<script>localStorage.setItem('auth_token', 'logged_out'); localStorage.removeItem('auth_token');</script>", height=0, width=0)

    st.rerun()

def get_user_role():
    token = st.session_state.get("token")
    if not token or token == "logged_out":
        return None
    payload = decode_jwt(token)
    return payload.get("role")

def check_access(allowed_roles=None):
    if not allowed_roles:
        return True
    role = get_user_role()
    if role == "Admin": # Superuser
        return True
    return role in allowed_roles
