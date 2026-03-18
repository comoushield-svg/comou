import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('API 키가 없거나 형식이 올바르지 않습니다.');
    }

    const apiKey = authHeader.slice(7);
    const validKey = process.env.COMOU_API_KEY;

    if (!validKey) {
      throw new UnauthorizedException('서버에 API 키가 설정되지 않았습니다.');
    }

    if (apiKey !== validKey) {
      throw new UnauthorizedException('유효하지 않은 API 키입니다.');
    }

    return true;
  }
}
