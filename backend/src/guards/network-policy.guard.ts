import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { NetworkPoliciesService } from '../modules/network-policies/network-policies.service';
import { getClientIp } from '../modules/network-policies/client-ip';

@Injectable()
export class NetworkPolicyGuard implements CanActivate {
  constructor(private readonly policies: NetworkPoliciesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    if (!request.user) throw new UnauthorizedException();
    await this.policies.assertAllowed(
      request.user.network_policy_code,
      getClientIp(request),
    );
    return true;
  }
}
