export const approve = {
  title: 'Connect another device',
  subtitle:
    'Scan the QR code shown on your computer to sign in there automatically.',
  scan: 'Scan QR code',
  checking: 'Checking the request…',
  'confirm-title': 'Is this you?',
  'confirm-hint': 'Approve only if you are the one signing in on this device right now.',
  origin: {
    lan: 'On your home network',
    loopback: 'On this same computer',
    tunnel: 'From outside your home',
    external: 'From outside your home',
    unknown: 'From an unknown place',
  },
  address: 'Address {ip}',
  'remote-warning':
    'This request comes from outside your network. If someone asked you to scan this code, cancel it.',
  confirm: 'Approve access',
  approving: 'Approving access…',
  approved: 'Done! The other device is now signed in.',
  expired: 'This code is no longer valid. Create a new one on the other device.',
  error: 'Could not approve access. Try again.',
} as const;
