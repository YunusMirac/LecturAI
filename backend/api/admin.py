from django.contrib import admin

from api.models import Courses, Questions, Quizzes

admin.site.register(Courses)
admin.site.register(Quizzes)
admin.site.register(Questions)
