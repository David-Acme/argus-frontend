export const qr = {
  'blocked-title': 'No camera access',
  'blocked-description': 'Argus needs the camera to read the code. Enable it in the system settings.',
  'detected-description': 'Done, going back…',
  'invalid-fallback': 'That code is not valid.',
  'close-scanner': 'Close the scanner',
  'torch-on': 'Turn on the flashlight',
  'torch-off': 'Turn off the flashlight',
  'back-to-camera': 'Back to camera',
  purpose: {
    server: {
      title: 'Link server',
      hint: 'Scan the QR code shown in your Argus server terminal.',
      'manual-label': 'Enter code manually',
      'manual-placeholder': 'Pairing code',
      'invalid-message': 'That QR does not belong to an Argus server.',
    },
    invite: {
      title: 'Argus invitation',
      hint: 'Scan the invitation QR code.',
      'manual-label': 'Enter invitation code',
      'manual-placeholder': 'Invitation code',
      'invalid-message': 'That invitation code is not valid.',
    },
    generic: {
      title: 'Scan code',
      hint: 'Frame the QR code within the guide.',
    },
    login: {
      title: 'Connect another device',
      hint: 'Scan the QR code shown on your computer to sign in there.',
      'invalid-message': 'That QR is not a sign-in code.',
    },
  },
  feedback: {
    requesting: 'Requesting camera',
    searching: 'Searching for code',
    detected: 'Code detected',
    invalid: 'Invalid code',
    blocked: 'Camera blocked',
  },
};
