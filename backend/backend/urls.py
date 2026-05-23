"""
URL-Konfiguration: Django-Admin + eine API-Wurzel (`/api/`), die Domänenrouten bündelt.
"""

from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("api.urls")),
]
