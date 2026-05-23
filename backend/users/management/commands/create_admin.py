"""
Legt den ersten (oder einen weiteren) Plattform-Admin an: `auth_user` + `profiles`.

Nutzung:
  python manage.py create_admin admin@beispiel.de
  python manage.py create_admin admin@beispiel.de --password 'sicheres-passwort'

Ohne --password werden Passwort und Bestätigung interaktiv abgefragt (getpass).
"""

from __future__ import annotations

import getpass
import uuid

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from users.models import Profiles

User = get_user_model()


def _validate_password_or_exit(password: str, user: User) -> None:
    try:
        validate_password(password, user=user)
    except DjangoValidationError as exc:
        lines = "\n".join(f"  • {m}" for m in exc.messages)
        raise CommandError(
            "Passwort erfüllt die Django-Richtlinien nicht:\n"
            f"{lines}\n"
            "Tipp: Nutze ein längeres, zufälligeres Passwort (nicht ähnlich zur E-Mail)."
        ) from exc


class Command(BaseCommand):
    help = "Erstellt oder aktualisiert einen Admin: Django-User + profiles.role=admin (gleiche E-Mail)."

    def add_arguments(self, parser):
        parser.add_argument("email", type=str, help="E-Mail-Adresse (Login + Profil)")
        parser.add_argument(
            "--password",
            type=str,
            default=None,
            help="Passwort (optional; sonst interaktive Eingabe)",
        )

    def handle(self, *args, **options):
        email = options["email"].strip().lower()
        if not email or "@" not in email:
            raise CommandError("Bitte eine gültige E-Mail angeben.")

        raw_pw = options["password"]
        if raw_pw is None:
            pw = getpass.getpass("Passwort: ")
            pw2 = getpass.getpass("Passwort (Wiederholung): ")
            if pw != pw2:
                raise CommandError("Passwörter stimmen nicht überein.")
        else:
            pw = raw_pw

        if len(pw) < 8:
            raise CommandError("Passwort muss mindestens 8 Zeichen haben.")

        now = timezone.now()

        with transaction.atomic():
            user = User.objects.filter(email__iexact=email).first()
            created = user is None
            if created:
                user = User(
                    username=email,
                    email=email,
                    is_active=True,
                    is_staff=True,
                    is_superuser=True,
                )
            else:
                user.username = email
                user.email = email
                user.is_active = True
                user.is_staff = True
                user.is_superuser = True

            _validate_password_or_exit(pw, user)
            user.set_password(pw)
            user.save()

            profile = Profiles.objects.filter(email__iexact=email).first()
            if profile is None:
                Profiles.objects.create(
                    id=uuid.uuid4(),
                    email=email,
                    role=Profiles.Role.ADMIN,
                    created_at=now,
                    updated_at=now,
                )
                self.stdout.write(self.style.SUCCESS(f"Profil neu angelegt (admin): {email}"))
            else:
                profile.role = Profiles.Role.ADMIN
                profile.updated_at = now
                profile.save(update_fields=["role", "updated_at"])
                self.stdout.write(self.style.SUCCESS(f"Profil auf admin gesetzt: {email}"))

            action = "angelegt" if created else "aktualisiert"
            self.stdout.write(self.style.SUCCESS(f"Django-User {action}: {email}"))

        self.stdout.write("Login: POST /api/auth/token/ mit E-Mail und Passwort.")
