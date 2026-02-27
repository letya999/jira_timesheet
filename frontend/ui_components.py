import streamlit as st
import time
from typing import Callable, Optional

def loading_skeleton(height: int = 200, count: int = 1):
    """
    Shows a simple gray skeleton to simulate loading.
    """
    for _ in range(count):
        st.markdown(
            f"""
            <div style="
                background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                background-size: 200% 100%;
                animation: loading 1.5s infinite;
                height: {height}px;
                border-radius: 8px;
                margin-bottom: 10px;
            "></div>
            <style>
                @keyframes loading {{
                    0% {{ background-position: 200% 0; }}
                    100% {{ background-position: -200% 0; }}
                }}
            </style>
            """,
            unsafe_allow_html=True
        )

def error_state(message: str, icon: str = "⚠️"):
    """
    Renders a consistent error state.
    """
    st.markdown(
        f"""
        <div style="
            padding: 2rem;
            border-radius: 8px;
            border: 1px solid #ff4b4b;
            background-color: #fff5f5;
            text-align: center;
        ">
            <div style="font-size: 3rem; margin-bottom: 1rem;">{icon}</div>
            <div style="color: #ff4b4b; font-weight: bold; font-size: 1.2rem;">{message}</div>
            <p style="color: #666; margin-top: 0.5rem;">Try refreshing the page or check your connection.</p>
        </div>
        """,
        unsafe_allow_html=True
    )

def safe_api_call(func: Callable, *args, **kwargs):
    """
    Wrapper for API calls with basic error handling and return value safety.
    """
    try:
        result = func(*args, **kwargs)
        return result, None
    except Exception as e:
        return None, str(e)

def auto_refresh(interval_ms: int, key: str):
    """
    Simple polling mechanism using st.empty and time.sleep (or fragments if available)
    Note: Standard Streamlit way for polling is st_autorefresh, but we'll use fragments 
    if the version supports it (available in recent 1.33+ versions).
    """
    # Using the new st.fragment if possible for scoped refresh
    if hasattr(st, "fragment"):
        @st.fragment(run_every=interval_ms / 1000)
        def refresh_fragment():
            st.session_state[f"{key}_last_refresh"] = time.time()
        
        refresh_fragment()
    else:
        # Fallback to older methods or just a message
        pass
