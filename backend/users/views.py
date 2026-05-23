from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import EmailTokenObtainPairSerializer, RegisterSerializer
from .tokens import email_verification_token

User = get_user_model()


class EmailTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"


class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "register"

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = email_verification_token.make_token(user)
        frontend = getattr(settings, "FRONTEND_PUBLIC_URL", "").rstrip("/")
        query = urlencode({"uid": uid, "token": token})
        verify_url = f"{frontend}/verify-email?{query}"

        subject = "LecturAI – E-Mail bestätigen"
        body = (
            f"Hallo,\n\nbitte bestätige deine E-Mail mit diesem Link:\n\n{verify_url}\n\n"
            f"Wenn du dich nicht registriert hast, ignoriere diese Nachricht.\n"
        )
        send_mail(
            subject,
            body,
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            fail_silently=False,
        )

        return Response(
            {
                "detail": "Registrierung erfolgreich. Bitte E-Mail bestätigen, danach Login möglich.",
                "email": user.email,
            },
            status=status.HTTP_201_CREATED,
        )


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, uidb64, token):
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None

        if user is not None and email_verification_token.check_token(user, token):
            user.is_active = True
            user.save(update_fields=["is_active"])
            return Response(
                {
                    "detail": "E-Mail bestätigt. Du kannst dich jetzt mit E-Mail und Passwort anmelden."
                }
            )
        return Response(
            {"detail": "Ungültiger oder abgelaufener Bestätigungslink."},
            status=status.HTTP_400_BAD_REQUEST,
        )
