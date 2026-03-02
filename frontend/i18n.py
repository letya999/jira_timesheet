import json
import os

import streamlit as st

# Define available languages
LANGUAGES = {
    "ru": "Русский",
    "en": "English"
}

def load_locales(lang_code):
    try:
        base_path = os.path.dirname(__file__)
        with open(os.path.join(base_path, "locales", f"{lang_code}.json"), encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        # Fallback to RU if locale not found
        with open(os.path.join(base_path, "locales", "ru.json"), encoding="utf-8") as f:
            return json.load(f)

def get_locale():
    # Check session state for selected language
    if "language" not in st.session_state:
        st.session_state.language = "ru" # Default language

    if "translations" not in st.session_state or st.session_state.get("loaded_lang") != st.session_state.language:
        st.session_state.translations = load_locales(st.session_state.language)
        st.session_state.loaded_lang = st.session_state.language

    return st.session_state.translations

def t(key, **kwargs):
    translations = get_locale()

    # Support for nested keys like "common.login"
    parts = key.split(".")
    value = translations
    for part in parts:
        if isinstance(value, dict) and part in value:
            value = value[part]
        else:
            return key # Return key if not found

    # Simple interpolation
    if isinstance(value, str):
        for k, v in kwargs.items():
            value = value.replace(f"{{{k}}}", str(v))

    return value

def language_selector(container=None, key="lang_selectbox"):
    current_lang = st.session_state.get("language", "ru")

    if container is None:
        container = st.sidebar

    # We use index of current language in list
    lang_codes = list(LANGUAGES.keys())
    try:
        default_idx = lang_codes.index(current_lang)
    except ValueError:
        default_idx = 0

    selected_lang_name = container.selectbox(
        "🌐 " + t("sidebar.language"),
        options=list(LANGUAGES.values()),
        index=default_idx,
        key=key
    )

    # Find code for selected name
    selected_lang_code = [code for code, name in LANGUAGES.items() if name == selected_lang_name][0]

    if selected_lang_code != current_lang:
        st.session_state.language = selected_lang_code
        st.rerun()
