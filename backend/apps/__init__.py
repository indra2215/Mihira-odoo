"""
Mihira Solar ERP - Django Applications Root Package.
Provides centralized access to all modular Django business applications.
"""

# Import sub-application package for direct access (e.g. `from apps import leads`)
from . import leads

# Explicit export list (__all__) documenting available applications in this package
__all__ = [
    "leads",
]
