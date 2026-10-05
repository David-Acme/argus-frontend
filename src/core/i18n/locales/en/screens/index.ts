import { face } from './face';
import { home } from './home';
import { notFound } from './not-found';
import { pairing } from './pairing';
import { qr } from './qr';
import { voice } from './voice';
import { welcome } from './welcome';
import { invitation } from './invitation';
import { login } from './login';
import { approve } from './approve';
import { cameras } from './cameras';
import { agenda } from './agenda';
import { projects } from './projects';
import { users } from './users';
import { profile } from './profile';
import { security } from './security';
import { settings } from './settings';
import { sessions } from './sessions';
import { response } from './response';

export const screens = {
  home,
  qr,
  'not-found': notFound,
  welcome,
  invitation,
  pairing,
  face,
  voice,
  login,
  approve,
  agenda,
  cameras,
  projects,
  users,
  profile,
  security,
  settings,
  sessions,
  response,
};
