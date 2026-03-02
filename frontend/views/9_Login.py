import time

import streamlit as st
from api_client import login
from auth_utils import get_cookie_manager, set_token
from i18n import language_selector, t


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

    # Language selector at the top right
    lang_col1, lang_col2 = st.columns([8, 2])
    with lang_col2:
        language_selector(container=st, key="login_lang_selector")

    # Center-align content
    col1, col2, col3 = st.columns([1, 2, 1])

    with col2:
        st.markdown(f"<h1 style='color: #0052cc;'>{t('auth.title')}</h1>", unsafe_allow_html=True)
        st.markdown(f"<h3>{t('auth.welcome')}</h3>", unsafe_allow_html=True)
        st.markdown("<br>", unsafe_allow_html=True)

        with st.form("login_form", clear_on_submit=False):
            email = st.text_input(f"📧 {t('auth.email')}", placeholder="name@company.com")
            password = st.text_input(f"🔒 {t('auth.password')}", type="password", placeholder="••••••••")
            submit = st.form_submit_button(t("auth.login_button"))

            if submit:
                if not email or not password:
                    st.error(f"⚠️ {t('common.error')}")
                else:
                    with st.spinner(t("common.loading")):
                        res = login(email, password)
                        if res and "access_token" in res:
                            token = res["access_token"]
                            cookie_manager = get_cookie_manager()
                            set_token(token, cookie_manager)
                            st.success(f"✅ {t('common.success')}")
                            time.sleep(1)
                            st.rerun()
                        else:
                            st.error(f"❌ {t('auth.invalid_credentials')}")

if __name__ == "__main__":
    # If the script is run directly, it needs set_page_config
    try:
        st.set_page_config(page_title=t("auth.page_title"), layout="centered", page_icon="logo.png")
    except Exception:
        pass # Already set in app.py if run as a page

    show_login()
