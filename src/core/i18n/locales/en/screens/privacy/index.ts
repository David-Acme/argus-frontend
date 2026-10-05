export const privacy = {
  title: 'Privacy',
  subtitle: 'You decide what Argus does with your data. Change it whenever you like.',
  step: 'Privacy',
  consent: {
    eyebrow: 'Before you start',
    title: 'Your privacy, your call',
    intro:
      'Argus runs only on the computer in your home. Nothing goes to the cloud. Choose what you allow; anything you leave off stays off for you.',
    'review-title': 'Review your privacy',
    'review-intro':
      'Please read the notice and choose what you allow before going on. Anything you leave off stays off for you.',
    'updated-title': 'The notice changed',
    'updated-intro':
      'We updated the privacy notice and the terms. Read them and confirm your choices to continue.',
    'essentials-title': 'The essentials',
    'essential-local': 'Everything is processed and stored on the computer in your home, never in the cloud.',
    'essential-face':
      'You sign in with your face: Argus keeps a numeric pattern of it and your registration photo in private storage.',
    'essential-retention':
      'What Argus learns is erased over time on its own, and at once if you withdraw your permission.',
    'essential-beta': 'Argus is in development and is not a certified alarm system.',
    'choices-title': 'What you allow',
    'choices-hint': 'Everything starts off. Turn on only what you want.',
    accept: 'Accept and continue',
    'accept-hint': 'By continuing you accept the privacy notice and the terms (version {version}).',
    decline: 'I do not accept',
    'decline-onboarding-title': 'No account was created',
    'decline-onboarding-description':
      'Without accepting the notice we cannot register your face. Come back whenever you like.',
    'decline-title': 'Leave without accepting?',
    'decline-description':
      'Without accepting the notice and the terms you cannot use Argus on this device. You will be signed out.',
    'decline-confirm': 'Sign out',
    saving: 'Saving…',
    'save-failed': 'Your choices could not be saved',
    'saved-later':
      'Your account was created, but your privacy choices were not saved. We will ask again when you sign in.',
    'read-notice': 'Read the full notice and the terms',
  },
  signal: {
    presence: 'Presence at home',
    faceCameras: 'Recognize me on the cameras',
    voiceLearning: 'Learn my voice',
    cameraAudio: 'Camera audio',
  },
  'signal-hint': {
    presence:
      'Argus works out whether you are home (from your connection to the home network or an entrance camera) to decide whom to warn first. It keeps only “home” or “away”, never your location.',
    faceCameras:
      'The cameras recognize you by name. If you turn it off, they still see you as someone from home, just without a name.',
    voiceLearning:
      'Argus learns to recognize your voice in calls with it. If you turn it off, what it learned is erased.',
    cameraAudio:
      'Camera microphones hear everyone. They turn on only if everyone in the household allows it.',
  },
  'household-off': 'The owner turned this off for the whole household.',
  'withdraw-voice-title': 'Stop learning your voice?',
  'withdraw-voice-description':
    'Argus will erase what it learned about your voice right now and will not learn it while this is off.',
  'withdraw-presence-title': 'Stop using your presence?',
  'withdraw-presence-description':
    'Argus will erase your presence state and leave you out when deciding whom to warn first.',
  'withdraw-confirm': 'Turn off',
  section: {
    accepted: 'You accepted notice v{version} on {date}.',
    'not-accepted': 'You have not accepted the privacy notice yet.',
    unavailable: 'Your privacy settings could not be loaded.',
    loading: 'Loading your privacy settings…',
    'terms-title': 'Terms of use',
    'terms-summary':
      'Pre-release software, no warranty. It does not replace a monitoring service or emergency services.',
  },
  notice: {
    title: 'Privacy notice and terms',
    version: 'Version {version}',
    close: 'Close',
    'where-title': 'Where your data stays',
    'where-body':
      'Argus runs entirely on the computer in your home. Cameras, faces, voices, the agenda and notifications are processed and stored there. Nothing is sent to the cloud. If the owner turns on remote access, the tunnel only carries encrypted data between your devices and that computer.',
    'what-title': 'What Argus processes',
    'what-body':
      'Video and, when the camera has a microphone, camera audio. Your face to sign in and, if you allow it, to recognize you on the cameras. Your voice in calls with Argus (transcribed on the home computer) and, if you allow it, to recognize it. Your presence at home, if you allow it. Notifications, alert calls, the agenda and projects.',
    'sensitive-title': 'Sensitive data',
    'sensitive-body':
      'Faces and voices are biometric data, which {laws} treats as sensitive data. Argus stores them as numeric patterns, not recordings. Your registration photo stays in private storage and is never synced to phones.',
    'retention-title': 'How long data is kept',
    'retention-body':
      'Argus does not record video continuously: images and the history of security events are kept 30 days (the owner chooses 1 to 60), and 120 days for marked incidents. Unnamed faces: 30 days without being seen again (1 to 60). Learned voice: up to 180 days, erased when you withdraw permission. Presence: only the current state, erased when you withdraw permission or after 30 days without change. In {country}, the rules ask that video surveillance recordings be kept {videoDays} days (at most {videoMaxDays}) and up to {incidentDays} days when they show a possible incident.',
    'choices-title': 'You decide',
    'choices-body':
      'You choose what you allow: presence, recognition on the cameras, voice learning and camera audio. Change it any time in Profile > Privacy; without your permission those features stay off for you. The owner can turn a feature off for the whole household, never on for you, and can see what you chose.',
    'rights-title': 'Your rights',
    'rights-body':
      'You can ask the installation’s owner to see, correct or erase your data, or to deactivate your account. In {country} the authority is the {authority}.',
    'owner-title': 'The owner’s responsibility',
    'owner-body':
      'Whoever installs Argus must comply with the laws on video surveillance and third-party data ({laws}), put up visible camera signs and not point cameras at other people’s spaces more than necessary.',
    'terms-title': 'Software in development, no warranty',
    'terms-body':
      'Argus is in development (pre-beta) and is provided “as is”, without warranties of any kind. Its author is not responsible for misuse or malfunction of the software. Argus is not a certified security or alarm system: it does not replace a professional monitoring service or emergency services. Each user is responsible for complying with local laws on video surveillance and third-party data, including camera signage.',
    'legal-note': 'This notice is not legal advice.',
  },
  household: {
    title: 'Household privacy',
    signal: {
      presence: 'Presence at home',
      faceCameras: 'Recognize people on the cameras',
      voiceLearning: 'Learn voices',
      cameraAudio: 'Camera audio',
    },
    'signal-hint': {
      presence: 'Uses “home” or “away” for those who allow it, to decide whom to warn first.',
      faceCameras: 'Cameras name those who allow it; everyone else is seen as someone from home, without a name.',
      voiceLearning: 'Argus learns the voices of those who allow it in their calls. Turning it off erases them all.',
      cameraAudio: 'Camera microphones turn on only if everyone allows it.',
    },
    hint: 'Turn a feature off for everyone. You cannot turn it on for someone else: each person decides their own.',
    pending: '{count} undecided',
    'all-decided': 'Everyone has decided',
    'audio-held': 'Camera audio is off: {count} person(s) do not allow it or have not decided.',
    'audio-on': 'Camera audio is on: everyone allows it.',
    'off-voice-title': 'Turn voice learning off for everyone?',
    'off-voice-description':
      'Argus will erase every learned voice right now and will not learn any while this is off.',
    'off-presence-title': 'Turn presence off for everyone?',
    'off-presence-description':
      'Argus will erase everyone’s presence state and warn without taking it into account.',
    'off-face-title': 'Stop recognizing people on the cameras?',
    'off-face-description': 'The cameras will still know someone is from home, without saying who.',
    'off-audio-title': 'Turn camera audio off?',
    'off-audio-description': 'The cameras will stop streaming and listening to sound for everyone.',
    'off-confirm': 'Turn off for everyone',
    'save-failed': 'Household privacy could not be changed',
    visitors: 'Recognize recurring visitors',
    'visitors-hint':
      'Learns the faces of outside people who pass often (neighbours, couriers) so they are not always treated as strangers.',
    'visitors-acknowledged': 'Accepted on {date}.',
    'visitors-ack-title': 'Recognize recurring visitors',
    'visitors-ack-intro': 'Before turning it on, confirm that you understand and accept that:',
    'visitors-ack-faces':
      'Argus will process the faces of outside people to recognize them as recurring. This is third parties’ biometric data.',
    'visitors-ack-sign': 'You must put up a visible camera sign.',
    'visitors-ack-retention':
      'Retention is limited: an unnamed visitor is erased after 30 days unseen (configurable from 1 to 60), and turning the feature off erases them within hours. Only small face crops are kept, never video.',
    'visitors-ack-confirm': 'I understand and accept',
    'visitors-off-title': 'Stop recognizing visitors?',
    'visitors-off-description':
      'Argus will erase unnamed visitors within hours and stop recognizing named ones.',
  },
  person: {
    title: 'Privacy',
    undecided: 'Has not decided yet. Everything is off for this person.',
    outdated: 'Decided on an earlier notice; they will be asked again.',
    accepted: 'Accepted the notice on {date}.',
    on: 'Allows',
    off: 'Does not allow',
    'owner-note': 'Only this person can change their choices.',
  },
} as const;
