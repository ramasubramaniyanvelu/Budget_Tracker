import streamlit as st
import streamlit.components.v1 as components
import os

st.set_page_config(
    page_title="MyExpense India",
    page_icon="💰",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# Hide Streamlit's default UI chrome so the app looks standalone
st.markdown("""
<style>
  #MainMenu, footer, header { visibility: hidden; }
  .block-container { padding: 0 !important; max-width: 100% !important; }
  [data-testid="stAppViewContainer"] { padding: 0; }
  [data-testid="stVerticalBlock"] { gap: 0; }
</style>
""", unsafe_allow_html=True)

# Load the test HTML file
html_path = os.path.join(os.path.dirname(__file__), "Test_MyExpense_COMPLETE.html")

with open(html_path, "r", encoding="utf-8") as f:
    html_content = f.read()

# Render the full app — height covers the whole page, scrolling enabled
components.html(html_content, height=950, scrolling=True)
