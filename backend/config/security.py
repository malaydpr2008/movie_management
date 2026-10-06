from ninja.errors import HttpError
from apps.core.models import ProjectMembership
from django.shortcuts import get_object_or_404

def require_project_role(allowed_roles: list):
    def dependency(request):
        # Extract project_id from the path args/kwargs in Ninja
        # Usually ninja passes path parameters in request.resolver_match.kwargs
        project_id = request.resolver_match.kwargs.get('project_id')
        if not project_id:
            # If no project_id in path, maybe it's in the body, but let's assume it's for path
            raise HttpError(400, "project_id missing in request path")

        if not request.user.is_authenticated:
            raise HttpError(401, "Unauthorized")

        membership = ProjectMembership.objects.filter(user=request.user, project_id=project_id).first()
        if not membership:
            raise HttpError(403, "Forbidden: Not a member of this project")
        
        if membership.role not in allowed_roles:
            raise HttpError(403, "Forbidden: Insufficient role")
        
        return membership
    return dependency
