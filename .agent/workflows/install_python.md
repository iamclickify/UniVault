---
description: How to install Python on Windows
---

# Install Python on Windows

1.  **Download Python**:
    - Go to [python.org/downloads](https://www.python.org/downloads/).
    - **Important**: Scroll down to look for **Python 3.12.x** (or 3.11).
    - Do **NOT** use 3.13 or 3.14 (they are too new for some AI libraries).
    - Download the "Windows installer (64-bit)".

2.  **Run Installer**:
    - Run the downloaded `.exe` file.
    - **IMPORTANT**: Check the box **"Add python.exe to PATH"** at the bottom of the first screen. This is critical.
    - Click **"Install Now"**.

3.  **Verify Installation**:
    - Open a new terminal (Command Prompt or PowerShell).
    - Run `python --version`.
    - You should see `Python 3.x.x`.

4.  **Troubleshooting**:
    - If it still says "not recognized", try restarting your computer or VS Code.
    - You can also try running `py --version`.
