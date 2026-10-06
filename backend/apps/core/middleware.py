from django.contrib.auth import get_user_model

User = get_user_model()

class DevAuthMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Auto-login as dev_admin for local development
        user, created = User.objects.get_or_create(
            username="dev_admin",
            defaults={"email": "admin@cineflow.local"}
        )
        request.user = user
        return self.get_response(request)
