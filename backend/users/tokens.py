from django.contrib.auth.tokens import PasswordResetTokenGenerator


class EmailVerificationTokenGenerator(PasswordResetTokenGenerator):
    """Einmal gültig: Hash enthält u. a. `is_active` — nach Verifizierung wird derselbe Token ungültig."""

    def _make_hash_value(self, user, timestamp):
        return f"{user.pk}{user.email}{user.password}{user.is_active}{timestamp}"


email_verification_token = EmailVerificationTokenGenerator()
