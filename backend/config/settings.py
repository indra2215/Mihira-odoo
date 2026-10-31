"""
Django Settings Configuration for Mihira Solar ERP Backend.
Designed for simple, clean setup with PostgreSQL and seamless local SQLite fallback.
"""

# Import standard library OS and filesystem path utilities
import os
from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
# Path(__file__) resolves to backend/config/settings.py; parent.parent resolves to backend/
BASE_DIR = Path(__file__).resolve().parent.parent

# Quick-start development settings - unsuitable for production
# Read secret key from environment or use development fallback
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-secret-key-change-in-production-12345")

# Enable debugging mode in development (1 = True, 0 = False)
DEBUG = os.environ.get("DEBUG", "1") == "1"

# Allow all hosts in local development
ALLOWED_HOSTS = ["*"]

# Application definition
INSTALLED_APPS = [
    # Core built-in Django applications
    "django.contrib.admin",          # Administration site
    "django.contrib.auth",           # User authentication framework
    "django.contrib.contenttypes",   # Content type system
    "django.contrib.sessions",       # Session management
    "django.contrib.messages",       # Temporary message storage
    "django.contrib.staticfiles",    # Static file handling (CSS, JS)

    # Third-party integrations
    "rest_framework",                # Django REST Framework for API serialization & views
    "corsheaders",                   # Cross-Origin Resource Sharing for React frontend communication

    # Local application module
    "apps.leads",                    # Solar lead intake, customer deduplication, and Google Forms webhook
]

# HTTP Request/Response Processing Middleware Pipeline
MIDDLEWARE = [
    # CorsMiddleware must be at the top to handle browser OPTIONS preflight requests from React
    "corsheaders.middleware.CorsMiddleware",

    # Standard Django security and session middleware
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# Root Python module containing the URL pattern definitions
ROOT_URLCONF = "config.urls"

# Template rendering configuration
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# WSGI application path for web server deployment
WSGI_APPLICATION = "config.wsgi.application"

# Database Configuration:
# Defaults to PostgreSQL. If USE_SQLITE=1 is set, it falls back to local SQLite
# so team members can run the backend without needing PostgreSQL running locally.
USE_SQLITE = os.environ.get("USE_SQLITE", "0") == "1"

if USE_SQLITE:
    # Local lightweight SQLite database (stored as db.sqlite3 in backend directory)
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }
else:
    # Production-ready PostgreSQL 16 database configuration
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.environ.get("DB_NAME", "mihira"),         # Database name
            "USER": os.environ.get("DB_USER", "mihira"),         # Database username
            "PASSWORD": os.environ.get("DB_PASS", "mihira"),     # Database password
            "HOST": os.environ.get("DB_HOST", "localhost"),      # Host (localhost or 'db' in Docker)
            "PORT": os.environ.get("DB_PORT", "5432"),           # PostgreSQL standard port
        }
    }

# Django REST Framework Settings
REST_FRAMEWORK = {
    # Public access for lead submission forms and incoming Google Form webhooks
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",
    ],
    # Request body parsers to handle JSON, standard HTML form submissions, and file uploads
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
        "rest_framework.parsers.FormParser",
        "rest_framework.parsers.MultiPartParser",
    ],
}

# Cross-Origin Resource Sharing (CORS) Configuration
# Allows the React Next.js frontend (running on http://localhost:3000) to call the API
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# Internationalization and Localization
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"    # Indian Standard Time (IST)
USE_I18N = True
USE_TZ = True                 # Store all timestamps in UTC internally, render in local timezone

# Static files (CSS, JavaScript, Images)
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# Default primary key field type for auto-generated model IDs
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
