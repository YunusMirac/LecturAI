from django.contrib import admin

from users.models import Profiles

from .models import Courses, Quizzes, Questions

# Wir registrieren deine wichtigsten Haupttabellen für das Dashboard
admin.site.register(Profiles)
admin.site.register(Courses)
admin.site.register(Quizzes)
admin.site.register(Questions)

# Register your models here.
