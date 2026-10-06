import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const orgId =
      request.headers['x-org-id'] ||
      request.params.orgId ||
      request.query.orgId;

    if (!orgId) {
      throw new BadRequestException('Organization context required');
    }

    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // User-এর org list check
    if (user.orgs && !user.orgs.includes(orgId)) {
      throw new ForbiddenException('No access to this organization');
    }

    request.orgId = orgId;
    return true;
  }
}
