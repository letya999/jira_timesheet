import streamlit as st
from datetime import date
from typing import Optional, Any
import pandas as pd

class StateManager:
    """
    Typed manager for Streamlit session state to avoid string-key errors.
    """
    
    @property
    def token(self) -> Optional[str]:
        return st.session_state.get("token")
    
    @token.setter
    def token(self, value: Optional[str]):
        st.session_state["token"] = value

    @property
    def current_user(self) -> Optional[dict]:
        return st.session_state.get("current_user")
    
    @current_user.setter
    def current_user(self, value: Optional[dict]):
        st.session_state["current_user"] = value

    # Pagination
    def get_page(self, key: str) -> int:
        state_key = f"{key}_page"
        if state_key not in st.session_state:
            st.session_state[state_key] = 1
        return st.session_state[state_key]

    def set_page(self, key: str, page: int):
        st.session_state[f"{key}_page"] = page

    # Search
    def get_search(self, key: str) -> str:
        state_key = f"{key}_search"
        if state_key not in st.session_state:
            st.session_state[state_key] = ""
        return st.session_state[state_key]

    def set_search(self, key: str, query: str):
        st.session_state[f"{key}_search"] = query

    # Timesheet
    @property
    def ts_target_date(self) -> date:
        if "ts_target_date" not in st.session_state:
            st.session_state["ts_target_date"] = date.today()
        return st.session_state["ts_target_date"]
    
    @ts_target_date.setter
    def ts_target_date(self, value: date):
        st.session_state["ts_target_date"] = value

    # Reports
    @property
    def report_raw_data(self) -> Optional[pd.DataFrame]:
        return st.session_state.get("report_raw_data")
    
    @report_raw_data.setter
    def report_raw_data(self, value: Optional[pd.DataFrame]):
        st.session_state["report_raw_data"] = value

state = StateManager()
