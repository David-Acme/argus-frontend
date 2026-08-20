import { face } from './face';
import { home } from './home';
import { notFound } from './not-found';
import { pairing } from './pairing';
import { qr } from './qr';
import { voice } from './voice';
import { welcome } from './welcome';
import { login } from './login';
import { approve } from './approve';
import { agenda } from './agenda';

export const screens = {
  home,
  qr,
  'not-found': notFound,
  welcome,
  pairing,
  face,
  voice,
  login,
  approve,
  agenda,
};
