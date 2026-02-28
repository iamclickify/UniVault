# Secure Configuration Management

import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'a_default_secret_key'
    DATABASE_URL = os.environ.get('DATABASE_URL') or 'sqlite:///default.db'
    DEBUG = os.environ.get('DEBUG') is not None

