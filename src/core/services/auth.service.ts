import { httpService } from '@/core/services/http';
import { sessionService } from '@/core/services/session.service';
import { useLocaleStore } from '@/core/stores';
import type {
  ICreateDeviceLoginResponse,
  IDeviceLoginStatusResponse,
  IHasAdminResponse,
  IRegisterInput,
  IAuthSession,
  IResponseLoginDto,
  IResponseStatusDto,
  IServiceResponse,
} from '@/core/interfaces';

const LOGIN_PATH = '/auth/login';
const REGISTER_PATH = '/auth/register';
const HAS_ADMIN_PATH = '/auth/has-admin';
const STATUS_PATH = '/auth/status';
const LOGOUT_PATH = '/auth/logout';
const DEVICE_LOGIN_PATH = '/auth/device-login';

const FACE_FILE = { name: 'image', uri: '', filename: 'face.jpg', contentType: 'image/jpeg' };

class AuthService {
  async login(imageUri: string): Promise<IServiceResponse<IResponseLoginDto>> {
    const response = await httpService.postMultipart<IResponseLoginDto>(LOGIN_PATH, {
      ...FACE_FILE,
      uri: imageUri,
    });
    await this.establishLoginSession(response);
    return response;
  }

  async register(input: IRegisterInput): Promise<IServiceResponse<IResponseLoginDto>> {
    const lang = useLocaleStore.getState().language;
    const response = await httpService.postMultipart<IResponseLoginDto>(REGISTER_PATH, {
      ...FACE_FILE,
      uri: input.imageUri,
    }, {
      lang,
      ...(input.name ? { name: input.name } : {}),
      ...(input.inviteCode ? { inviteCode: input.inviteCode } : {}),
    });
    await this.establishLoginSession(response);
    return response;
  }

  async hasAdmin(): Promise<IServiceResponse<IHasAdminResponse>> {
    return httpService.get<IHasAdminResponse>(HAS_ADMIN_PATH);
  }

  async status(): Promise<IServiceResponse<IResponseStatusDto>> {
    return httpService.get<IResponseStatusDto>(STATUS_PATH);
  }

  async logout(): Promise<IServiceResponse<{ updated: boolean } | null>> {
    try {
      return await httpService.patch<{ updated: boolean } | null>(LOGOUT_PATH, undefined, {
        skipAuthRetry: true,
      });
    } finally {
      await sessionService.clearSession();
    }
  }

  /** Desktop: creates a short-lived login challenge and returns its secret id. */
  async createDeviceLogin(): Promise<IServiceResponse<ICreateDeviceLoginResponse>> {
    return httpService.post<ICreateDeviceLoginResponse>(DEVICE_LOGIN_PATH, {}, { skipAuthRetry: true });
  }

  /** Mobile: approves a pending challenge; the desktop polls it for tokens. */
  async approveDeviceLogin(id: string): Promise<IServiceResponse<{ approved: boolean } | null>> {
    return httpService.post<{ approved: boolean } | null>(`${DEVICE_LOGIN_PATH}/${id}/approve`, {});
  }

  /** Desktop: polls the challenge until approved/expired. */
  async pollDeviceLogin(id: string): Promise<IServiceResponse<IDeviceLoginStatusResponse>> {
    const response = await httpService.get<IDeviceLoginStatusResponse>(`${DEVICE_LOGIN_PATH}/${id}`, {
      skipAuthRetry: true,
    });
    if (
      response.ok &&
      response.info?.status === 'approved' &&
      response.info.accessToken &&
      response.info.refreshToken
    ) {
      await sessionService.establish({
        accessToken: response.info.accessToken,
        refreshToken: response.info.refreshToken,
        user: {
          id: response.info.userId ?? 0,
          name: response.info.name ?? '—',
          role: response.info.role ?? 'resident',
          isActive: true,
          personId: null,
        },
      });
    }
    return response;
  }

  private async establishLoginSession(
    response: IServiceResponse<IResponseLoginDto>,
  ): Promise<void> {
    if (!response.ok || !response.info) return;
    await sessionService.establish(this.toSession(response.info));
  }

  private toSession(dto: IResponseLoginDto): IAuthSession {
    return {
      accessToken: dto.accessToken,
      refreshToken: dto.refreshToken,
      user: {
        id: dto.userId,
        name: dto.name,
        role: dto.role,
        isActive: true,
        personId: dto.personId,
      },
    };
  }
}

export const authService = new AuthService();
