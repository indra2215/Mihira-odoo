"""
Mihira Solar ERP - Django Project Configuration Package.
Exposes root URL routing, WSGI application entrypoint, and project metadata.
"""

# Project metadata
__title__ = "Mihira Solar ERP"
__version__ = "1.0.0"

# Explicit export list (__all__) documenting available configuration symbols
__all__ = [
    "__title__",
    "__version__",
    "application",
]


def __getattr__(name: str):
    """
    Dynamically loads configuration objects on-demand.
    Allows importing WSGI application (`from config import application`) cleanly.
    """
    # Dynamic loader for WSGI application callable
    if name == "application":
        from .wsgi import application
        return application

    # Raise standard AttributeError if requested attribute is not exported
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
