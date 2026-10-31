"""
Automated Test Package for Mihira Solar ERP Backend.
Imports and exposes test suite classes for automated test discovery and execution.
"""

# Import the leads API test suite class for direct package-level access
from .test_leads_api import LeadsAPITestCase

# Explicit export list (__all__) documenting all test cases available in this package
__all__ = [
    "LeadsAPITestCase",
]
