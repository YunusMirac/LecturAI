from django.contrib import admin
from users.models import Invitation, Profiles

admin.site.register(Profiles)
admin.site.register(Invitation)
