"""
Einladungen: Token erzeugen und Zeilen in `invitations` anlegen.

Geschäftsregeln:
- Admin → Lehrer: role=teacher, course_id=NULL
- Lehrer → Schüler: role=student, course_id Pflicht, Kurs muss dem einladenden Lehrer gehören
"""

import secrets
import uuid
from datetime import timedelta
from uuid import UUID

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied

from api.models import Courses
from users.models import Invitation, Profiles


def generate_invite_token() -> str:
    """URL-sicheres Token (kollisionsarm)."""
    return secrets.token_urlsafe(32)


@transaction.atomic
def create_teacher_invitation(*, invited_by: Profiles, email: str) -> Invitation:
    """Plattformweite Lehrer-Einladung (nur durch Admin aufrufen)."""
    if invited_by.role != Profiles.Role.ADMIN:
        raise PermissionDenied("Nur Admins dürfen Lehrkräfte plattformweit einladen.")

    normalized = email.strip().lower()
    now = timezone.now()
    expires = now + timedelta(days=7)

    for _ in range(5):
        token = generate_invite_token()
        try:
            return Invitation.objects.create(
                id=uuid.uuid4(),
                course=None,
                invited_by=invited_by,
                email=normalized,
                role=Invitation.Role.TEACHER,
                invite_token=token,
                status=Invitation.Status.PENDING,
                expires_at=expires,
                created_at=now,
                accepted_at=None,
            )
        except IntegrityError:
            continue
    raise IntegrityError("Konnte kein eindeutiges invite_token erzeugen.")


@transaction.atomic
def create_student_invitation(
    *,
    invited_by: Profiles,
    email: str,
    course_id: UUID,
) -> Invitation:
    """Schüler:in in einen konkreten Kurs einladen (nur Lehrkraft des Kurses)."""
    if invited_by.role != Profiles.Role.TEACHER:
        raise PermissionDenied("Nur Lehrkräfte dürfen Schüler:innen zu Kursen einladen.")

    course = Courses.objects.filter(id=course_id).select_related("teacher").first()
    if course is None:
        raise ValueError("Kurs nicht gefunden.")
    if course.teacher_id != invited_by.id:
        raise PermissionDenied("Du bist nicht die Lehrperson dieses Kurses.")

    normalized = email.strip().lower()
    now = timezone.now()
    expires = now + timedelta(days=7)

    for _ in range(5):
        token = generate_invite_token()
        try:
            return Invitation.objects.create(
                id=uuid.uuid4(),
                course=course,
                invited_by=invited_by,
                email=normalized,
                role=Invitation.Role.STUDENT,
                invite_token=token,
                status=Invitation.Status.PENDING,
                expires_at=expires,
                created_at=now,
                accepted_at=None,
            )
        except IntegrityError:
            continue
    raise IntegrityError("Konnte kein eindeutiges invite_token erzeugen.")
