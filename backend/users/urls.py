from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import AdminUserListView, EmailTokenObtainPairView, InvitationCreateView, RegisterView

urlpatterns = [
    path("admin/users/", AdminUserListView.as_view(), name="admin-user-list"),
    path("invitations/", InvitationCreateView.as_view(), name="invitation-create"),
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/token/", EmailTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]
