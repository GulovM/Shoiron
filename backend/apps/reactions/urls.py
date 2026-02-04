from django.urls import path

from .views import ReactionToggleView

urlpatterns = [
    path('reactions/toggle', ReactionToggleView.as_view(), name='reactions-toggle'),
]
