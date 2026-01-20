from rest_framework import serializers
from datetime import date
from .models import ContactMessage, Habit, HabitLog

class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = ['id', 'name', 'email', 'message', 'created_at']
        read_only_fields = ['id', 'created_at']

class HabitSerializer(serializers.ModelSerializer):
    completed_today = serializers.SerializerMethodField()
    recent_logs = serializers.SerializerMethodField()

    class Meta:
        model = Habit
        fields = ['id', 'name', 'start_date', 'end_date', 'completed_today', 'recent_logs', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_completed_today(self, obj):
        today = date.today()
        return HabitLog.objects.filter(habit=obj, date=today, completed=True).exists()

    def get_recent_logs(self, obj):
        # return list of all completed dates for heatmap history
        logs = HabitLog.objects.filter(habit=obj, completed=True)
        return [log.date for log in logs]
