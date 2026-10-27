export const login = {
  title: 'Sign in with your phone',
  lead: 'Open Argus on your phone and scan this code. Nothing to type.',
  'title-phone': 'Sign in with another device',
  'lead-phone': 'Open Argus where you are already signed in and scan this code. Nothing to type.',
  'qr-label': 'Sign-in code',
  waiting: 'Waiting for your phone · expires in {time}',
  'waiting-phone': 'Waiting for your other device · expires in {time}',
  preparing: 'Preparing the code…',
  expired: 'The code expired',
  approved: 'Done, you are in.',
  steps: {
    open: 'Open Argus on your phone',
    'open-phone': 'Open Argus on your other device',
    approve: 'Tap You → Connect another device',
    confirm: 'Scan the code and confirm',
  },
  'new-code': 'Show another code',
  face: 'Sign in with your face',
  'waiting-owner': {
    title: 'Create your account first',
    lead: 'Open Argus on your phone, create your account with your face and come back here.',
    done: 'I did it',
  },
  error: {
    title: 'I could not prepare the code',
    lead: 'Check that your Argus is on and on your network.',
  },
} as const;
