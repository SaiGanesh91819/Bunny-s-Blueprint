from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import ContactMessage
from .serializers import ContactSerializer, HabitSerializer

class ContactView(APIView):
    def post(self, request):
        serializer = ContactSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Message received!"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# ... (imports)
from datetime import date
from django.db import models
from rest_framework.permissions import IsAuthenticated
from .models import ContactMessage, Habit, HabitLog
from .serializers import ContactSerializer, HabitSerializer

# ... (ContactView)

class HabitListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = date.today()
        # Filter: Started before/on today AND (No end date OR Ended after/on today)
        # Filter: (No end date OR Ended after/on today) - Allow future start dates
        habits = Habit.objects.filter(
            user=request.user
        ).filter(
            models.Q(end_date__isnull=True) | models.Q(end_date__gte=today)
        ).order_by('created_at')
        
        serializer = HabitSerializer(habits, many=True)
        return Response({
            "status": "success",
            "message": "Habits retrieved successfully",
            "data": serializer.data
        }, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = HabitSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response({
                "status": "success",
                "message": "Habit created successfully",
                "data": serializer.data
            }, status=status.HTTP_201_CREATED)
        return Response({
            "status": "error",
            "message": "Invalid data",
            "data": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

class HabitDetailView(APIView):
    permission_classes = [IsAuthenticated]
    
    # PATCH: Update habit definition (rename, change dates) - NOT toggle
    def patch(self, request, pk):
        try:
            habit = Habit.objects.get(pk=pk, user=request.user)
            serializer = HabitSerializer(habit, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response({
                    "status": "success",
                    "message": "Habit updated",
                    "data": serializer.data
                })
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Habit.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, pk):
        try:
            habit = Habit.objects.get(pk=pk, user=request.user)
            habit.delete()
            return Response({
                "status": "success", 
                "message": "Habit deleted",
                "data": None
            }, status=status.HTTP_200_OK)
        except Habit.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

class HabitLogView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        """Toggle completion for a specific habit on TODAY"""
        try:
            habit = Habit.objects.get(pk=pk, user=request.user)
            today = date.today()
            
            log, created = HabitLog.objects.get_or_create(habit=habit, date=today)
            
            if not created:
                # If it existed, toggle it (or delete it if you want 'uncheck' behavior to verify logs)
                # Strategy: Toggle the boolean
                log.completed = not log.completed
                log.save()
            else:
                log.completed = True
                log.save()

            return Response({
                "status": "success",
                "message": "Habit logged",
                "data": {
                    "habit_id": habit.id,
                    "date": today,
                    "completed": log.completed
                }
            })
        except Habit.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

# ... (MockDataView)

class MockDataView(APIView):
    def get(self, request):
        data = {
            "stats": {
                "users": "12.5k",
                "active_plans": 850,
                "community_posts": 3400
            },
            "plans": [
                {
                    "name": "Starter", 
                    "price": 29, 
                    "features": ["Custom Diet Plan", "Standard Workouts"]
                },
                {
                    "name": "Transformer", 
                    "price": 59, 
                    "features": ["Custom Diet Plan", "Advanced Workouts", "Priority Support"]
                },
                {
                    "name": "Elite", 
                    "price": 99, 
                    "features": ["Everything in Pro", "Daily 1-on-1 Coaching", "Video Form Analysis"]
                }
            ],
            "dashboard": {
                 "progress": 75,
                 "active_plan": "Pro Transformer",
                 "active_plan_details": {
                    "renewal_date": "Oct 24, 2026",
                    "status": "Active",
                    "features_unlocked": ["Advanced Workouts", "Diet Plans", "No Ads"]
                 },
                 "stats": {
                    "weight": {"current": 82, "target": 75, "unit": "kg", "start": 90},
                    "water": {"current": 1.5, "target": 3.0, "unit": "L"},
                    "steps": {"current": 4500, "target": 10000, "unit": "steps"}
                 },
                 "daily_goals": [
                     {"task": "Drink 3L Water", "completed": True},
                     {"task": "30 mins HIIT", "completed": False},
                     {"task": "Meal Prep (Dinner)", "completed": False}
                 ],
                 "content": [
                    {"title": "Mastering the Squat", "type": "Video", "duration": "15 min", "thumbnail": "assets/images/content1.jpg"},
                    {"title": "Top 10 High Protein Foods", "type": "Article", "read_time": "5 min", "thumbnail": "assets/images/content2.jpg"},
                    {"title": "Sleep & Recovery Science", "type": "Article", "read_time": "8 min", "thumbnail": "assets/images/content3.jpg"},
                    {"title": "HIIT vs LISS Cardio", "type": "Video", "duration": "20 min", "thumbnail": "assets/images/content4.jpg"},
                    {"title": "Mobility Routine", "type": "Video", "duration": "12 min", "thumbnail": "assets/images/content5.jpg"},
                    {"title": "Supplements 101", "type": "Article", "read_time": "6 min", "thumbnail": "assets/images/content6.jpg"},
                    {"title": "Advanced Deadlift Form", "type": "Video", "duration": "18 min", "thumbnail": "assets/images/content7.jpg"},
                    {"title": "Vegan Meal Prep", "type": "Video", "duration": "25 min", "thumbnail": "assets/images/content8.jpg"},
                    {"title": "Mindset for Growth", "type": "Article", "read_time": "4 min", "thumbnail": "assets/images/content9.jpg"},
                    {"title": "Home Workout: No Gear", "type": "Video", "duration": "30 min", "thumbnail": "assets/images/content10.jpg"},
                    {"title": "Understanding Macros", "type": "Article", "read_time": "10 min", "thumbnail": "assets/images/content11.jpg"},
                    {"title": "Yoga for Lifters", "type": "Video", "duration": "22 min", "thumbnail": "assets/images/content12.jpg"},
                    {"title": "Best Post-Workout Meals", "type": "Article", "read_time": "5 min", "thumbnail": "assets/images/content13.jpg"}
                 ],
                 "resources": [
                    {"name": "Weekly Meal Planner", "type": "PDF", "size": "1.2 MB"},
                    {"name": "Hypertrophy Training Log", "type": "Excel", "size": "500 KB"},
                    {"name": "Keto Diet Guide", "type": "PDF", "size": "2.4 MB"}
                 ]
            }
        }
        return Response(data)
