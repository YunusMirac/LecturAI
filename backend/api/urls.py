from django.urls import include, path

from .views import CourseListCreateView

urlpatterns = [
    path("courses/", CourseListCreateView.as_view(), name="course-list"),
    path("", include("users.urls")),
]
