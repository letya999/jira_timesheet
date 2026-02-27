import streamlit as st
import extra_streamlit_components as stx
from datetime import datetime, timedelta
import time

def ensure_session(allow_wait=False):
    """
    STABLE VERSION: Memory -> URL -> Cookies -> JS Storage
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
        with st.spinner("Restoring session..."):
            time.sleep(1.2)
            st.rerun()
            
    return None, cookie_manager

def js_beacon():
    """Syncs localStorage with URL parameters."""
    import streamlit.components.v1 as components
    js_code = """
    <script>
    const urlParams = new URLSearchParams(window.parent.location.search);
    let urlToken = urlParams.get('token');
    let localToken = localStorage.getItem('auth_token');

    if (urlToken && urlToken !== localToken) {
        localStorage.setItem('auth_token', urlToken);
    } else if (!urlToken && localToken) {
        if (!window.parent.location.search.includes('logout')) {
            urlParams.set('token', localToken);
            window.parent.location.search = urlParams.toString();
        }
    }
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
    
    # Delete from cookies with safety catch
    try:
        cookie_manager.delete("token", key="delete_token_cookie")
    except Exception:
        pass
    
    # Clear LocalStorage
    import streamlit.components.v1 as components
    components.html("<script>localStorage.removeItem('auth_token');</script>", height=0, width=0)
    
    st.rerun()

def get_cookie_manager():
    return stx.CookieManager(key="auth_manager")
