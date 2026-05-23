"""
DRF-Berechtigungen anhand von `profiles.role` (E-Mail = Verknüpfung zu `auth_user`).

Hinweis: JWT identifiziert den `auth_user`; das Profil wird per E-Mail nachgeschlagen.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from rest_framework.permissions import BasePermission

from users.models import Profiles

if TYPE_CHECKING:
    from rest_framework.request import Request


def profile_for_user(user) -> Profiles | None:
    if not getattr(user, "is_authenticated", False) or not user.email:
        return None
    return Profiles.objects.filter(email__iexact=user.email.strip()).first()


class IsAdmin(BasePermission):
    """Nur Profil-Rolle `admin`."""

    message = "Nur Administratoren."

    def has_permission(self, request: Request, view) -> bool:
        p = profile_for_user(request.user)
        return p is not None and p.role == Profiles.Role.ADMIN


class IsTeacher(BasePermission):
    """Nur Profil-Rolle `teacher`."""

    message = "Nur Lehrkräfte."

    def has_permission(self, request: Request, view) -> bool:
        p = profile_for_user(request.user)
        return p is not None and p.role == Profiles.Role.TEACHER


class IsStudent(BasePermission):
    """Nur Profil-Rolle `student`."""

    message = "Nur für Schüler:innen."

    def has_permission(self, request: Request, view) -> bool:
        p = profile_for_user(request.user)
        return p is not None and p.role == Profiles.Role.STUDENT


class IsAdminOrTeacher(BasePermission):
    """Admin oder Lehrkraft (z. B. Kurs anlegen, Schüler einladen)."""

    message = "Nur Administratoren oder Lehrkräfte."

    def has_permission(self, request: Request, view) -> bool:
        p = profile_for_user(request.user)
        if p is None:
            return False
        return p.role in (Profiles.Role.ADMIN, Profiles.Role.TEACHER)
