from django.urls import path
from .views import MockDataView, ContactView, HabitListView, HabitDetailView, HabitLogView

urlpatterns = [
    path('mock-data/', MockDataView.as_view(), name='mock-data'),
    path('contact/', ContactView.as_view(), name='contact'),
    path('habits/', HabitListView.as_view(), name='habit-list'),
    path('habits/<int:pk>/', HabitDetailView.as_view(), name='habit-detail'),
    path('habits/<int:pk>/toggle/', HabitLogView.as_view(), name='habit-toggle'),
]
