"""
Unmanaged ORM-Spiegel für Django-Auth- und Profil-Tabellen (Supabase/PostgreSQL).

- `Profiles` (`profiles`), `Invitation` (`invitations`): Nutzeridentität & Onboarding.
- Kurse, Quiz, …: `api.models` (gleiche DB, `managed=False`).
"""

from __future__ import annotations

import uuid

from django.db import models


class AuthGroup(models.Model):
    name = models.CharField(unique=True, max_length=150)

    class Meta:
        managed = False
        db_table = "auth_group"


class AuthPermission(models.Model):
    name = models.CharField(max_length=255)
    content_type = models.ForeignKey("api.DjangoContentType", models.DO_NOTHING)
    codename = models.CharField(max_length=100)

    class Meta:
        managed = False
        db_table = "auth_permission"
        unique_together = (("content_type", "codename"),)


class AuthGroupPermissions(models.Model):
    id = models.BigAutoField(primary_key=True)
    group = models.ForeignKey(AuthGroup, models.DO_NOTHING)
    permission = models.ForeignKey(AuthPermission, models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = "auth_group_permissions"
        unique_together = (("group", "permission"),)


class AuthUser(models.Model):
    password = models.CharField(max_length=128)
    last_login = models.DateTimeField(blank=True, null=True)
    is_superuser = models.BooleanField()
    username = models.CharField(unique=True, max_length=150)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    email = models.CharField(max_length=254)
    is_staff = models.BooleanField()
    is_active = models.BooleanField()
    date_joined = models.DateTimeField()

    class Meta:
        managed = False
        db_table = "auth_user"


class AuthUserGroups(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(AuthUser, models.DO_NOTHING)
    group = models.ForeignKey(AuthGroup, models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = "auth_user_groups"
        unique_together = (("user", "group"),)


class AuthUserUserPermissions(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(AuthUser, models.DO_NOTHING)
    permission = models.ForeignKey(AuthPermission, models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = "auth_user_user_permissions"
        unique_together = (("user", "permission"),)


class Profiles(models.Model):
    """Tabelle `profiles` — Rollen: admin, teacher, student."""

    class Role(models.TextChoices):
        ADMIN = "admin", "Admin"
        TEACHER = "teacher", "Teacher"
        STUDENT = "student", "Student"

    id = models.UUIDField(primary_key=True)
    email = models.TextField(unique=True)
    role = models.TextField()
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = "profiles"


class Invitation(models.Model):
    """
    Tabelle `invitations` — Whitelist-Registrierung.
    - Lehrer-Einladung (nur Admin): role=teacher, course_id NULL.
    - Schüler-Einladung (Lehrer): role=student, course_id Pflicht.
    """

    class Role(models.TextChoices):
        TEACHER = "teacher", "Teacher"
        STUDENT = "student", "Student"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        DECLINED = "declined", "Declined"
        EXPIRED = "expired", "Expired"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(
        "api.Courses",
        models.DO_NOTHING,
        db_column="course_id",
        blank=True,
        null=True,
        related_name="invitations",
    )
    invited_by = models.ForeignKey(
        Profiles,
        models.DO_NOTHING,
        db_column="invited_by",
        related_name="invitations_sent",
    )
    email = models.TextField()
    role = models.TextField()
    invite_token = models.TextField(unique=True)
    status = models.TextField()
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField()
    accepted_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = "invitations"
